import { FIREBASE_CONFIG } from "../firebase-config.js";

const FIREBASE_VERSION = "10.12.5";
const PLAYER_ID_KEY = "bacWorld.localPlayerId";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let firebaseReady = false;
let firebaseStatus = "Firebase config is missing.";
let firestoreDb = null;
let firebaseApi = null;
let initPromise = null;

function hasFirebaseConfig() {
  return Boolean(
    FIREBASE_CONFIG &&
      typeof FIREBASE_CONFIG === "object" &&
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.projectId,
  );
}

async function loadFirebaseApi() {
  if (firebaseApi) return firebaseApi;

  const [{ initializeApp }, firestore] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
  ]);

  firebaseApi = {
    initializeApp,
    getFirestore: firestore.getFirestore,
    doc: firestore.doc,
    getDoc: firestore.getDoc,
    setDoc: firestore.setDoc,
    updateDoc: firestore.updateDoc,
    onSnapshot: firestore.onSnapshot,
    serverTimestamp: firestore.serverTimestamp,
    deleteField: firestore.deleteField,
    arrayUnion: firestore.arrayUnion,
  };
  return firebaseApi;
}

export async function initFirebase() {
  if (firebaseReady) {
    return { ready: true, message: firebaseStatus };
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!hasFirebaseConfig()) {
      firebaseReady = false;
      firebaseStatus = "Firebase config is missing. Online rooms are disabled.";
      console.info(firebaseStatus);
      return { ready: false, message: firebaseStatus };
    }

    try {
      const api = await loadFirebaseApi();
      const app = api.initializeApp(FIREBASE_CONFIG);
      firestoreDb = api.getFirestore(app);
      firebaseReady = true;
      firebaseStatus = "Connected";
      return { ready: true, message: firebaseStatus };
    } catch (error) {
      firebaseReady = false;
      firebaseStatus = "Firebase failed to initialize. Online rooms are disabled.";
      console.error(firebaseStatus, error);
      return { ready: false, message: firebaseStatus };
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export function isFirebaseReady() {
  return firebaseReady && Boolean(firestoreDb && firebaseApi);
}

export function getFirebaseStatus() {
  return firebaseStatus;
}

export function getLocalPlayerId() {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;

    const id = `player_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return `player_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function generateRoomCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function assertReady() {
  if (!isFirebaseReady()) {
    throw new Error(firebaseStatus || "Firebase is not ready.");
  }
}

function roomRef(roomCode) {
  return firebaseApi.doc(firestoreDb, "rooms", roomCode);
}

function normalizeRoomCode(roomCode) {
  return String(roomCode ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function makePlayer({ playerId, slot, name, isHost }) {
  return {
    id: playerId,
    name,
    slot,
    isHost,
    characterId: null,
    locked: false,
    ready: false,
    joinedAt: firebaseApi.serverTimestamp(),
  };
}

function createInitialWebrtcState() {
  return {
    offer: null,
    answer: null,
    hostCandidates: [],
    guestCandidates: [],
    status: "idle",
  };
}

export async function createOnlineRoom({ playerId, playerName = "Player 1" }) {
  assertReady();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    const ref = roomRef(code);
    const existing = await firebaseApi.getDoc(ref);
    if (existing.exists()) continue;

    const room = {
      code,
      status: "lobby",
      mode: null,
      hostId: playerId,
      createdAt: firebaseApi.serverTimestamp(),
      updatedAt: firebaseApi.serverTimestamp(),
      players: {
        p1: makePlayer({
          playerId,
          slot: "p1",
          name: playerName,
          isHost: true,
        }),
      },
      selectedMapId: null,
      webrtc: createInitialWebrtcState(),
    };

    await firebaseApi.setDoc(ref, room);
    return { roomCode: code, slot: "p1", room };
  }

  throw new Error("Could not generate an unused room code. Try again.");
}

export async function joinOnlineRoom(roomCode, { playerId, playerName = "Player 2" }) {
  assertReady();

  const code = normalizeRoomCode(roomCode);
  const ref = roomRef(code);
  const snapshot = await firebaseApi.getDoc(ref);
  if (!snapshot.exists()) {
    throw new Error("Room not found.");
  }

  const room = snapshot.data();
  if (room.status === "closed") {
    throw new Error("Room is closed.");
  }

  const players = room.players ?? {};
  const existingSlot = Object.entries(players).find(([, player]) => player?.id === playerId)?.[0];
  const slot = existingSlot || (!players.p1 ? "p1" : !players.p2 ? "p2" : null);
  if (!slot) {
    throw new Error("Room is full.");
  }

  await firebaseApi.updateDoc(ref, {
    [`players.${slot}`]: makePlayer({
      playerId,
      slot,
      name: slot === "p1" ? "Player 1" : playerName,
      isHost: room.hostId === playerId || (!players.p1 && slot === "p1"),
    }),
    updatedAt: firebaseApi.serverTimestamp(),
  });

  return { roomCode: code, slot, room: { ...room, code } };
}

export function listenToRoom(roomCode, onRoom, onError) {
  assertReady();
  const code = normalizeRoomCode(roomCode);
  return firebaseApi.onSnapshot(
    roomRef(code),
    (snapshot) => {
      if (!snapshot.exists()) {
        onRoom(null);
        return;
      }
      onRoom({ ...snapshot.data(), code });
    },
    (error) => {
      console.error("Room listener failed", error);
      if (onError) onError(error);
    },
  );
}

export async function updateRoomPlayer(roomCode, slot, data) {
  assertReady();
  const updates = {};
  for (const [key, value] of Object.entries(data)) {
    updates[`players.${slot}.${key}`] = value;
  }
  updates.updatedAt = firebaseApi.serverTimestamp();
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), updates);
}

export async function setPlayerReady(roomCode, slot, ready) {
  await updateRoomPlayer(roomCode, slot, { ready });
}

export async function setPlayerLocked(roomCode, slot, locked) {
  await updateRoomPlayer(roomCode, slot, { locked });
}

export async function setRoomMode(roomCode, mode) {
  assertReady();
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), {
    mode,
    status: "lobby",
    updatedAt: firebaseApi.serverTimestamp(),
  });
}

export async function setRoomStatus(roomCode, status, extra = {}) {
  assertReady();
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), {
    status,
    ...extra,
    updatedAt: firebaseApi.serverTimestamp(),
  });
}

export async function setRoomSelectedMap(roomCode, selectedMapId) {
  assertReady();
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), {
    selectedMapId,
    updatedAt: firebaseApi.serverTimestamp(),
  });
}

export async function resetRoomWebrtc(roomCode) {
  assertReady();
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), {
    webrtc: createInitialWebrtcState(),
    updatedAt: firebaseApi.serverTimestamp(),
  });
}

export async function setWebrtcOffer(roomCode, offer) {
  assertReady();
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), {
    "webrtc.offer": offer,
    "webrtc.answer": null,
    "webrtc.hostCandidates": [],
    "webrtc.guestCandidates": [],
    "webrtc.status": "offer",
    updatedAt: firebaseApi.serverTimestamp(),
  });
}

export async function setWebrtcAnswer(roomCode, answer) {
  assertReady();
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), {
    "webrtc.answer": answer,
    "webrtc.status": "answer",
    updatedAt: firebaseApi.serverTimestamp(),
  });
}

export async function appendWebrtcCandidate(roomCode, field, candidate) {
  assertReady();
  if (field !== "hostCandidates" && field !== "guestCandidates") {
    throw new Error("Invalid ICE candidate field.");
  }
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), {
    [`webrtc.${field}`]: firebaseApi.arrayUnion(candidate),
    updatedAt: firebaseApi.serverTimestamp(),
  });
}

export async function setWebrtcStatus(roomCode, status) {
  assertReady();
  await firebaseApi.updateDoc(roomRef(normalizeRoomCode(roomCode)), {
    "webrtc.status": status,
    updatedAt: firebaseApi.serverTimestamp(),
  });
}

export async function leaveOnlineRoom(roomCode, slot, { isHost = false } = {}) {
  assertReady();
  const code = normalizeRoomCode(roomCode);
  const updates = {
    [`players.${slot}`]: firebaseApi.deleteField(),
    updatedAt: firebaseApi.serverTimestamp(),
  };
  if (isHost) {
    updates.status = "closed";
  }
  await firebaseApi.updateDoc(roomRef(code), updates);
}

export function cleanupRoomListener(unsubscribe) {
  if (typeof unsubscribe === "function") {
    unsubscribe();
  }
}
