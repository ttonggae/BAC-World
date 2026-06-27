import { GameLoop } from "../core/GameLoop.js";
import { InputManager } from "../core/InputManager.js";
import { ABILITIES } from "../data/abilities.js";
import { CHARACTERS } from "../data/characters.js";
import { MAPS } from "../data/maps.js";
import { GameMap } from "../map/Map.js";
import { CanvasRenderer } from "../render/CanvasRenderer.js";
import {
  cleanupRoomListener,
  cleanupOldRoomsThrottled,
  createOnlineRoom,
  endOnlineRoom,
  generateRoomCode as generateOnlineRoomCode,
  getFirebaseStatus,
  getLocalPlayerId,
  initFirebase,
  isFirebaseReady,
  joinOnlineRoom,
  leaveOnlineRoom,
  listenToRoom,
  setPlayerReady,
  setRoomMode as setOnlineRoomMode,
  setRoomSelectedMap,
  setRoomStatus,
  updateRoomPlayer,
  updatePlayerPresence,
} from "../online/FirebaseService.js";
import { P2PService } from "../online/P2PService.js";
import { OfflineMatch } from "./OfflineMatch.js";

const P1_CONTROLS = {
  left: "KeyA",
  right: "KeyD",
  jump: "KeyW",
  drop: "KeyS",
  attack: "KeyJ",
  skill1: "KeyK",
  skill2: "KeyL",
  movementSkill: "ShiftLeft",
  extra: "Semicolon",
  special: "KeyN",
};

const P2_CONTROLS = {
  left: "ArrowLeft",
  right: "ArrowRight",
  jump: "ArrowUp",
  drop: "ArrowDown",
  attack: "Slash",
  skill1: "KeyK",
  skill2: "KeyL",
  movementSkill: "ShiftRight",
  extra: "Semicolon",
  special: "KeyN",
};

const ONLINE_P1_CONTROLS = {
  left: "OnlineP1Left",
  right: "OnlineP1Right",
  jump: "OnlineP1Jump",
  drop: "OnlineP1Drop",
  attack: "OnlineP1Attack",
  skill1: "OnlineP1Skill1",
  skill2: "OnlineP1Skill2",
  movementSkill: "OnlineP1MovementSkill",
  extra: "OnlineP1Extra",
  special: "OnlineP1Special",
};

const ONLINE_P2_CONTROLS = {
  left: "OnlineP2Left",
  right: "OnlineP2Right",
  jump: "OnlineP2Jump",
  drop: "OnlineP2Drop",
  attack: "OnlineP2Attack",
  skill1: "OnlineP2Skill1",
  skill2: "OnlineP2Skill2",
  movementSkill: "OnlineP2MovementSkill",
  extra: "OnlineP2Extra",
  special: "OnlineP2Special",
};

const MATCH_POINT = 2;
const ROUND_TIME_LIMIT = 99;
const ROUND_INTRO_DURATION = 4.4;
const ROUND_OVER_DURATION = 1.8;
const PVP_PICK_TIME = 20;
const PRE_MATCH_PREVIEW_TIME = 3;
const NETWORK_MODE = "rollback";
const NETCODE_CONFIG = Object.freeze({
  tickRate: 60,
  inputDelayTicks: 1,
  rollbackWindow: 12,
  checksumInterval: 30,
  inputBundleSize: 6,
});
const HEARTBEAT_INTERVAL_MS = 1000;
const VISIBLE_SOFT_TIMEOUT_MS = 8000;
const VISIBLE_HARD_TIMEOUT_MS = 30000;
const HIDDEN_HARD_TIMEOUT_MS = 45000;
const REMOTE_INPUT_LAST_KNOWN_TICKS = 6;
const LATE_INPUT_WARN_INTERVAL_MS = 1000;
const NETWORK_BUFFER_WARNING_AMOUNT = 128 * 1024;
const FIXED_DT = 1 / NETCODE_CONFIG.tickRate;

export class Game {
  constructor(canvas) {
    this.input = new InputManager();
    this.gameState = "mainMenu";
    this.currentMode = null;
    this.currentRoom = null;
    this.localPlayerId = getLocalPlayerId();
    this.firebaseReady = false;
    this.firebaseStatus = getFirebaseStatus();
    this.roomUnsubscribe = null;
    this.roomPresenceTimer = null;
    this.p2pService = null;
    this.p2pStatus = "idle";
    this.p2pChannelState = "closed";
    this.p2pConnectPromise = null;
    this.p2pLastConnectAttempt = 0;
    this.p2pMetrics = null;
    this.p2pLogs = [];
    this.onlineRole = null;
    this.onlineTick = 0;
    this.onlineInputSeq = 0;
    this.onlineLastInputSeq = 0;
    this.onlineLastStateTick = 0;
    this.onlineInputSendTimer = 0;
    this.onlineStateSendTimer = 0;
    this.onlineLastSentInput = "";
    this.onlineRemoteInput = createEmptyOnlineInput();
    this.onlinePhase = "idle";
    this.onlineVirtualInput = new OnlineVirtualInput();
    this.onlineInputBuffer = createOnlineInputBuffer();
    this.predictedInputBuffer = createOnlineInputBuffer();
    this.onlineLastKnownInput = createOnlineLastKnownInput();
    this.onlineLastReceivedSeq = { p1: 0, p2: 0 };
    this.onlineLastSentInputTick = 0;
    this.onlineLastReceivedInputTick = 0;
    this.onlineLastReceivedInputTicks = { p1: 0, p2: 0 };
    this.snapshotHistory = new Map();
    this.localChecksums = new Map();
    this.remoteChecksums = new Map();
    this.checksumDetails = new Map();
    this.desyncStatus = "OK";
    this.onlineSeed = 0;
    this.onlineRngState = 0;
    this.onlineInputDelayTicks = NETCODE_CONFIG.inputDelayTicks;
    this.onlineRollbackWindow = NETCODE_CONFIG.rollbackWindow;
    this.onlineInputBundleSize = NETCODE_CONFIG.inputBundleSize;
    this.lastRollbackTick = null;
    this.rollbackCount = 0;
    this.predictionMissCount = 0;
    this.rollbackLogs = [];
    this.isResimulating = false;
    this.pendingInputDelayChange = null;
    this.showNetworkDebug = true;
    this.pingSamples = [];
    this.averagePing = null;
    this.lastPingSentTick = 0;
    this.onlineLastPingAt = 0;
    this.onlineLastPacketAt = 0;
    this.onlineLastPongAt = 0;
    this.onlineNetworkStatus = "idle";
    this.networkStatus = {
      level: "connected",
      message: "",
      sinceMs: 0,
      hardDisconnected: false,
    };
    this.heartbeatMissCount = 0;
    this.lastNetworkWarnAt = 0;
    this.lastLateInputWarnAt = 0;
    this.lateInputDropCount = 0;
    this.predictedInputTicks = 0;
    this.predictionActiveUntilMs = 0;
    this.reconnectStartedAt = 0;
    this.localHidden = document.hidden;
    this.remoteHidden = false;
    this.windowHasFocus = typeof document.hasFocus === "function" ? document.hasFocus() : true;
    this.forceLocalInputNeutral = false;
    this.onlinePeerReady = false;
    this.onlineReadyAcknowledged = false;
    this.onlineReadySent = false;
    this.hasStartedOnlineGame = false;
    this.onlinePreviewFinishPending = false;
    this.currentSession = this.createSession(null);
    this.selectBackTarget = "mainMenu";
    this.selectionPhase = "character";
    this.selectionNotice = "";
    this.pickTimer = 0;
    this.preMatchPreviewTimer = 0;
    this.selectedP1Character = "basic";
    this.selectedP2Character = "heavy";
    this.selectedMapId = "training";
    this.map = this.createSelectedMap();
    this.match = null;
    this.renderer = new CanvasRenderer(canvas, {
      width: this.map.width,
      height: this.map.height,
    });
    this.ui = this.bindUi();
    this.resetMatch();
    this.renderCharacterSelect();
    this.syncUi();
    this.initializeOnline();
    document.addEventListener("visibilitychange", () => this.handleVisibilityChange());
    window.addEventListener("blur", () => this.handleWindowBlur());
    window.addEventListener("focus", () => this.handleWindowFocus());
    window.addEventListener("pagehide", () => this.handlePageHide());
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
  }

  start() {
    this.loop.start();
  }

  bindUi() {
    const ui = {
      mainMenu: document.querySelector("#mainMenu"),
      matchmakingButton: document.querySelector("#matchmakingButton"),
      createRoomButton: document.querySelector("#createRoomButton"),
      joinRoomButton: document.querySelector("#joinRoomButton"),
      joinRoomScreen: document.querySelector("#joinRoomScreen"),
      joinRoomCodeInput: document.querySelector("#joinRoomCodeInput"),
      joinRoomSubmitButton: document.querySelector("#joinRoomSubmitButton"),
      backFromJoinButton: document.querySelector("#backFromJoinButton"),
      joinRoomMessage: document.querySelector("#joinRoomMessage"),
      matchmakingScreen: document.querySelector("#matchmakingScreen"),
      cancelMatchmakingButton: document.querySelector("#cancelMatchmakingButton"),
      roomLobby: document.querySelector("#roomLobby"),
      roomCodeText: document.querySelector("#roomCodeText"),
      roomSessionTypeText: document.querySelector("#roomSessionTypeText"),
      roomModeText: document.querySelector("#roomModeText"),
      roomOnlineStatusText: document.querySelector("#roomOnlineStatusText"),
      roomLobbyMessage: document.querySelector("#roomLobbyMessage"),
      roomPlayerList: document.querySelector("#roomPlayerList"),
      copyRoomCodeButton: document.querySelector("#copyRoomCodeButton"),
      readyRoomButton: document.querySelector("#readyRoomButton"),
      practiceModeButton: document.querySelector("#practiceModeButton"),
      pvpRoomModeButton: document.querySelector("#pvpRoomModeButton"),
      startRoomModeButton: document.querySelector("#startRoomModeButton"),
      leaveRoomButton: document.querySelector("#leaveRoomButton"),
      backFromRoomButton: document.querySelector("#backFromRoomButton"),
      p2pStatusText: document.querySelector("#p2pStatusText"),
      p2pRoleText: document.querySelector("#p2pRoleText"),
      p2pChannelText: document.querySelector("#p2pChannelText"),
      p2pHintText: document.querySelector("#p2pHintText"),
      p2pConnectButton: document.querySelector("#p2pConnectButton"),
      p2pPingButton: document.querySelector("#p2pPingButton"),
      p2pDisconnectButton: document.querySelector("#p2pDisconnectButton"),
      p2pLogList: document.querySelector("#p2pLogList"),
      characterSelect: document.querySelector("#characterSelect"),
      characterSelectTitle: document.querySelector("#characterSelectTitle"),
      characterSelectSubtitle: document.querySelector("#characterSelectSubtitle"),
      selectionStatusText: document.querySelector("#selectionStatusText"),
      p1PreviewPanel: document.querySelector("#p1PreviewPanel"),
      p2PreviewPanel: document.querySelector("#p2PreviewPanel"),
      selectionOptionsTitle: document.querySelector("#selectionOptionsTitle"),
      pickTimerText: document.querySelector("#pickTimerText"),
      characterCards: document.querySelector("#characterCards"),
      mapCards: document.querySelector("#mapCards"),
      confirmCharacterButton: document.querySelector("#confirmCharacterButton"),
      startMatchButton: document.querySelector("#startMatchButton"),
      backFromSelectButton: document.querySelector("#backFromSelectButton"),
      preMatchPreview: document.querySelector("#preMatchPreview"),
      preMatchTitle: document.querySelector("#preMatchTitle"),
      preMatchMapText: document.querySelector("#preMatchMapText"),
      preMatchTimerText: document.querySelector("#preMatchTimerText"),
      onlineBattleReady: document.querySelector("#onlineBattleReady"),
      backToRoomLobbyButton: document.querySelector("#backToRoomLobbyButton"),
      onlineDebugPanel: document.querySelector("#onlineDebugPanel"),
      onlineDebugText: document.querySelector("#onlineDebugText"),
      onlineInputDelaySelect: document.querySelector("#onlineInputDelaySelect"),
      onlineRollbackWindowSelect: document.querySelector("#onlineRollbackWindowSelect"),
      showNetworkDebugToggle: document.querySelector("#showNetworkDebugToggle"),
      rollbackLogList: document.querySelector("#rollbackLogList"),
      networkStatusBanner: document.querySelector("#networkStatusBanner"),
      networkDisconnectModal: document.querySelector("#networkDisconnectModal"),
      networkBackToRoomButton: document.querySelector("#networkBackToRoomButton"),
      networkBackToMainButton: document.querySelector("#networkBackToMainButton"),
      gameStage: document.querySelector("#gameStage"),
      controlsPanel: document.querySelector("#controlsPanel"),
      gameOverActions: document.querySelector("#gameOverActions"),
      restartMatchButton: document.querySelector("#restartMatchButton"),
      backToSelectButton: document.querySelector("#backToSelectButton"),
    };

    ui.matchmakingButton.addEventListener("click", () => this.startPvpPickFlow());
    ui.createRoomButton.addEventListener("click", () => this.createRoom());
    ui.joinRoomButton.addEventListener("click", () => this.openJoinRoom());
    ui.joinRoomSubmitButton.addEventListener("click", () => this.submitJoinRoom());
    ui.backFromJoinButton.addEventListener("click", () => this.goToMainMenu());
    ui.joinRoomCodeInput.addEventListener("input", () => this.normalizeJoinRoomCode());
    ui.cancelMatchmakingButton.addEventListener("click", () => this.goToMainMenu());
    ui.copyRoomCodeButton.addEventListener("click", () => this.copyRoomCode());
    ui.readyRoomButton.addEventListener("click", () => this.toggleRoomReady());
    ui.practiceModeButton.addEventListener("click", () => this.selectRoomMode("practice"));
    ui.pvpRoomModeButton.addEventListener("click", () => this.selectRoomMode("pvpRoom"));
    ui.startRoomModeButton.addEventListener("click", () => this.startSelectedRoomMode());
    ui.leaveRoomButton.addEventListener("click", () => this.leaveCurrentRoom());
    ui.backFromRoomButton.addEventListener("click", () => this.leaveCurrentRoom());
    ui.p2pConnectButton.addEventListener("click", () => this.connectP2P());
    ui.p2pPingButton.addEventListener("click", () => this.sendP2PPing());
    ui.p2pDisconnectButton.addEventListener("click", () => this.disconnectP2P());
    ui.onlineInputDelaySelect.addEventListener("change", () => {
      this.setOnlineNetcodeConfig({
        inputDelayTicks: Number(ui.onlineInputDelaySelect.value),
      }, true);
    });
    ui.onlineRollbackWindowSelect.addEventListener("change", () => {
      this.setOnlineNetcodeConfig({
        rollbackWindow: Number(ui.onlineRollbackWindowSelect.value),
      }, true);
    });
    ui.showNetworkDebugToggle.addEventListener("change", () => {
      this.showNetworkDebug = ui.showNetworkDebugToggle.checked;
      this.syncOnlineDebugText();
    });
    ui.confirmCharacterButton.addEventListener("click", () => this.confirmCharacterSelection());
    ui.startMatchButton.addEventListener("click", () => this.confirmMapSelection());
    ui.backFromSelectButton.addEventListener("click", () => this.leaveCharacterSelect());
    ui.restartMatchButton.addEventListener("click", () => this.restartSameMatch());
    ui.backToSelectButton.addEventListener("click", () => this.returnToCharacterSelect());
    ui.backToRoomLobbyButton.addEventListener("click", () => this.returnOnlineRoomToLobby());
    ui.networkBackToRoomButton.addEventListener("click", () => this.returnOnlineRoomToLobby());
    ui.networkBackToMainButton.addEventListener("click", () => this.leaveCurrentRoom());
    return ui;
  }

  async initializeOnline() {
    const result = await initFirebase();
    this.firebaseReady = result.ready;
    this.firebaseStatus = result.message;
    this.syncUi();
  }

  async refreshFirebaseStatus() {
    if (!isFirebaseReady()) {
      const result = await initFirebase();
      this.firebaseReady = result.ready;
      this.firebaseStatus = result.message;
    }
    return isFirebaseReady();
  }

  createMatch() {
    this.map = this.createSelectedMap();
    return new OfflineMatch({
      mode: "pvp",
      map: this.map,
      players: [
        {
          characterId: this.selectedP1Character,
          controls: getControlsForCharacter(P1_CONTROLS, this.selectedP1Character),
        },
        {
          characterId: this.selectedP2Character,
          controls: getControlsForCharacter(P2_CONTROLS, this.selectedP2Character),
        },
      ],
    });
  }

  createPracticeMatch() {
    this.map = this.createSelectedMap();
    return new OfflineMatch({
      mode: "practice",
      disableWinner: true,
      map: this.map,
      players: [
        {
          characterId: this.selectedP1Character,
          controls: getControlsForCharacter(P1_CONTROLS, this.selectedP1Character),
        },
        { characterId: "basic", controls: {}, isDummy: true },
      ],
    });
  }

  createOnlineMatch() {
    this.map = this.createSelectedMap();
    return new OfflineMatch({
      mode: "pvp",
      map: this.map,
      players: [
        { characterId: this.selectedP1Character, controls: ONLINE_P1_CONTROLS },
        { characterId: this.selectedP2Character, controls: ONLINE_P2_CONTROLS },
      ],
    });
  }

  createSelectedMap() {
    const mapData = MAPS[this.selectedMapId];
    if (!mapData) {
      throw new Error(`Unknown map: ${this.selectedMapId}`);
    }
    return new GameMap(mapData);
  }

  isPracticeLikeMode(mode = this.currentMode) {
    return mode === "practice" || mode === "room";
  }

  createSession(type) {
    return {
      id: type ? `${type}-${Date.now().toString(36)}` : null,
      type,
      online: false,
      roomCode: null,
      hostId: null,
      localPlayerId: this.localPlayerId ?? "p1",
      localSlot: null,
      status: "idle",
      mode: null,
      players: [],
      selections: {
        p1: {
          characterId: null,
          locked: false,
          ready: false,
        },
        p2: {
          characterId: null,
          locked: false,
          ready: false,
        },
      },
      selectedMapId: null,
      matchConfig: null,
      previewStartedAt: null,
      previewEndAt: null,
      roomEndMarked: false,
      createdAt: type ? Date.now() : null,
    };
  }

  resetSession() {
    this.cleanupRoomListener();
    this.stopRoomPresenceHeartbeat();
    this.cleanupP2P();
    this.p2pLogs = [];
    this.currentSession = this.createSession(null);
    this.currentRoom = null;
  }

  createRoomSession() {
    this.currentSession = this.createSession("customRoom");
    this.currentSession.roomCode = this.generateRoomCode();
    this.currentSession.hostId = this.currentSession.localPlayerId;
    this.currentSession.localSlot = "p1";
    this.currentSession.status = "lobby";
    this.currentSession.mode = "practice";
    this.currentSession.players = [
      {
        id: this.currentSession.localPlayerId,
        name: "Player 1",
        slot: "p1",
        isHost: true,
        isLocal: true,
        ready: false,
        characterId: null,
      },
    ];
    this.currentRoom = this.currentSession;
    return this.currentSession;
  }

  createPvpMatchmakingSession() {
    this.currentSession = this.createSession("pvpMatchmaking");
    this.currentSession.status = "matchmaking";
    this.currentSession.mode = "pvp";
    this.currentSession.players = [
      {
        id: this.currentSession.localPlayerId,
        name: "Player 1",
        slot: "p1",
        isHost: false,
        isLocal: true,
        ready: false,
      },
      {
        id: "mock-opponent",
        name: "Mock Opponent",
        slot: "p2",
        isHost: false,
        isLocal: false,
        isMock: true,
        ready: false,
      },
    ];
    this.updatePlayerSelection("p1", this.selectedP1Character);
    return this.currentSession;
  }

  cleanupRoomListener() {
    cleanupRoomListener(this.roomUnsubscribe);
    this.roomUnsubscribe = null;
  }

  startRoomPresenceHeartbeat() {
    this.stopRoomPresenceHeartbeat();
    if (
      !this.currentSession?.online ||
      !this.currentSession.roomCode ||
      !this.currentSession.localSlot ||
      !isFirebaseReady()
    ) {
      return;
    }
    const sendPresence = () => {
      if (
        !this.currentSession?.online ||
        !this.currentSession.roomCode ||
        !this.currentSession.localSlot ||
        !isFirebaseReady()
      ) {
        return;
      }
      updatePlayerPresence(this.currentSession.roomCode, this.currentSession.localSlot)
        .catch((error) => console.warn("Room presence update failed", error));
    };
    sendPresence();
    this.roomPresenceTimer = window.setInterval(sendPresence, 5000);
  }

  stopRoomPresenceHeartbeat() {
    if (this.roomPresenceTimer) {
      window.clearInterval(this.roomPresenceTimer);
      this.roomPresenceTimer = null;
    }
  }

  getRoomPlayersArray(players = {}) {
    return ["p1", "p2"]
      .map((slot) => players[slot])
      .filter(Boolean);
  }

  applyOnlineRoomSnapshot(room) {
    if (!room) {
      this.showRoomMessage("Room was closed or removed.");
      this.cleanupRoomListener();
      this.stopRoomPresenceHeartbeat();
      return;
    }

    const previous = this.currentSession ?? this.createSession("customRoom");
    const players = room.players ?? {};
    const localEntry = Object.entries(players).find(([, player]) => player?.id === this.localPlayerId);
    const localSlot = localEntry?.[0] ?? previous.localSlot;

    this.currentSession = {
      ...previous,
      id: room.code,
      type: previous.type || "customRoom",
      online: true,
      roomCode: room.code,
      hostId: room.hostId,
      localPlayerId: this.localPlayerId,
      localSlot,
      status: room.status || "lobby",
      mode: room.mode ?? previous.mode,
      players: this.getRoomPlayersArray(players),
      selections: {
        p1: {
          characterId: players.p1?.characterId ?? null,
          locked: Boolean(players.p1?.locked),
          ready: Boolean(players.p1?.ready),
        },
        p2: {
          characterId: players.p2?.characterId ?? null,
          locked: Boolean(players.p2?.locked),
          ready: Boolean(players.p2?.ready),
        },
      },
      selectedMapId: room.selectedMapId ?? previous.selectedMapId,
      matchConfig: room.matchConfig ?? previous.matchConfig,
      previewStartedAt: room.previewStartedAt ?? previous.previewStartedAt,
      previewEndAt: room.previewEndAt ?? previous.previewEndAt,
      webrtc: room.webrtc ?? previous.webrtc,
      createdAt: room.createdAt ?? previous.createdAt,
    };
    this.currentRoom = this.currentSession;
    if (players.p1?.characterId) this.selectedP1Character = players.p1.characterId;
    if (players.p2?.characterId) this.selectedP2Character = players.p2.characterId;
    if (room.selectedMapId) this.selectedMapId = room.selectedMapId;
    this.handleOnlineRoomStatus(room);
    this.ensureP2PConnection();
    if (this.gameState === "roomLobby") {
      this.renderRoomLobby();
    }
  }

  handleOnlineRoomStatus(room) {
    if (!this.currentSession?.online || this.currentSession.mode !== "pvpRoom") return;

    if (room.status === "closed") {
      this.stopRoomPresenceHeartbeat();
      this.goToMainMenu();
      return;
    }

    if (room.status === "lobby") {
      if (
        this.gameState === "characterSelect" ||
        this.gameState === "mapSelect" ||
        this.gameState === "preMatchPreview" ||
        this.gameState === "onlineBattleReady"
      ) {
        this.currentMode = null;
        this.selectionPhase = "character";
        this.gameState = "roomLobby";
        this.renderRoomLobby();
        this.syncUi();
      }
      return;
    }

    if (room.status === "characterSelect") {
      this.currentMode = "pvpRoom";
      this.selectionPhase = "character";
      this.selectionNotice = "";
      this.hasStartedOnlineGame = false;
      this.onlinePreviewFinishPending = false;
      this.selectBackTarget = "roomLobby";
      this.gameState = "characterSelect";
      this.maybeAdvanceOnlineCharacterSelect();
      this.renderCharacterSelect();
      this.syncUi();
      return;
    }

    if (room.status === "mapSelect") {
      this.currentMode = "pvpRoom";
      this.selectionPhase = "map";
      this.selectionNotice = "";
      this.selectBackTarget = "roomLobby";
      this.gameState = "mapSelect";
      this.renderCharacterSelect();
      this.syncUi();
      return;
    }

    if (room.status === "preMatchPreview") {
      const enteringPreview = this.gameState !== "preMatchPreview";
      this.currentMode = "pvpRoom";
      this.selectionPhase = "preview";
      if (enteringPreview) {
        this.onlinePreviewFinishPending = false;
        this.onlinePeerReady = false;
        this.onlineReadyAcknowledged = false;
        this.onlineReadySent = false;
      }
      if (room.matchConfig) this.applyMatchConfigSelection(room.matchConfig);
      this.gameState = "preMatchPreview";
      this.preMatchPreviewTimer = this.getOnlinePreviewRemaining(room);
      this.renderPreMatchPreview();
      this.syncUi();
      return;
    }

    if (room.status === "onlinePlaying") {
      this.currentMode = "pvpRoom";
      this.startOnlineGameFromMatchConfig(room.matchConfig ?? this.currentSession.matchConfig);
      return;
    }

    if (room.status === "onlineBattleReady" || room.status === "playingPending") {
      this.currentMode = "pvpRoom";
      this.gameState = "onlineBattleReady";
      this.input.reset();
      this.syncUi();
    }
  }

  listenToCurrentRoom() {
    if (!this.currentSession?.online || !this.currentSession.roomCode || !isFirebaseReady()) return;
    this.cleanupRoomListener();
    this.roomUnsubscribe = listenToRoom(
      this.currentSession.roomCode,
      (room) => this.applyOnlineRoomSnapshot(room),
      (error) => this.showRoomMessage(error.message || "Room sync failed."),
    );
  }

  showRoomMessage(message) {
    if (this.ui?.roomLobbyMessage) {
      this.ui.roomLobbyMessage.textContent = message;
    }
    this.showSelectionMessage(message);
  }

  showSelectionMessage(message) {
    this.selectionNotice = message;
    if (
      this.ui?.selectionStatusText &&
      (this.gameState === "characterSelect" || this.gameState === "mapSelect")
    ) {
      this.ui.selectionStatusText.textContent = message;
    }
  }

  isLocalHost() {
    return Boolean(
      this.currentSession?.hostId &&
        this.currentSession.hostId === this.currentSession.localPlayerId,
    );
  }

  getP2PRole() {
    if (!this.currentSession?.online) return "-";
    if (this.currentSession.localSlot === "p1" || this.isLocalHost()) return "host";
    if (this.currentSession.localSlot === "p2") return "guest";
    return "-";
  }

  hasBothRoomPlayers() {
    if (!this.currentSession?.players) return false;
    return this.currentSession.players.some((player) => player.slot === "p1") &&
      this.currentSession.players.some((player) => player.slot === "p2");
  }

  isOnlinePvpRoom() {
    return Boolean(this.currentSession?.online && this.currentSession.mode === "pvpRoom");
  }

  getPlayerBySlot(slot) {
    return this.currentSession?.players.find((player) => player.slot === slot) ?? null;
  }

  areBothPlayersLocked() {
    return Boolean(this.getPlayerBySlot("p1")?.locked && this.getPlayerBySlot("p2")?.locked);
  }

  areBothPlayersReady() {
    return Boolean(this.getPlayerBySlot("p1")?.ready && this.getPlayerBySlot("p2")?.ready);
  }

  canLocalEditSlot(slot) {
    return this.currentSession?.localSlot === slot && !this.getPlayerBySlot(slot)?.locked;
  }

  getOnlinePreviewRemaining(room = this.currentSession) {
    const endAt = toEpochMilliseconds(room?.previewEndAt);
    if (!endAt) return PRE_MATCH_PREVIEW_TIME;
    return Math.max(0, (endAt - Date.now()) / 1000);
  }

  maybeAdvanceOnlineCharacterSelect() {
    if (
      !this.isOnlinePvpRoom() ||
      !this.isLocalHost() ||
      this.currentSession.status !== "characterSelect" ||
      !this.areBothPlayersLocked()
    ) {
      return;
    }

    setRoomStatus(this.currentSession.roomCode, "mapSelect", {
      selectedMapId: this.currentSession.selectedMapId ?? null,
    }).catch((error) => this.showRoomMessage(error.message || "Could not open map select."));
  }

  addP2PLog(message) {
    const time = new Date().toLocaleTimeString();
    this.p2pLogs.unshift(`${time} ${message}`);
    this.p2pLogs = this.p2pLogs.slice(0, 10);
    this.renderP2PPanel();
  }

  cleanupP2P() {
    if (this.p2pService) {
      this.p2pService.closeLocal();
      this.p2pService = null;
    }
    this.p2pStatus = "idle";
    this.p2pChannelState = "closed";
    this.p2pMetrics = null;
    this.p2pConnectPromise = null;
    this.p2pLastConnectAttempt = 0;
  }

  handleVisibilityChange() {
    this.localHidden = document.hidden;
    if (document.hidden) {
      this.input.reset();
      this.forceLocalInputNeutral = true;
      this.addP2PLog("Window hidden: local input forced neutral.");
    } else {
      this.input.reset();
      this.forceLocalInputNeutral = false;
      this.addP2PLog("Window visible: input resumed.");
    }
    this.sendVisibilityState();
    this.syncOnlineDebugText();
  }

  handleWindowBlur() {
    this.windowHasFocus = false;
    this.input.reset();
    this.forceLocalInputNeutral = true;
    this.syncOnlineDebugText();
  }

  handleWindowFocus() {
    this.windowHasFocus = true;
    if (!document.hidden) {
      this.input.reset();
      this.forceLocalInputNeutral = false;
    }
    this.syncOnlineDebugText();
  }

  handlePageHide() {
    const session = this.currentSession;
    this.stopRoomPresenceHeartbeat();
    if (session?.online && session.roomCode && session.localSlot && isFirebaseReady()) {
      leaveOnlineRoom(session.roomCode, session.localSlot, {
        isHost: this.isLocalHost(),
      }).catch(() => {});
    }
  }

  sendVisibilityState() {
    if (this.p2pChannelState !== "open") return;
    this.p2pService?.send({
      type: "visibility",
      hidden: this.localHidden,
      atTick: this.onlineTick,
      from: this.localPlayerId,
    }, { critical: false });
  }

  async connectP2P() {
    if (this.p2pChannelState === "open") return;
    if (this.p2pConnectPromise) return this.p2pConnectPromise;
    if (!this.currentSession?.online || !this.currentSession.roomCode) {
      this.addP2PLog("Online room is required.");
      return;
    }
    if (!this.hasBothRoomPlayers()) {
      this.addP2PLog("Waiting for p1 and p2.");
      return;
    }
    if (!isFirebaseReady()) {
      this.addP2PLog(this.firebaseStatus || "Firebase is not ready.");
      return;
    }

    const role = this.getP2PRole();
    if (role !== "host" && role !== "guest") {
      this.addP2PLog("Local player has no P2P role.");
      return;
    }

    this.cleanupP2P();
    this.p2pLastConnectAttempt = Date.now();
    this.p2pStatus = "connecting";
    const service = new P2PService({
        roomCode: this.currentSession.roomCode,
        localPlayerId: this.localPlayerId,
        role,
        onStatus: (status) => {
          this.p2pStatus = status;
          this.renderP2PPanel();
          if (this.gameState === "characterSelect" || this.gameState === "mapSelect") {
            this.renderCharacterSelect();
          }
        },
        onChannelState: (state) => {
          this.p2pChannelState = state;
          this.renderP2PPanel();
          if (this.gameState === "characterSelect" || this.gameState === "mapSelect") {
            this.renderCharacterSelect();
          }
        },
        onLog: (message) => this.addP2PLog(message),
        onError: (message) => {
          this.p2pStatus = "failed";
          this.addP2PLog(message);
        },
        onMetrics: (metrics) => {
          this.p2pMetrics = metrics;
          this.onlineLastPacketAt = Math.max(this.onlineLastPacketAt, metrics.lastPacketAt || 0);
          if (this.gameState === "roomLobby") {
            this.renderP2PPanel();
          }
          if (this.gameState === "onlinePlaying" || this.gameState === "onlineConnectionLost") {
            this.syncOnlineDebugText();
          }
        },
        onDataMessage: (message) => this.handleP2PDataMessage(message),
      });
    this.p2pService = service;
    this.p2pConnectPromise = service.connect()
      .then(() => {
        this.addP2PLog(`${role} connect started.`);
      })
      .catch((error) => {
        this.p2pStatus = "failed";
        this.addP2PLog(error.message || "P2P connect failed.");
        this.renderP2PPanel();
      })
      .finally(() => {
        this.p2pConnectPromise = null;
      });
    return this.p2pConnectPromise;
  }

  ensureP2PConnection() {
    if (
      !this.currentSession?.online ||
      this.currentSession.mode !== "pvpRoom" ||
      !this.hasBothRoomPlayers() ||
      !isFirebaseReady() ||
      this.p2pChannelState === "open" ||
      this.p2pStatus === "connecting" ||
      this.p2pConnectPromise ||
      Date.now() - this.p2pLastConnectAttempt < 3000
    ) {
      return;
    }

    this.addP2PLog("Starting automatic P2P connection.");
    this.connectP2P();
  }

  sendP2PPing() {
    if (!this.p2pService) {
      this.addP2PLog("P2P is not connected.");
      return;
    }
    this.p2pService.sendPing();
  }

  async disconnectP2P() {
    if (!this.p2pService) {
      this.cleanupP2P();
      this.renderP2PPanel();
      return;
    }

    try {
      await this.p2pService.disconnect({ resetSignal: true });
      this.addP2PLog("P2P disconnected.");
    } catch (error) {
      this.addP2PLog(error.message || "P2P disconnect failed.");
    }
    this.p2pService = null;
    this.p2pStatus = "closed";
    this.p2pChannelState = "closed";
    this.renderP2PPanel();
  }

  setSessionMode(mode) {
    if (!this.currentSession) this.currentSession = this.createSession(null);
    this.currentSession.mode = mode;
    this.currentSession.status = "modeSelect";
  }

  updatePlayerSelection(playerId, characterId) {
    if (!this.currentSession?.selections[playerId]) return;
    this.currentSession.selections[playerId].characterId = characterId;
    const player = this.currentSession.players.find((entry) => entry.slot === playerId);
    if (player) player.characterId = characterId;
    if (
      this.currentSession.online &&
      this.currentSession.roomCode &&
      this.currentSession.localSlot === playerId &&
      isFirebaseReady()
    ) {
      updateRoomPlayer(this.currentSession.roomCode, playerId, { characterId }).catch((error) => {
        this.showRoomMessage(error.message || "Could not sync character selection.");
      });
    }
  }

  lockPlayerSelection(playerId) {
    if (!this.currentSession?.selections[playerId]) return;
    this.currentSession.selections[playerId].locked = true;
    const player = this.currentSession.players.find((entry) => entry.slot === playerId);
    if (player) player.locked = true;
    if (
      this.currentSession.online &&
      this.currentSession.roomCode &&
      this.currentSession.localSlot === playerId &&
      isFirebaseReady()
    ) {
      updateRoomPlayer(this.currentSession.roomCode, playerId, {
        characterId: this.currentSession.selections[playerId].characterId,
        locked: true,
      }).catch((error) => {
        this.showRoomMessage(error.message || "Could not sync locked state.");
      });
    }
  }

  setSelectedMap(mapId) {
    this.selectedMapId = mapId;
    if (this.currentSession) {
      this.currentSession.selectedMapId = mapId;
    }
    if (
      this.currentSession?.online &&
      this.currentSession.roomCode &&
      this.isLocalHost() &&
      isFirebaseReady()
    ) {
      setRoomSelectedMap(this.currentSession.roomCode, mapId).catch((error) => {
        this.showRoomMessage(error.message || "Could not sync map selection.");
      });
    }
  }

  startSessionGame() {
    if (this.currentSession) {
      this.currentSession.status = "playing";
    }
    this.startGameFromSelection();
  }

  leaveSession() {
    this.match = null;
    this.currentMode = null;
    this.selectionPhase = "character";
    this.pickTimer = 0;
    this.preMatchPreviewTimer = 0;
    this.resetSession();
    this.resetMatch();
    this.renderer.resetEffects();
    this.input.reset();
    this.gameState = "mainMenu";
    this.syncUi();
  }

  goToMainMenu() {
    this.match = null;
    this.currentMode = null;
    this.resetSession();
    this.selectionPhase = "character";
    this.pickTimer = 0;
    this.preMatchPreviewTimer = 0;
    this.gameState = "mainMenu";
    this.resetMatch();
    this.renderer.resetEffects();
    this.input.reset();
    this.syncUi();
  }

  openJoinRoom() {
    this.resetSession();
    this.gameState = "joinRoom";
    this.ui.joinRoomCodeInput.value = "";
    this.ui.joinRoomMessage.textContent = "Enter a 6 character room code.";
    this.input.reset();
    this.syncUi();
  }

  normalizeJoinRoomCode() {
    this.ui.joinRoomCodeInput.value = this.ui.joinRoomCodeInput.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  }

  async submitJoinRoom() {
    const code = this.ui.joinRoomCodeInput.value.trim().toUpperCase();
    if (code.length === 0) {
      this.ui.joinRoomMessage.textContent = "Enter a room code first.";
      return;
    }
    if (code.length < 6) {
      this.ui.joinRoomMessage.textContent = "Room code must be 6 characters.";
      return;
    }

    await this.refreshFirebaseStatus();
    if (!isFirebaseReady()) {
      this.ui.joinRoomMessage.textContent = this.firebaseStatus || "Firebase is not configured.";
      return;
    }

    this.ui.joinRoomMessage.textContent = "Joining room...";
    try {
      await cleanupOldRoomsThrottled();
      const result = await joinOnlineRoom(code, {
        playerId: this.localPlayerId,
        playerName: "Player 2",
      });
      this.currentSession = this.createSession("customRoom");
      this.currentSession.online = true;
      this.currentSession.roomCode = result.roomCode;
      this.currentSession.localSlot = result.slot;
      this.currentSession.hostId = result.room.hostId;
      this.currentSession.status = "lobby";
      this.currentSession.mode = result.room.mode ?? null;
      this.currentSession.players = this.getRoomPlayersArray(result.room.players ?? {});
      this.currentRoom = this.currentSession;
      this.currentMode = null;
      this.gameState = "roomLobby";
      this.listenToCurrentRoom();
      this.startRoomPresenceHeartbeat();
      this.renderRoomLobby();
      this.input.reset();
      this.syncUi();
    } catch (error) {
      this.ui.joinRoomMessage.textContent = error.message || "Could not join room.";
    }
  }

  openMatchmaking() {
    this.match = null;
    this.currentMode = "pvpMatchmaking";
    this.gameState = "matchmaking";
    this.input.reset();
    this.syncUi();
  }

  openPracticeSelect(backTarget = "mainMenu") {
    this.openCharacterSelect("practice", backTarget);
  }

  openCharacterSelect(mode, backTarget = "mainMenu") {
    this.match = null;
    if (!this.currentSession?.type) {
      this.currentSession = this.createSession(mode === "pvpMatchmaking" ? "pvpMatchmaking" : "practiceRoom");
      this.currentSession.players = [
        {
          id: this.localPlayerId,
          name: "Player 1",
          slot: "p1",
          isHost: true,
          isLocal: true,
          ready: false,
        },
      ];
    }
    this.currentMode = mode;
    this.selectionPhase = "character";
    if (this.isPracticeLikeMode(mode)) {
      this.selectedP2Character = "basic";
      this.currentSession.mode = "practice";
      this.updatePlayerSelection("p2", "basic");
    } else if (mode === "pvpMatchmaking") {
      this.currentSession.mode = "pvp";
    }
    this.currentSession.status = "characterSelect";
    this.updatePlayerSelection("p1", this.selectedP1Character);
    this.selectBackTarget = backTarget;
    this.gameState = "characterSelect";
    this.input.reset();
    this.renderCharacterSelect();
    this.syncUi();
  }

  startPvpPickFlow() {
    this.createPvpMatchmakingSession();
    this.openCharacterSelect("pvpMatchmaking", "mainMenu");
    this.pickTimer = PVP_PICK_TIME;
    this.updatePickTimerText();
  }

  async createRoom() {
    await this.refreshFirebaseStatus();
    if (isFirebaseReady()) {
      try {
        await cleanupOldRoomsThrottled();
        const result = await createOnlineRoom({
          playerId: this.localPlayerId,
          playerName: "Player 1",
        });
        this.currentSession = this.createSession("customRoom");
        this.currentSession.online = true;
        this.currentSession.roomCode = result.roomCode;
        this.currentSession.hostId = this.localPlayerId;
        this.currentSession.localSlot = result.slot;
        this.currentSession.status = "lobby";
        this.currentSession.mode = result.room.mode ?? null;
        this.currentSession.players = this.getRoomPlayersArray(result.room.players ?? {});
        this.currentRoom = this.currentSession;
        this.listenToCurrentRoom();
        this.startRoomPresenceHeartbeat();
      } catch (error) {
        this.createRoomSession();
        this.showRoomMessage(error.message || "Online room creation failed. Using local room.");
      }
    } else {
      this.createRoomSession();
    }
    this.currentMode = null;
    this.selectionPhase = "character";
    this.gameState = "roomLobby";
    this.input.reset();
    this.renderRoomLobby();
    this.syncUi();
  }

  generateRoomCode() {
    return generateOnlineRoomCode();
  }

  async selectRoomMode(mode) {
    if (!this.currentSession?.roomCode) return;
    if (this.currentSession.online && !this.isLocalHost()) {
      this.showRoomMessage("Only the host can change the room mode.");
      return;
    }
    if (this.currentSession.online && isFirebaseReady()) {
      try {
        await setOnlineRoomMode(this.currentSession.roomCode, mode);
        this.showRoomMessage("Mode synced to room.");
      } catch (error) {
        this.showRoomMessage(error.message || "Could not update room mode.");
      }
      return;
    }
    this.setSessionMode(mode);
    this.renderRoomLobby();
  }

  async startSelectedRoomMode() {
    if (this.currentSession?.online && !this.isLocalHost()) {
      this.showRoomMessage("Only the host can start from this room.");
      return;
    }
    if (this.currentSession?.online && this.currentSession.mode === "pvpRoom") {
      if (!this.hasBothRoomPlayers()) {
        this.showRoomMessage("P1 and P2 are required for 1v1 PVP Room.");
        return;
      }
      try {
        await setRoomStatus(this.currentSession.roomCode, "characterSelect", {
          matchConfig: null,
          selectedMapId: null,
          previewStartedAt: null,
          previewEndAt: null,
          "players.p1.characterId": null,
          "players.p1.locked": false,
          "players.p1.ready": false,
          "players.p2.characterId": null,
          "players.p2.locked": false,
          "players.p2.ready": false,
        });
        this.showRoomMessage("Character select opened.");
      } catch (error) {
        this.showRoomMessage(error.message || "Could not open character select.");
      }
      return;
    }
    if (this.currentSession?.mode === "practice") {
      if (this.currentSession.online) {
        this.showRoomMessage("Practice Mode starts locally. Online battle sync is not implemented yet.");
      }
      this.openCharacterSelect("room", "roomLobby");
      return;
    }
    this.showRoomMessage("Select a mode first.");
  }

  copyRoomCode() {
    if (!this.currentSession?.roomCode || !navigator.clipboard) return;
    navigator.clipboard.writeText(this.currentSession.roomCode).catch(() => {});
  }

  renderRoomLobby() {
    if (!this.currentSession?.roomCode) return;

    this.ui.roomCodeText.textContent = `Room Code: ${this.currentSession.roomCode}`;
    this.ui.roomSessionTypeText.textContent = `Session Type: ${this.currentSession.type}`;
    this.ui.roomModeText.textContent = `Current Mode: ${this.currentSession.mode ?? "Not selected"}`;
    const onlineText = this.currentSession.online
      ? `Online status: ${isFirebaseReady() ? "Connected" : "Disconnected"}`
      : `Online status: Local only (${this.firebaseStatus})`;
    this.ui.roomOnlineStatusText.textContent = onlineText;
    this.ui.roomPlayerList.replaceChildren();
    for (const player of this.currentSession.players) {
      const item = document.createElement("li");
      const ready = player.ready ? "Ready" : "Not ready";
      const local = player.id === this.currentSession.localPlayerId ? " / You" : "";
      const character = player.characterId ? ` / ${CHARACTERS[player.characterId]?.name ?? player.characterId}` : "";
      item.textContent = `${player.slot ?? ""} ${player.name}${player.isHost ? " (Host)" : ""}${local} - ${ready}${character}`;
      this.ui.roomPlayerList.append(item);
    }
    const localPlayer = this.currentSession.players.find(
      (player) => player.id === this.currentSession.localPlayerId,
    );
    this.ui.readyRoomButton.textContent = localPlayer?.ready ? "Cancel Ready" : "Ready";
    this.ui.readyRoomButton.disabled = !this.currentSession.localSlot;
    const hostOnlyDisabled = this.currentSession.online && !this.isLocalHost();
    const pvpRoomWaiting = this.currentSession.mode === "pvpRoom" && !this.hasBothRoomPlayers();
    this.ui.startRoomModeButton.disabled = hostOnlyDisabled || pvpRoomWaiting;
    this.ui.startRoomModeButton.textContent = this.currentSession.mode === "pvpRoom"
      ? "Go to Character Select"
      : "Start";
    this.ui.practiceModeButton.disabled = hostOnlyDisabled;
    this.ui.pvpRoomModeButton.disabled = hostOnlyDisabled;
    this.ui.practiceModeButton.classList.toggle(
      "selected",
      this.currentSession.mode === "practice",
    );
    this.ui.pvpRoomModeButton.classList.toggle(
      "selected",
      this.currentSession.mode === "pvpRoom",
    );
    this.renderP2PPanel();
  }

  renderP2PPanel() {
    if (!this.ui?.p2pStatusText) return;

    const role = this.getP2PRole();
    const hasBothPlayers = this.hasBothRoomPlayers();
    const canUseP2P = Boolean(
      this.currentSession?.online &&
        this.currentSession.roomCode &&
        hasBothPlayers &&
        isFirebaseReady(),
    );

    const metrics = this.p2pMetrics;
    const bufferedAmount = metrics?.bufferedAmount ?? this.p2pService?.getBufferedAmount?.() ?? 0;
    this.ui.p2pStatusText.textContent = `P2P Status: ${this.p2pStatus}`;
    this.ui.p2pRoleText.textContent = `Local Role: ${role}`;
    this.ui.p2pChannelText.textContent =
      `DataChannel: ${this.p2pChannelState} / ICE: ${metrics?.iceConnectionState ?? "-"} / ` +
      `Buffer: ${formatBytes(bufferedAmount)}`;
    this.ui.p2pHintText.textContent = this.currentSession?.online
      ? hasBothPlayers
        ? "Signaling uses Firestore. TURN is not configured."
        : "Waiting for player"
      : "P2P test requires an online Firebase room.";
    this.ui.p2pConnectButton.disabled = !canUseP2P || this.p2pStatus === "connecting";
    this.ui.p2pPingButton.disabled = this.p2pChannelState !== "open";
    this.ui.p2pDisconnectButton.disabled = this.p2pStatus === "idle" || this.p2pStatus === "closed";
    this.ui.p2pLogList.replaceChildren();
    for (const entry of this.p2pLogs) {
      const item = document.createElement("li");
      item.textContent = entry;
      this.ui.p2pLogList.append(item);
    }
  }

  async toggleRoomReady() {
    if (!this.currentSession?.roomCode || !this.currentSession.localSlot) return;
    const player = this.currentSession.players.find(
      (entry) => entry.id === this.currentSession.localPlayerId,
    );
    const nextReady = !player?.ready;

    if (this.currentSession.online && isFirebaseReady()) {
      try {
        await setPlayerReady(this.currentSession.roomCode, this.currentSession.localSlot, nextReady);
      } catch (error) {
        this.showRoomMessage(error.message || "Could not update ready state.");
      }
      return;
    }

    if (player) player.ready = nextReady;
    const slot = this.currentSession.localSlot;
    if (this.currentSession.selections[slot]) {
      this.currentSession.selections[slot].ready = nextReady;
    }
    this.renderRoomLobby();
  }

  async leaveCurrentRoom() {
    const session = this.currentSession;
    this.stopRoomPresenceHeartbeat();
    if (session?.online && session.roomCode && session.localSlot && isFirebaseReady()) {
      try {
        await leaveOnlineRoom(session.roomCode, session.localSlot, {
          isHost: this.isLocalHost(),
        });
      } catch (error) {
        console.error("Leave room failed", error);
      }
    }
    this.goToMainMenu();
  }

  async returnOnlineRoomToLobby() {
    if (!this.isOnlinePvpRoom()) {
      this.goToMainMenu();
      return;
    }

    if (this.isLocalHost() && isFirebaseReady()) {
      try {
        await setRoomStatus(this.currentSession.roomCode, "lobby", {
          matchConfig: null,
          previewStartedAt: null,
          previewEndAt: null,
        });
      } catch (error) {
        this.showRoomMessage(error.message || "Could not return to lobby.");
      }
    }
    this.currentMode = null;
    this.selectionPhase = "character";
    this.hasStartedOnlineGame = false;
    this.gameState = "roomLobby";
    this.renderRoomLobby();
    this.syncUi();
  }

  markOnlineRoomEnded() {
    if (
      !this.currentSession?.online ||
      !this.currentSession.roomCode ||
      this.currentSession.roomEndMarked ||
      !isFirebaseReady()
    ) {
      return;
    }
    this.currentSession.roomEndMarked = true;
    endOnlineRoom(this.currentSession.roomCode)
      .catch((error) => console.warn("End online room failed", error));
  }

  leaveCharacterSelect() {
    if (this.isOnlinePvpRoom()) {
      this.leaveCurrentRoom();
      return;
    }

    if (this.gameState === "mapSelect") {
      this.selectionPhase = "character";
      this.gameState = "characterSelect";
      if (this.currentSession) this.currentSession.status = "characterSelect";
      this.renderCharacterSelect();
      this.syncUi();
      return;
    }

    if (this.selectBackTarget === "roomLobby" && this.currentSession?.roomCode) {
      this.currentMode = null;
      this.selectionPhase = "character";
      this.currentSession.status = "lobby";
      this.gameState = "roomLobby";
      this.renderRoomLobby();
      this.syncUi();
      return;
    }
    this.goToMainMenu();
  }

  async confirmCharacterSelection() {
    if (this.currentMode === "pvpMatchmaking") return;
    if (this.isOnlinePvpRoom()) {
      const slot = this.currentSession.localSlot;
      const player = this.getPlayerBySlot(slot);
      if (!slot || !player?.characterId || player.locked) return;
      try {
        await updateRoomPlayer(this.currentSession.roomCode, slot, {
          characterId: player.characterId,
          locked: true,
        });
      } catch (error) {
        this.showRoomMessage(error.message || "Could not lock character.");
      }
      return;
    }
    this.lockPlayerSelection("p1");
    this.openMapSelect();
  }

  openMapSelect() {
    this.selectionPhase = "map";
    this.gameState = "mapSelect";
    if (this.currentSession) this.currentSession.status = "mapSelect";
    this.input.reset();
    this.renderCharacterSelect();
    this.syncUi();
  }

  async confirmMapSelection() {
    if (this.selectionPhase !== "map") return;
    if (this.isOnlinePvpRoom()) {
      await this.handleOnlineMapAction();
      return;
    }
    this.startSessionGame();
  }

  async handleOnlineMapAction() {
    const slot = this.currentSession.localSlot;
    const player = this.getPlayerBySlot(slot);
    if (!this.currentSession.selectedMapId) {
      this.showSelectionMessage(this.isLocalHost() ? "Select a map first." : "Waiting for host to select a map.");
      return;
    }

    if (!player?.ready) {
      try {
        await setPlayerReady(this.currentSession.roomCode, slot, true);
        this.showSelectionMessage("Ready. Waiting for both players and host start.");
      } catch (error) {
        this.showSelectionMessage(error.message || "Could not set ready.");
      }
      return;
    }

    if (!this.isLocalHost()) return;
    const startBlockReason = this.getOnlineStartBlockReason();
    if (startBlockReason) {
      if (startBlockReason === "P2P not connected.") {
        this.showSelectionMessage("Connecting P2P...");
        await this.connectP2P();
        return;
      }
      this.showSelectionMessage(startBlockReason);
      return;
    }

    const previewStartedAt = Date.now();
    const previewEndAt = previewStartedAt + PRE_MATCH_PREVIEW_TIME * 1000;
    const matchConfig = this.createOnlineMatchConfig();
    try {
      await setRoomStatus(this.currentSession.roomCode, "preMatchPreview", {
        matchConfig,
        previewStartedAt,
        previewEndAt,
      });
      this.currentSession.matchConfig = matchConfig;
      this.currentSession.status = "preMatchPreview";
      this.currentSession.previewStartedAt = previewStartedAt;
      this.currentSession.previewEndAt = previewEndAt;
      this.currentMode = "pvpRoom";
      this.selectionPhase = "preview";
      this.gameState = "preMatchPreview";
      this.preMatchPreviewTimer = PRE_MATCH_PREVIEW_TIME;
      this.onlinePreviewFinishPending = false;
      this.renderPreMatchPreview();
      this.syncUi();
      this.p2pService?.send({
        type: "matchStart",
        matchConfig,
      }, { critical: true });
    } catch (error) {
      this.showSelectionMessage(error.message || "Could not start preview.");
    }
  }

  createOnlineMatchConfig() {
    const p1 = this.getPlayerBySlot("p1");
    const p2 = this.getPlayerBySlot("p2");
    return {
      mode: "onlinePvp",
      mapId: this.currentSession.selectedMapId,
      players: {
        p1: {
          playerId: p1.id,
          characterId: p1.characterId,
        },
        p2: {
          playerId: p2.id,
          characterId: p2.characterId,
        },
      },
      round: 1,
      p1Wins: 0,
      p2Wins: 0,
      seed: Math.floor(Math.random() * 1000000000),
      createdAt: Date.now(),
    };
  }

  getOnlineStartBlockReason() {
    const p1 = this.getPlayerBySlot("p1");
    const p2 = this.getPlayerBySlot("p2");
    if (!p1 || !p2) return "Waiting for player.";
    if (!p1.characterId || !p2.characterId || !p1.locked || !p2.locked) {
      return "Waiting for character lock.";
    }
    if (!this.currentSession.selectedMapId) return "Waiting for map.";
    if (!p1.ready || !p2.ready) return "Waiting for ready.";
    if (this.p2pChannelState !== "open") return "P2P not connected.";
    return "";
  }

  startGameFromSelection() {
    if (this.currentMode === "practice") {
      this.startPracticeGame();
      return;
    }

    if (this.currentMode === "room") {
      this.startRoomGame();
      return;
    }

    if (this.currentMode === "pvpMatchmaking") {
      this.startMatch();
    }
  }

  startPracticeGame() {
    this.startPractice();
  }

  startRoomGame() {
    this.startPractice();
  }

  lockPvpPick() {
    this.lockPlayerSelection("p1");
    this.selectedP2Character = this.chooseRandomCharacterId(this.selectedP1Character);
    this.updatePlayerSelection("p2", this.selectedP2Character);
    this.lockPlayerSelection("p2");
    this.setSelectedMap(this.chooseRandomMap());
    this.startPreMatchPreview();
  }

  chooseRandomCharacterId(excludeId = null) {
    const ids = Object.keys(CHARACTERS).filter((id) => id !== excludeId);
    const pool = ids.length > 0 ? ids : Object.keys(CHARACTERS);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  chooseRandomMap() {
    const mapIds = Object.keys(MAPS);
    return mapIds[Math.floor(Math.random() * mapIds.length)];
  }

  startPreMatchPreview() {
    this.selectionPhase = "preview";
    this.gameState = "preMatchPreview";
    if (this.currentSession) this.currentSession.status = "preview";
    this.preMatchPreviewTimer = PRE_MATCH_PREVIEW_TIME;
    this.input.reset();
    this.renderPreMatchPreview();
    this.syncUi();
  }

  renderPreMatchPreview() {
    const p1 = CHARACTERS[this.selectedP1Character] ?? { name: "Choosing..." };
    const p2 = CHARACTERS[this.selectedP2Character] ?? { name: "Choosing..." };
    const map = MAPS[this.selectedMapId] ?? { name: "Not selected" };
    this.ui.preMatchTitle.textContent = `P1 ${p1.name} VS P2 ${p2.name}`;
    this.ui.preMatchMapText.textContent = this.currentMode === "pvpRoom"
      ? `Map: ${map.name} / Online battle sync is not implemented yet`
      : `Map: ${map.name}`;
    this.ui.preMatchTimerText.textContent = `Starting in ${Math.ceil(this.preMatchPreviewTimer)}...`;
  }

  updatePickTimerText() {
    this.ui.pickTimerText.textContent = `Pick: ${Math.ceil(this.pickTimer)}s`;
  }

  startMatch() {
    if (this.isPracticeLikeMode()) {
      this.startPractice();
      return;
    }

    this.currentMode = "pvp";
    if (this.currentSession) {
      this.currentSession.mode = "pvp";
      this.currentSession.status = "playing";
    }
    this.resetMatch();
    this.startRound();
  }

  startPractice() {
    this.resetMatch();
    this.match = this.createPracticeMatch();
    this.gameState = "playing";
    if (this.currentSession) {
      this.currentSession.mode = "practice";
      this.currentSession.status = "playing";
      this.currentSession.selectedMapId = this.selectedMapId;
    }
    this.input.reset();
    this.syncUi();
    this.renderer.resetEffects();
    this.renderer.resize();
  }

  startOnlineGameFromMatchConfig(matchConfig) {
    if (this.hasStartedOnlineGame && this.gameState === "onlinePlaying" && this.match) return;
    if (!matchConfig?.players?.p1?.characterId || !matchConfig?.players?.p2?.characterId || !matchConfig.mapId) {
      this.showOnlineStartError("Missing online match config.");
      return;
    }

    try {
      this.applyMatchConfigSelection(matchConfig);
      this.currentSession.matchConfig = matchConfig;
      this.currentSession.status = "onlinePlaying";
      this.currentSession.localSlot =
        this.getLocalSlotFromMatchConfig(matchConfig) ?? this.currentSession.localSlot;
      if (!this.currentSession.localSlot) {
        throw new Error("Local player slot could not be resolved.");
      }
      this.onlineRole = this.getP2PRole();
      this.onlineTick = 0;
      this.onlineInputSeq = 0;
      this.onlineLastInputSeq = 0;
      this.onlineLastStateTick = 0;
      this.onlineInputSendTimer = 0;
      this.onlineStateSendTimer = 0;
      this.onlineLastSentInput = "";
      this.onlineRemoteInput = createEmptyOnlineInput();
      this.onlineInputBuffer = createOnlineInputBuffer();
      this.predictedInputBuffer = createOnlineInputBuffer();
      this.onlineLastKnownInput = createOnlineLastKnownInput();
      this.onlineLastReceivedSeq = { p1: 0, p2: 0 };
      this.onlineLastSentInputTick = 0;
      this.onlineLastReceivedInputTick = 0;
      this.onlineLastReceivedInputTicks = { p1: 0, p2: 0 };
      this.snapshotHistory = new Map();
      this.localChecksums = new Map();
      this.remoteChecksums = new Map();
      this.checksumDetails = new Map();
      this.desyncStatus = "OK";
      this.onlineSeed = normalizeSeed(matchConfig.seed);
      this.onlineRngState = this.onlineSeed;
      this.onlineInputDelayTicks = NETCODE_CONFIG.inputDelayTicks;
      this.onlineRollbackWindow = NETCODE_CONFIG.rollbackWindow;
      this.onlineInputBundleSize = NETCODE_CONFIG.inputBundleSize;
      this.lastRollbackTick = null;
      this.rollbackCount = 0;
      this.predictionMissCount = 0;
      this.rollbackLogs = [];
      this.isResimulating = false;
      this.pendingInputDelayChange = null;
      this.pingSamples = [];
      this.averagePing = null;
      this.lastPingSentTick = 0;
      this.onlineLastPingAt = 0;
      this.onlineLastPacketAt = Date.now();
      this.onlineLastPongAt = Date.now();
      this.onlineNetworkStatus = "OK";
      this.setNetworkStatus("connected", "", false);
      this.heartbeatMissCount = 0;
      this.lastNetworkWarnAt = 0;
      this.lastLateInputWarnAt = 0;
      this.lateInputDropCount = 0;
      this.predictedInputTicks = 0;
      this.predictionActiveUntilMs = 0;
      this.reconnectStartedAt = 0;
      this.remoteHidden = false;
      this.forceLocalInputNeutral = document.hidden || !this.windowHasFocus;
      this.onlinePhase = "syncing";
      this.resetMatch();
      this.match = this.createOnlineMatch();
      this.roundTimer = ROUND_TIME_LIMIT;
      this.gameState = "onlinePlaying";
      this.hasStartedOnlineGame = true;
      this.onlinePreviewFinishPending = false;
      this.input.reset();
      this.renderer.resetEffects();
      this.renderer.resize();
      this.syncUi();
      this.ui.onlineInputDelaySelect.value = String(this.onlineInputDelayTicks);
      this.ui.onlineRollbackWindowSelect.value = String(this.onlineRollbackWindow);
      this.ui.showNetworkDebugToggle.checked = this.showNetworkDebug;
      this.sendLockstepReady();
    } catch (error) {
      this.hasStartedOnlineGame = false;
      this.onlinePreviewFinishPending = false;
      console.error("Online game initialization failed", error);
      this.showOnlineStartError(error.message || "Online game initialization failed.");
    }
  }

  showOnlineStartError(message) {
    this.selectionNotice = message;
    if (this.ui?.preMatchTimerText && this.gameState === "preMatchPreview") {
      this.ui.preMatchTimerText.textContent = message;
    }
    this.showRoomMessage(message);
  }

  async finishOnlinePreview() {
    if (
      this.onlinePreviewFinishPending ||
      !this.isLocalHost() ||
      this.currentSession?.status !== "preMatchPreview"
    ) {
      return;
    }

    const matchConfig = this.currentSession.matchConfig;
    if (!matchConfig) {
      this.showOnlineStartError("Missing match config.");
      return;
    }

    this.onlinePreviewFinishPending = true;
    try {
      await setRoomStatus(this.currentSession.roomCode, "onlinePlaying");
      this.currentSession.status = "onlinePlaying";
      this.startOnlineGameFromMatchConfig(matchConfig);
    } catch (error) {
      this.onlinePreviewFinishPending = false;
      this.showOnlineStartError(error.message || "Could not enter online game.");
    }
  }

  startOnlineBattle() {
    this.startOnlineGameFromMatchConfig(this.currentSession?.matchConfig);
  }

  applyMatchConfigSelection(matchConfig) {
    this.selectedMapId = matchConfig.mapId;
    this.selectedP1Character = matchConfig.players.p1.characterId;
    this.selectedP2Character = matchConfig.players.p2.characterId;
  }

  getLocalSlotFromMatchConfig(matchConfig) {
    if (matchConfig.players.p1.playerId === this.currentSession.localPlayerId) return "p1";
    if (matchConfig.players.p2.playerId === this.currentSession.localPlayerId) return "p2";
    return null;
  }

  startOnlineRound() {
    this.match = this.createOnlineMatch();
    this.roundTimer = ROUND_TIME_LIMIT;
    this.roundWinner = null;
    this.onlinePhase = "playing";
    this.onlineVirtualInput.reset();
    this.renderer.resetEffects();
  }

  updateOnlineBattle() {
    if (!this.match) return;
    this.updateOnlineNetworkHealth();
    if (this.shouldHardDisconnectOnline()) {
      this.onlinePhase = "connectionLost";
      this.gameState = "onlineConnectionLost";
      this.markOnlineRoomEnded();
      this.updateNetworkStatus();
      this.syncUi();
      return;
    }

    if (this.onlinePhase === "syncing") {
      this.sendLockstepReady();
      if (!this.onlinePeerReady || !this.onlineReadyAcknowledged) {
        this.syncOnlineDebugText();
        return;
      }
      this.onlinePhase = "playing";
      this.onlineVirtualInput.reset();
    }

    this.applyPendingInputDelayChange();
    this.scheduleLocalInput();
    this.updateOnlineGameTick(this.onlineTick);
    this.onlineTick += 1;
    this.sendOnlineHeartbeatIfDue();
    this.syncOnlineDebugText();
  }

  sendOnlineHeartbeatIfDue() {
    const now = Date.now();
    if (now - this.onlineLastPingAt < HEARTBEAT_INTERVAL_MS) return;
    this.lastPingSentTick = this.onlineTick;
    this.onlineLastPingAt = now;
    this.p2pService?.send({
      type: "ping",
      time: now,
      from: this.localPlayerId,
    }, { critical: true });
  }

  updateOnlineNetworkHealth() {
    const now = Date.now();
    const metrics = this.p2pMetrics;
    const lastPacketAt = Math.max(this.onlineLastPacketAt || 0, metrics?.lastPacketAt || 0);
    const lastPacketAge = lastPacketAt ? now - lastPacketAt : 0;
    const hardTimeout = this.localHidden || this.remoteHidden
      ? HIDDEN_HARD_TIMEOUT_MS
      : VISIBLE_HARD_TIMEOUT_MS;

    if (this.p2pStatus === "failed" || metrics?.connectionState === "failed" || metrics?.iceConnectionState === "failed") {
      this.onlineNetworkStatus = "hard-failed";
      this.updateNetworkStatus();
      return;
    }
    if (this.p2pChannelState === "closing" || this.p2pChannelState === "closed") {
      this.onlineNetworkStatus = "closed";
      this.updateNetworkStatus();
      return;
    }
    if (lastPacketAge >= hardTimeout) {
      this.onlineNetworkStatus = "timeout";
      this.logNetworkWarning("hard timeout", { lastPacketAge });
      this.updateNetworkStatus();
      return;
    }
    if (
      this.p2pStatus === "unstable" ||
      metrics?.connectionState === "disconnected" ||
      metrics?.iceConnectionState === "disconnected"
    ) {
      this.onlineNetworkStatus = "reconnecting";
      if (!this.reconnectStartedAt) this.reconnectStartedAt = now;
      this.logNetworkWarning("reconnecting", { lastPacketAge });
      this.updateNetworkStatus();
      return;
    }
    if (lastPacketAge >= VISIBLE_SOFT_TIMEOUT_MS) {
      this.onlineNetworkStatus = "unstable";
      this.heartbeatMissCount += 1;
      this.logNetworkWarning("soft timeout", { lastPacketAge });
      this.updateNetworkStatus();
      return;
    }
    this.onlineNetworkStatus = "OK";
    this.reconnectStartedAt = 0;
    this.heartbeatMissCount = 0;
    this.updateNetworkStatus();
  }

  shouldHardDisconnectOnline() {
    return (
      this.onlineNetworkStatus === "hard-failed" ||
      this.onlineNetworkStatus === "closed" ||
      this.onlineNetworkStatus === "timeout"
    );
  }

  logNetworkWarning(reason, detail = {}) {
    const now = Date.now();
    if (now - this.lastNetworkWarnAt < 1000) return;
    this.lastNetworkWarnAt = now;
    console.warn("[NET]", reason, {
      ...detail,
      localHidden: this.localHidden,
      remoteHidden: this.remoteHidden,
      pcState: this.p2pMetrics?.connectionState ?? "-",
      iceState: this.p2pMetrics?.iceConnectionState ?? "-",
      dcState: this.p2pChannelState,
    });
  }

  updateNetworkStatus() {
    const isOnlineGame =
      this.gameState === "onlinePlaying" ||
      this.gameState === "onlineConnectionLost";
    if (!isOnlineGame) {
      this.setNetworkStatus("connected", "", false);
      return;
    }

    if (this.shouldHardDisconnectOnline()) {
      this.setNetworkStatus("disconnected", "상대와의 연결이 끊겼습니다", true);
      return;
    }

    if (this.isReconnectingGraceState()) {
      const remainingSeconds = this.getReconnectGraceRemainingSeconds();
      const suffix = remainingSeconds !== null ? ` ${remainingSeconds}초` : "";
      this.setNetworkStatus("reconnecting", `연결 복구 대기 중...${suffix}`, false);
      return;
    }

    if (this.remoteHidden) {
      this.setNetworkStatus("remote_hidden", "상대 창 비활성화 - 예측 진행 중", false);
      return;
    }

    if (this.isInputPredictionActive() || this.onlineNetworkStatus === "unstable") {
      this.setNetworkStatus("unstable", "연결 불안정 - 입력 예측 중", false);
      return;
    }

    this.setNetworkStatus("connected", "", false);
  }

  setNetworkStatus(level, message, hardDisconnected) {
    if (
      this.networkStatus.level !== level ||
      this.networkStatus.message !== message ||
      this.networkStatus.hardDisconnected !== hardDisconnected
    ) {
      this.networkStatus = {
        level,
        message,
        hardDisconnected,
        sinceMs: Date.now(),
      };
    }
    this.renderNetworkStatus();
  }

  isReconnectingGraceState() {
    const metrics = this.p2pMetrics;
    return (
      this.onlineNetworkStatus === "reconnecting" ||
      metrics?.connectionState === "disconnected" ||
      metrics?.iceConnectionState === "disconnected"
    ) && this.p2pChannelState !== "closed";
  }

  isInputPredictionActive() {
    return Date.now() < this.predictionActiveUntilMs;
  }

  getReconnectGraceRemainingSeconds() {
    const metrics = this.p2pMetrics;
    const lastPacketAt = Math.max(this.onlineLastPacketAt || 0, metrics?.lastPacketAt || 0);
    if (!lastPacketAt) return null;
    const hardTimeout = this.localHidden || this.remoteHidden
      ? HIDDEN_HARD_TIMEOUT_MS
      : VISIBLE_HARD_TIMEOUT_MS;
    const remaining = Math.max(0, hardTimeout - (Date.now() - lastPacketAt));
    return Math.ceil(remaining / 1000);
  }

  renderNetworkStatus() {
    if (!this.ui?.networkStatusBanner || !this.ui?.networkDisconnectModal) return;
    const { level, message, hardDisconnected } = this.networkStatus;
    const showBanner =
      this.gameState === "onlinePlaying" &&
      level !== "connected" &&
      !hardDisconnected;
    this.ui.networkStatusBanner.className = `network-status-banner ${level}`;
    this.ui.networkStatusBanner.classList.toggle("hidden", !showBanner);
    this.ui.networkStatusBanner.textContent = showBanner ? message : "";

    const showModal =
      hardDisconnected &&
      (this.gameState === "onlinePlaying" || this.gameState === "onlineConnectionLost");
    this.ui.networkDisconnectModal.classList.toggle("hidden", !showModal);
  }

  setOnlineNetcodeConfig(config = {}, broadcast = false) {
    const delay = Math.max(
      0,
      Math.min(2, Math.round(Number(config.inputDelayTicks ?? this.onlineInputDelayTicks) || 0)),
    );
    const rollbackWindow = [8, 12, 16].includes(Number(config.rollbackWindow))
      ? Number(config.rollbackWindow)
      : this.onlineRollbackWindow;
    if (broadcast && this.onlineRole !== "host") {
      this.ui.onlineInputDelaySelect.value = String(this.onlineInputDelayTicks);
      this.ui.onlineRollbackWindowSelect.value = String(this.onlineRollbackWindow);
      return;
    }

    const effectiveTick = this.gameState === "onlinePlaying"
      ? this.onlineTick + this.onlineRollbackWindow
      : this.onlineTick;
    this.pendingInputDelayChange = { delay, rollbackWindow, effectiveTick };
    if (broadcast) {
      this.p2pService?.send({
        type: "netcodeConfig",
        inputDelayTicks: delay,
        rollbackWindow,
        effectiveTick,
      }, { critical: true });
    }
  }

  applyPendingInputDelayChange() {
    if (
      !this.pendingInputDelayChange ||
      this.onlineTick < this.pendingInputDelayChange.effectiveTick
    ) {
      return;
    }
    this.onlineInputDelayTicks = this.pendingInputDelayChange.delay;
    this.onlineRollbackWindow = this.pendingInputDelayChange.rollbackWindow;
    this.pendingInputDelayChange = null;
    this.ui.onlineInputDelaySelect.value = String(this.onlineInputDelayTicks);
    this.ui.onlineRollbackWindowSelect.value = String(this.onlineRollbackWindow);
  }

  scheduleLocalInput() {
    const slot = this.currentSession.localSlot;
    if (slot !== "p1" && slot !== "p2") return;
    const targetTick = this.onlineTick + this.onlineInputDelayTicks;
    const inputState = this.captureLocalOnlineInput();
    this.onlineInputBuffer[slot].set(targetTick, inputState);
    this.onlineLastSentInputTick = targetTick;
    this.onlineInputSeq += 1;
    const firstTick = Math.max(0, targetTick - this.onlineInputBundleSize + 1);
    const inputs = [];
    for (let tick = firstTick; tick <= targetTick; tick += 1) {
      const input = this.onlineInputBuffer[slot].get(tick);
      if (input) inputs.push({ tick, input: cloneOnlineInput(input) });
    }
    this.p2pService?.send({
      type: "inputBundle",
      slot,
      latestTick: targetTick,
      seq: this.onlineInputSeq,
      playerId: this.localPlayerId,
      inputs,
    }, { critical: true });
  }

  updateOnlineGameTick(tick, { isResimulating = false } = {}) {
    this.saveSnapshot(tick);
    if (this.onlinePhase === "playing") {
      const p1Input = this.getInputForTick("p1", tick);
      const p2Input = this.getInputForTick("p2", tick);
      this.onlineVirtualInput.setInputs(p1Input, p2Input);
      this.roundTimer = Math.max(0, this.roundTimer - FIXED_DT);
      this.match.update(FIXED_DT, this.onlineVirtualInput);
      if (isResimulating) {
        this.match.combat.hitEvents.length = 0;
        this.match.visualEvents.length = 0;
      }
      if (this.match.winner) {
        this.finishOnlineRound(this.getWinnerIndex(this.match.winner));
      } else if (this.roundTimer === 0) {
        this.finishOnlineRound(this.resolveTimerWinner());
      }
    } else if (this.onlinePhase === "roundOver") {
      this.roundOverTimer = Math.max(0, this.roundOverTimer - FIXED_DT);
      if (this.roundOverTimer === 0) {
        this.startOnlineRound();
      }
    }

    if (!isResimulating && tick % NETCODE_CONFIG.checksumInterval === 0) {
      this.sendOnlineChecksum(tick);
    }
    this.pruneOnlineBuffers(tick);
  }

  getInputForTick(slot, tick) {
    const buffered = this.onlineInputBuffer[slot].get(tick);
    if (buffered) {
      const normalized = normalizeOnlineInput(buffered);
      this.onlineLastKnownInput[slot] = normalized;
      this.predictedInputBuffer[slot].delete(tick);
      return normalized;
    }
    const predicted = cloneOnlineInput(
      this.shouldPredictNeutralInput(slot, tick)
        ? createEmptyOnlineInput()
        : this.onlineLastKnownInput[slot] ?? createEmptyOnlineInput(),
    );
    this.predictedInputBuffer[slot].set(tick, predicted);
    if (slot !== this.currentSession?.localSlot) {
      this.predictedInputTicks += 1;
      this.predictionActiveUntilMs = Date.now() + 450;
    }
    return predicted;
  }

  shouldPredictNeutralInput(slot, tick) {
    if (slot === this.currentSession?.localSlot) return false;
    if (this.remoteHidden) return true;
    const latest = this.onlineLastReceivedInputTicks?.[slot] ?? -1;
    if (latest < 0) return false;
    return tick - latest > REMOTE_INPUT_LAST_KNOWN_TICKS;
  }

  rollbackToTick(tick, reason = null) {
    if (this.isResimulating || tick >= this.onlineTick) return false;
    const snapshot = this.snapshotHistory.get(tick);
    if (!snapshot) {
      this.desyncStatus = `DESYNC / rollback miss @ ${tick}`;
      console.error("Rollback snapshot unavailable", {
        tick,
        onlineTick: this.onlineTick,
        rollbackWindow: this.onlineRollbackWindow,
      });
      return false;
    }

    const endTick = this.onlineTick;
    const restoredTick = snapshot.onlineTick;
    for (const savedTick of [...this.snapshotHistory.keys()]) {
      if (savedTick >= tick) this.snapshotHistory.delete(savedTick);
    }
    for (const slot of ["p1", "p2"]) {
      for (const predictedTick of [...this.predictedInputBuffer[slot].keys()]) {
        if (predictedTick >= tick && predictedTick < endTick) {
          this.predictedInputBuffer[slot].delete(predictedTick);
        }
      }
    }
    for (const checksumTick of [...this.localChecksums.keys()]) {
      if (checksumTick >= tick) this.localChecksums.delete(checksumTick);
    }
    for (const checksumTick of [...this.remoteChecksums.keys()]) {
      if (checksumTick >= tick) this.remoteChecksums.delete(checksumTick);
    }
    for (const checksumTick of [...this.checksumDetails.keys()]) {
      if (checksumTick >= tick) this.checksumDetails.delete(checksumTick);
    }

    if (!this.restoreGameSnapshot(snapshot)) return false;
    this.isResimulating = true;
    try {
      this.resimulateFromTick(tick, endTick);
    } finally {
      this.isResimulating = false;
      this.onlineTick = endTick;
      this.match.combat.hitEvents.length = 0;
      this.match.visualEvents.length = 0;
    }
    this.lastRollbackTick = tick;
    this.rollbackCount += 1;
    const logEntry = {
      tick,
      restoredTick,
      endTick,
      reason,
    };
    this.rollbackLogs.unshift(logEntry);
    this.rollbackLogs = this.rollbackLogs.slice(0, 10);
    console.info("BAC World rollback", logEntry);
    return true;
  }

  resimulateFromTick(startTick, endTick) {
    for (let tick = startTick; tick < endTick; tick += 1) {
      this.onlineTick = tick;
      this.updateOnlineGameTick(tick, { isResimulating: true });
      this.onlineTick = tick + 1;
    }
  }

  createGameSnapshot() {
    if (!this.match) return null;
    return {
      onlineTick: this.onlineTick,
      players: this.match.characters.map((character) =>
        serializeCharacterSnapshot(character, this.map)),
      combat: {
        hitboxes: this.match.combat.hitboxes.map((hitbox) =>
          serializeCombatSnapshot(hitbox, this.match.characters)),
        projectiles: this.match.combat.projectiles.map((projectile) =>
          serializeCombatSnapshot(projectile, this.match.characters)),
        areas: this.match.combat.areas.map((area) =>
          serializeCombatSnapshot(area, this.match.characters)),
      },
      round: {
        phase: this.onlinePhase,
        timer: this.roundTimer,
        roundNumber: this.roundNumber,
        roundWins: [...this.roundWins],
        roundOverTimer: this.roundOverTimer,
        roundWinner: this.roundWinner,
        matchWinner: this.matchWinner,
        winnerIndex: this.match.winner ? this.match.characters.indexOf(this.match.winner) : null,
      },
      rngState: this.onlineRngState,
      simulationTick: this.match.simulationTick,
      inputState: {
        lastKnown: {
          p1: cloneOnlineInput(this.onlineLastKnownInput.p1),
          p2: cloneOnlineInput(this.onlineLastKnownInput.p2),
        },
        virtualInput: this.onlineVirtualInput.createSnapshot(),
      },
    };
  }

  restoreGameSnapshot(snapshot) {
    if (!snapshot || !this.match) return false;
    for (let index = 0; index < snapshot.players.length; index += 1) {
      const character = this.match.characters[index];
      if (character) restoreCharacterSnapshot(character, snapshot.players[index], this.map);
    }
    const sharedHitTargetSets = new Map();
    this.match.combat.hitboxes = (snapshot.combat?.hitboxes ?? []).map((hitbox) =>
      restoreCombatSnapshot(hitbox, this.match.characters, sharedHitTargetSets));
    this.match.combat.projectiles = (snapshot.combat?.projectiles ?? []).map((projectile) =>
      restoreCombatSnapshot(projectile, this.match.characters, sharedHitTargetSets));
    this.match.combat.areas = (snapshot.combat?.areas ?? []).map((area) =>
      restoreCombatSnapshot(area, this.match.characters, sharedHitTargetSets));
    this.match.combat.hitEvents = [];
    this.match.visualEvents = [];
    this.onlineTick = snapshot.onlineTick;
    this.onlinePhase = snapshot.round.phase;
    this.roundTimer = snapshot.round.timer;
    this.roundNumber = snapshot.round.roundNumber;
    this.roundWins = [...snapshot.round.roundWins];
    this.roundOverTimer = snapshot.round.roundOverTimer;
    this.roundWinner = snapshot.round.roundWinner;
    this.matchWinner = snapshot.round.matchWinner;
    this.match.winner =
      Number.isInteger(snapshot.round.winnerIndex)
        ? this.match.characters[snapshot.round.winnerIndex]
        : null;
    this.match.combat.lastHit = null;
    this.onlineRngState = snapshot.rngState;
    this.match.simulationTick = snapshot.simulationTick ?? snapshot.onlineTick;
    this.onlineLastKnownInput = {
      p1: cloneOnlineInput(snapshot.inputState?.lastKnown?.p1),
      p2: cloneOnlineInput(snapshot.inputState?.lastKnown?.p2),
    };
    this.onlineVirtualInput.restoreSnapshot(snapshot.inputState?.virtualInput);
    return true;
  }

  saveSnapshot(tick) {
    const snapshot = this.createGameSnapshot();
    if (!snapshot) return;
    this.snapshotHistory.set(tick, snapshot);
    this.pruneOldSnapshots(tick);
  }

  pruneOldSnapshots(currentTick = this.onlineTick) {
    const oldestTick = currentTick - this.onlineRollbackWindow;
    for (const tick of this.snapshotHistory.keys()) {
      if (tick < oldestTick) this.snapshotHistory.delete(tick);
    }
  }

  pruneOnlineBuffers(currentTick) {
    const oldestInputTick = currentTick - this.onlineRollbackWindow - 20;
    for (const slot of ["p1", "p2"]) {
      for (const tick of this.onlineInputBuffer[slot].keys()) {
        if (tick < oldestInputTick) this.onlineInputBuffer[slot].delete(tick);
      }
      for (const tick of this.predictedInputBuffer[slot].keys()) {
        if (tick < oldestInputTick) this.predictedInputBuffer[slot].delete(tick);
      }
    }
    const oldestChecksumTick = currentTick - NETCODE_CONFIG.checksumInterval * 4;
    for (const tick of this.localChecksums.keys()) {
      if (tick < oldestChecksumTick) this.localChecksums.delete(tick);
    }
    for (const tick of this.remoteChecksums.keys()) {
      if (tick < oldestChecksumTick) this.remoteChecksums.delete(tick);
    }
    for (const tick of this.checksumDetails.keys()) {
      if (tick < oldestChecksumTick) this.checksumDetails.delete(tick);
    }
  }

  sendOnlineChecksum(tick) {
    const checksum = this.createOnlineChecksum(tick);
    this.localChecksums.set(tick, checksum);
    this.checksumDetails.set(tick, this.createChecksumDetails(tick));
    this.compareOnlineChecksum(tick);
    this.p2pService?.send({
      type: "checksum",
      tick,
      checksum,
    }, { critical: false });
  }

  receiveOnlineChecksum(message) {
    const tick = Number(message.tick);
    if (!Number.isInteger(tick) || typeof message.checksum !== "string") return;
    this.remoteChecksums.set(tick, message.checksum);
    this.compareOnlineChecksum(tick);
  }

  compareOnlineChecksum(tick) {
    const local = this.localChecksums.get(tick);
    const remote = this.remoteChecksums.get(tick);
    if (!local || !remote) return;
    if (local === remote) {
      if (this.desyncStatus !== "DESYNC") this.desyncStatus = "OK";
      return;
    }
    this.desyncStatus = `DESYNC @ ${tick}`;
    console.error("BAC World online desync", {
      tick,
      local,
      remote,
      details: this.checksumDetails.get(tick),
      recentP1Inputs: this.getRecentInputs("p1", tick, 10),
      recentP2Inputs: this.getRecentInputs("p2", tick, 10),
      rollbackLogs: this.rollbackLogs,
    });
  }

  createOnlineChecksum(tick) {
    const characters = this.match?.characters ?? [];
    const projectiles = this.match?.combat.projectiles ?? [];
    const areas = this.match?.combat.areas ?? [];
    const values = [
      tick,
      ...characters.flatMap((character) => [
        quantize(character.x),
        quantize(character.y),
        quantize(character.vx),
        quantize(character.vy),
        quantize(character.health),
        quantize(character.stamina),
        character.facing,
        character.onGround ? 1 : 0,
        quantize(character.hitStun),
        character.castLockTicks ?? 0,
        character.dashTicks ?? 0,
        character.dashStopOnEnd ? 1 : 0,
        character.actionWeaponVisualId ?? "",
        character.actionWeaponVisualTicks ?? 0,
        character.invincibleTicks ?? 0,
        character.hurtboxDisabledTicks ?? 0,
        character.currentStanceMode ?? "",
        character.defaultWeaponId ?? "",
        character.currentStanceIndicatorId ?? "",
        character.modeSwapBonusBasicAttackReady ? 1 : 0,
        character.modeSwapBonusActionId ?? "",
        character.modeSwapBonusDamage ?? 0,
        JSON.stringify(character.activeStatuses ?? {}),
        character.pendingAbility?.abilityId ?? "",
        ...Object.entries(character.cooldownTicks ?? {})
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
          .flatMap(([abilityId, ticks]) => [abilityId, ticks]),
      ]),
      projectiles.length,
      ...projectiles.flatMap((projectile) => [
        projectile.id ?? "",
        quantize(projectile.x),
        quantize(projectile.y),
        quantize(projectile.vx),
        quantize(projectile.vy),
        quantize(projectile.life),
        projectile.homingActive ? 1 : 0,
        projectile.hasReleasedHoming ? 1 : 0,
        projectile.lockedTargetId ?? "",
        this.match.characters.indexOf(projectile.owner),
      ]),
      areas.length,
      ...areas.flatMap((area) => [
        area.id ?? "",
        area.remainingTicks ?? 0,
        area.elapsedTicks ?? 0,
        ...[...(area.lastDamageTickByTargetId ?? new Map()).entries()].flat(),
      ]),
      quantize(this.roundTimer),
      ...this.roundWins,
    ];
    return hashString(values.join("|"));
  }

  createChecksumDetails(tick) {
    const summarizePlayer = (character) => ({
      x: character.x,
      y: character.y,
      vx: character.vx,
      vy: character.vy,
      hp: character.health,
      stamina: character.stamina,
      facing: character.facing,
      onGround: character.onGround,
      hitStun: character.hitStun,
      castLockTicks: character.castLockTicks,
      dashTicks: character.dashTicks,
      dashStopOnEnd: character.dashStopOnEnd,
      actionWeaponVisualId: character.actionWeaponVisualId,
      actionWeaponVisualTicks: character.actionWeaponVisualTicks,
      invincibleTicks: character.invincibleTicks,
      hurtboxDisabledTicks: character.hurtboxDisabledTicks,
      currentStanceMode: character.currentStanceMode,
      defaultWeaponId: character.defaultWeaponId,
      currentStanceIndicatorId: character.currentStanceIndicatorId,
      modeSwapBonusBasicAttackReady: character.modeSwapBonusBasicAttackReady,
      modeSwapBonusActionId: character.modeSwapBonusActionId,
      modeSwapBonusDamage: character.modeSwapBonusDamage,
      activeStatuses: clonePlainObject(character.activeStatuses),
      cooldownTicks: { ...character.cooldownTicks },
      pendingAbility: character.pendingAbility?.abilityId ?? null,
    });
    return {
      tick,
      p1: summarizePlayer(this.match.characters[0]),
      p2: summarizePlayer(this.match.characters[1]),
      projectiles: this.match.combat.projectiles.map((projectile) => ({
        x: projectile.x,
        y: projectile.y,
        vx: projectile.vx,
        vy: projectile.vy,
        owner: this.match.characters.indexOf(projectile.owner),
        abilityId: projectile.abilityId,
        homingActive: projectile.homingActive,
        hasReleasedHoming: projectile.hasReleasedHoming,
        lockedTargetId: projectile.lockedTargetId,
      })),
      areas: this.match.combat.areas.map((area) => ({
        id: area.id,
        remainingTicks: area.remainingTicks,
        elapsedTicks: area.elapsedTicks,
        lastDamageTickEntries: [
          ...(area.lastDamageTickByTargetId ?? new Map()).entries(),
        ],
      })),
      roundTimer: this.roundTimer,
      roundWins: [...this.roundWins],
    };
  }

  getRecentInputs(slot, endTick = this.onlineTick, count = 10) {
    const result = [];
    const startTick = Math.max(0, endTick - count + 1);
    for (let tick = startTick; tick <= endTick; tick += 1) {
      const input = this.onlineInputBuffer[slot].get(tick);
      const predicted = this.predictedInputBuffer[slot].get(tick);
      result.push({
        tick,
        input: input ? cloneOnlineInput(input) : null,
        predicted: predicted ? cloneOnlineInput(predicted) : null,
      });
    }
    return result;
  }

  finishOnlineRound(winnerIndex) {
    this.roundWinner = winnerIndex;
    this.roundOverTimer = ROUND_OVER_DURATION;
    if (winnerIndex !== null) {
      this.roundWins[winnerIndex] += 1;
      if (this.roundWins[winnerIndex] >= MATCH_POINT) {
        this.matchWinner = winnerIndex;
        this.onlinePhase = "matchOver";
        this.markOnlineRoomEnded();
        return;
      }
      this.roundNumber += 1;
    }
    this.onlinePhase = "roundOver";
  }

  captureLocalOnlineInput() {
    if (this.forceLocalInputNeutral || document.hidden || !this.windowHasFocus) {
      return createEmptyOnlineInput();
    }
    const localCharacterId =
      this.currentSession?.localSlot === "p2"
        ? this.selectedP2Character
        : this.selectedP1Character;
    return {
      left: this.input.isDown("KeyA"),
      right: this.input.isDown("KeyD"),
      up: this.input.isDown("KeyW"),
      down: this.input.isDown("KeyS"),
      attack: this.input.isDown("KeyJ"),
      skill1: this.input.isDown("KeyK"),
      skill2: this.input.isDown("KeyL"),
      movementSkill: this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight"),
      extra:
        localCharacterId === "inquisitor"
          ? this.input.isDown("KeyB")
          : this.input.isDown("Semicolon"),
      special:
        localCharacterId === "fylang_character" || localCharacterId === "hai_ht2"
          ? this.input.isDown("Space")
          : this.input.isDown("KeyN"),
    };
  }

  processRemoteInputBundle(slot, entries, seq = 0) {
    if (
      (slot !== "p1" && slot !== "p2") ||
      slot === this.currentSession.localSlot ||
      !Array.isArray(entries)
    ) {
      return;
    }

    this.onlineLastReceivedSeq[slot] = Math.max(this.onlineLastReceivedSeq[slot], seq);
    this.onlineLastInputSeq = Math.max(this.onlineLastInputSeq, seq);
    let earliestMismatch = null;
    let mismatchReason = null;

    const orderedEntries = [...entries]
      .filter((entry) => Number.isInteger(Number(entry?.tick)) && Number(entry.tick) >= 0)
      .sort((a, b) => Number(a.tick) - Number(b.tick));

    for (const entry of orderedEntries) {
      const tick = Number(entry.tick);
      const actualInput = normalizeOnlineInput(entry.input);
      const predictedInput = this.predictedInputBuffer[slot].get(tick);
      this.onlineInputBuffer[slot].set(tick, actualInput);
      this.onlineLastReceivedInputTick = Math.max(this.onlineLastReceivedInputTick, tick);
      this.onlineLastReceivedInputTicks[slot] = Math.max(
        this.onlineLastReceivedInputTicks[slot],
        tick,
      );

      if (tick < this.onlineTick && predictedInput && !inputsEqual(predictedInput, actualInput)) {
        this.predictionMissCount += 1;
        if (earliestMismatch === null || tick < earliestMismatch) {
          earliestMismatch = tick;
          mismatchReason = {
            slot,
            predicted: cloneOnlineInput(predictedInput),
            actual: cloneOnlineInput(actualInput),
          };
        }
      } else if (
        tick < this.onlineTick &&
        !predictedInput &&
        !this.snapshotHistory.has(tick)
      ) {
        this.desyncStatus = `DESYNC / late input @ ${tick}`;
        this.recordLateInput(slot, tick, actualInput);
      } else {
        this.predictedInputBuffer[slot].delete(tick);
      }
    }

    if (earliestMismatch !== null) {
      this.rollbackToTick(earliestMismatch, mismatchReason);
    }
  }

  recordLateInput(slot, tick, actualInput) {
    this.lateInputDropCount += 1;
    const now = performance.now();
    if (now - this.lastLateInputWarnAt < LATE_INPUT_WARN_INTERVAL_MS) return;
    console.warn("Late input exceeded rollback window", {
      tick,
      onlineTick: this.onlineTick,
      rollbackWindow: this.onlineRollbackWindow,
      slot,
      droppedSinceLastWarn: this.lateInputDropCount,
      actualInput,
    });
    this.lastLateInputWarnAt = now;
    this.lateInputDropCount = 0;
  }

  handleP2PDataMessage(message) {
    this.onlineLastPacketAt = Date.now();
    if (message.type === "lockstepReady") {
      this.onlinePeerReady = true;
      this.p2pService?.send({
        type: "lockstepReadyAck",
        slot: this.currentSession?.localSlot,
      }, { critical: true });
      return;
    }

    if (message.type === "lockstepReadyAck") {
      this.onlineReadyAcknowledged = true;
      return;
    }

    if (message.type === "netcodeConfig") {
      this.setOnlineNetcodeConfig({
        inputDelayTicks: message.inputDelayTicks,
        rollbackWindow: message.rollbackWindow,
      }, false);
      if (Number.isInteger(message.effectiveTick)) {
        this.pendingInputDelayChange.effectiveTick = message.effectiveTick;
      }
      return;
    }

    if (message.type === "inputBundle" && this.gameState === "onlinePlaying") {
      this.processRemoteInputBundle(
        message.slot,
        message.inputs,
        Number(message.seq) || 0,
      );
      return;
    }

    if (message.type === "input" && this.gameState === "onlinePlaying") {
      this.processRemoteInputBundle(
        message.slot,
        [{ tick: Number(message.tick), input: message.input }],
        Number(message.seq) || 0,
      );
      return;
    }

    if (message.type === "pong" && Number.isFinite(Number(message.time))) {
      const rtt = Math.max(0, Date.now() - Number(message.time));
      this.onlineLastPongAt = Date.now();
      this.pingSamples.push(rtt);
      this.pingSamples = this.pingSamples.slice(-10);
      this.averagePing = Math.round(
        this.pingSamples.reduce((sum, sample) => sum + sample, 0) / this.pingSamples.length,
      );
      return;
    }

    if (message.type === "visibility") {
      this.remoteHidden = Boolean(message.hidden);
      this.addP2PLog(this.remoteHidden ? "Peer window hidden." : "Peer window visible.");
      this.updateNetworkStatus();
      this.syncOnlineDebugText();
      return;
    }

    if (message.type === "checksum" && this.gameState === "onlinePlaying") {
      this.receiveOnlineChecksum(message);
      return;
    }

    if (message.type === "state" || message.type === "roundEvent" || message.type === "matchEvent") {
      // Legacy host-authority messages are intentionally ignored in lockstep mode.
      return;
    }

    if (message.type === "matchStart") {
      this.addP2PLog("Received matchStart signal.");
    }
  }

  sendLockstepReady() {
    if (this.onlineReadySent || this.p2pChannelState !== "open") return;
    this.onlineReadySent = true;
    this.p2pService?.send({
      type: "lockstepReady",
      slot: this.currentSession?.localSlot,
      seed: this.onlineSeed,
    }, { critical: true });
  }

  sendOnlineState() {
    if (NETWORK_MODE !== "hostAuthority") return;
    if (this.onlineRole !== "host" || !this.p2pService || this.p2pChannelState !== "open") return;
    this.p2pService.send(this.createOnlineStateMessage(), { critical: false });
  }

  createOnlineStateMessage() {
    return {
      type: "state",
      tick: this.onlineTick,
      players: this.match.characters.map((character) => serializeCharacter(character)),
      combat: {
        hitboxes: this.match.combat.hitboxes.map(serializeBox),
        projectiles: this.match.combat.projectiles.map(serializeBox),
        hitEvents: this.match.combat.hitEvents.map((event) => ({ ...event })),
      },
      visualEvents: this.match.visualEvents.map((event) => ({ ...event })),
      round: {
        phase: this.onlinePhase,
        timer: this.roundTimer,
        roundNumber: this.roundNumber,
        roundWins: [...this.roundWins],
        roundWinner: this.roundWinner,
        matchWinner: this.matchWinner,
      },
    };
  }

  applyOnlineState(message) {
    if (!this.match) this.match = this.createOnlineMatch();
    for (const snapshot of message.players ?? []) {
      const character = this.match.characters[snapshot.playerIndex];
      if (!character) continue;
      applyCharacterSnapshot(character, snapshot);
    }
    this.match.combat.hitboxes = message.combat?.hitboxes ?? [];
    this.match.combat.projectiles = message.combat?.projectiles ?? [];
    this.match.combat.hitEvents = message.combat?.hitEvents ?? [];
    this.match.visualEvents = message.visualEvents ?? [];
    this.onlinePhase = message.round?.phase ?? this.onlinePhase;
    this.roundTimer = message.round?.timer ?? this.roundTimer;
    this.roundNumber = message.round?.roundNumber ?? this.roundNumber;
    this.roundWins = message.round?.roundWins ?? this.roundWins;
    this.roundWinner = message.round?.roundWinner ?? this.roundWinner;
    this.matchWinner = message.round?.matchWinner ?? this.matchWinner;
  }

  restartSameMatch() {
    if (this.isPracticeLikeMode()) {
      this.startPractice();
      return;
    }

    this.resetMatch();
    this.startRound();
  }

  returnToCharacterSelect() {
    if (this.isPracticeLikeMode()) {
      this.leavePractice();
      return;
    }

    this.match = null;
    this.gameState = "characterSelect";
    this.resetMatch();
    this.renderer.resetEffects();
    this.input.reset();
    this.renderCharacterSelect();
    this.syncUi();
  }

  resetGame() {
    this.restartSameMatch();
  }

  resetMatch() {
    this.roundWins = [0, 0];
    this.roundNumber = 1;
    this.roundTimer = ROUND_TIME_LIMIT;
    this.roundIntroTimer = 0;
    this.roundOverTimer = 0;
    this.roundWinner = null;
    this.matchWinner = null;
  }

  startRound() {
    this.resetPlayersForRound();
    this.roundTimer = ROUND_TIME_LIMIT;
    this.roundIntroTimer = ROUND_INTRO_DURATION;
    this.roundWinner = null;
    this.gameState = "roundIntro";
    this.input.reset();
    this.syncUi();
    this.renderer.resize();
  }

  resetPlayersForRound() {
    this.match = this.createMatch();
    this.renderer.resetEffects();
  }

  leavePractice() {
    this.match = null;
    this.renderer.resetEffects();
    this.input.reset();
    if (this.selectBackTarget === "roomLobby" && this.currentSession?.roomCode) {
      this.currentMode = null;
      this.selectionPhase = "character";
      this.currentSession.status = "lobby";
      this.gameState = "roomLobby";
      this.renderRoomLobby();
    } else {
      this.currentMode = null;
      this.gameState = "mainMenu";
    }
    this.resetMatch();
    this.syncUi();
  }

  endRound(winnerIndex) {
    this.roundWinner = winnerIndex;
    this.roundOverTimer = ROUND_OVER_DURATION;

    if (winnerIndex !== null) {
      this.roundWins[winnerIndex] += 1;
      if (this.roundWins[winnerIndex] >= MATCH_POINT) {
        this.endMatch(winnerIndex);
        return;
      }
      this.roundNumber += 1;
    }

    this.gameState = "roundOver";
    this.input.reset();
    this.syncUi();
  }

  endMatch(winnerIndex) {
    this.matchWinner = winnerIndex;
    this.gameState = "matchOver";
    if (this.currentSession) this.currentSession.status = "ended";
    this.input.reset();
    this.syncUi();
  }

  update(dt) {
    if (this.gameState === "mainMenu") {
      this.input.endFrame();
      return;
    }

    if (this.gameState === "matchmaking") {
      if (this.input.wasPressed("Escape")) {
        this.goToMainMenu();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "joinRoom") {
      if (this.input.wasPressed("Escape")) {
        this.goToMainMenu();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "roomLobby") {
      if (this.input.wasPressed("Escape")) {
        this.leaveCurrentRoom();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "characterSelect") {
      if (this.input.wasPressed("Escape")) {
        this.leaveCharacterSelect();
      }
      if (this.currentMode === "pvpMatchmaking") {
        this.pickTimer = Math.max(0, this.pickTimer - dt);
        this.updatePickTimerText();
        if (this.pickTimer === 0) {
          this.lockPvpPick();
        }
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "mapSelect") {
      if (this.input.wasPressed("Escape")) {
        this.leaveCharacterSelect();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "preMatchPreview") {
      this.preMatchPreviewTimer = this.currentMode === "pvpRoom"
        ? this.getOnlinePreviewRemaining()
        : Math.max(0, this.preMatchPreviewTimer - dt);
      this.renderPreMatchPreview();
      if (this.preMatchPreviewTimer === 0) {
        if (this.currentMode === "pvpRoom") {
          this.finishOnlinePreview();
          this.input.endFrame();
          return;
        }
        this.startGameFromSelection();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "onlineBattleReady") {
      if (this.input.wasPressed("Escape")) {
        this.returnOnlineRoomToLobby();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "onlineConnectionLost") {
      if (this.input.wasPressed("Escape")) {
        this.returnOnlineRoomToLobby();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "onlinePlaying") {
      if (this.input.wasPressed("Escape") && this.onlinePhase === "matchOver") {
        this.returnOnlineRoomToLobby();
        this.input.endFrame();
        return;
      }
      this.updateOnlineBattle(dt);
      this.input.endFrame();
      return;
    }

    if (this.gameState === "matchOver") {
      if (this.input.wasPressed("KeyR")) {
        this.restartSameMatch();
        this.input.endFrame();
        return;
      }
      if (this.input.wasPressed("Escape")) {
        this.returnToCharacterSelect();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "roundIntro") {
      this.roundIntroTimer = Math.max(0, this.roundIntroTimer - dt);
      if (this.roundIntroTimer === 0) {
        this.gameState = "playing";
        this.syncUi();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState === "roundOver") {
      this.roundOverTimer = Math.max(0, this.roundOverTimer - dt);
      if (this.roundOverTimer === 0) {
        this.startRound();
      }
      this.input.endFrame();
      return;
    }

    if (this.gameState !== "playing") {
      this.input.endFrame();
      return;
    }

    if (this.isPracticeLikeMode()) {
      if (this.input.wasPressed("KeyR")) {
        this.startPractice();
        this.input.endFrame();
        return;
      }
      if (this.input.wasPressed("Escape")) {
        this.leavePractice();
        this.input.endFrame();
        return;
      }

      this.match.update(dt, this.input);
      this.input.endFrame();
      return;
    }

    this.roundTimer = Math.max(0, this.roundTimer - dt);
    this.match.update(dt, this.input);
    if (this.match.winner) {
      this.endRound(this.getWinnerIndex(this.match.winner));
      this.input.endFrame();
      return;
    }

    if (this.roundTimer === 0) {
      this.endRound(this.resolveTimerWinner());
    }
    this.input.endFrame();
  }

  render() {
    if (this.gameState === "characterSelect" || !this.match) return;
    this.renderer.render({
      ...this.match.getState(),
      matchInfo: this.getMatchInfo(),
    });
  }

  getWinnerIndex(winner) {
    return this.match.characters.indexOf(winner);
  }

  resolveTimerWinner() {
    const [p1, p2] = this.match.characters;
    if (p1.health > p2.health) return 0;
    if (p2.health > p1.health) return 1;
    return null;
  }

  getMatchInfo() {
    return {
      gameState: this.gameState,
      mode: this.gameState === "onlinePlaying" || this.gameState === "onlineConnectionLost"
        ? "online"
        : this.currentMode,
      roundWins: this.roundWins,
      roundNumber: this.roundNumber,
      roundTimer: this.isPracticeLikeMode() ? null : this.roundTimer,
      roundWinner: this.roundWinner,
      matchWinner: this.matchWinner,
      localPlayerIndex:
        this.currentSession?.localSlot === "p2"
          ? 1
          : 0,
      centerText: this.getCenterText(),
      statusText: this.getStatusText(),
    };
  }

  getCenterText() {
    if (this.gameState === "onlineConnectionLost") {
      return "Connection Lost";
    }

    if (this.gameState === "onlinePlaying") {
      if (this.onlinePhase === "roundOver") {
        return this.roundWinner === null
          ? "Draw Round"
          : `P${this.roundWinner + 1} Wins Round`;
      }
      if (this.onlinePhase === "matchOver") {
        return this.matchWinner === null ? "" : `P${this.matchWinner + 1} Wins Match`;
      }
    }

    if (this.gameState === "roundIntro") {
      if (this.roundIntroTimer > 3.6) return `Round ${this.roundNumber}`;
      if (this.roundIntroTimer > 2.7) return "3";
      if (this.roundIntroTimer > 1.8) return "2";
      if (this.roundIntroTimer > 0.9) return "1";
      return "FIGHT!";
    }

    if (this.gameState === "roundOver") {
      return this.roundWinner === null
        ? "Draw Round"
        : `P${this.roundWinner + 1} Wins Round`;
    }

    if (this.gameState === "matchOver") {
      if (this.matchWinner === null) return "";
      return `P${this.matchWinner + 1} Wins Match`;
    }

    return "";
  }

  getStatusText() {
    if (this.gameState === "onlineConnectionLost") return "Connection Lost";
    if (this.gameState === "onlinePlaying") {
      if (this.onlinePhase === "roundOver") return "Next Round";
      if (this.onlinePhase === "matchOver") return "Match Over";
      return "Online Mode / Local-first Rollback";
    }
    if (this.isPracticeLikeMode() && this.gameState === "playing") {
      return "Practice Mode";
    }
    if (this.gameState === "roundIntro") return "Get Ready";
    if (this.gameState === "playing") return "FIGHT!";
    if (this.gameState === "roundOver") {
      return this.roundWinner === null ? "Round Restart" : "Next Round";
    }
    if (this.gameState === "matchOver") return "Match Over";
    return "";
  }

  renderCharacterSelect() {
    const isMapPhase = this.selectionPhase === "map";
    const isPvpPick = this.currentMode === "pvpMatchmaking";
    const isRoom = this.currentMode === "room";
    const isPracticeLike = this.isPracticeLikeMode();
    const isOnlinePvpRoom = this.isOnlinePvpRoom();
    const localSlot = this.currentSession?.localSlot ?? "p1";
    const p1Player = this.getPlayerBySlot("p1");
    const p2Player = this.getPlayerBySlot("p2");

    this.ui.characterSelectTitle.textContent = this.getSelectionTitle();
    this.ui.characterSelectSubtitle.textContent = this.getSelectionSubtitle();
    this.ui.selectionStatusText.textContent = this.getSelectionStatus();
    this.ui.selectionOptionsTitle.textContent = isMapPhase ? "Choose Map" : "Choose Character";
    this.ui.pickTimerText.classList.toggle("hidden", !isPvpPick || isMapPhase);
    if (isPvpPick) this.updatePickTimerText();

    this.renderFighterPreview(this.ui.p1PreviewPanel, {
      label: "P1",
      characterId: isOnlinePvpRoom ? p1Player?.characterId : this.selectedP1Character,
      placeholderName: "Choosing...",
      note: isOnlinePvpRoom
        ? `${p1Player?.name ?? "Player 1"}${p1Player?.locked ? " / Locked" : ""}${localSlot === "p1" ? " / You" : ""}`
        : "Your Fighter",
    });

    if (isOnlinePvpRoom) {
      this.renderFighterPreview(this.ui.p2PreviewPanel, {
        label: "P2",
        characterId: p2Player?.characterId,
        placeholderName: p2Player ? "Choosing..." : "Waiting Player",
        note: p2Player
          ? `${p2Player.name}${p2Player.locked ? " / Locked" : ""}${localSlot === "p2" ? " / You" : ""}`
          : "Waiting for guest",
      });
    } else if (isPracticeLike) {
      this.renderFighterPreview(this.ui.p2PreviewPanel, {
        label: "P2",
        placeholderName: isRoom ? "Training Dummy" : "Training Dummy",
        note: isRoom ? "Room practice target" : "Practice target",
      });
    } else if (isPvpPick) {
      this.renderFighterPreview(this.ui.p2PreviewPanel, {
        label: "P2",
        placeholderName: "Opponent",
        note: "Will lock after pick timer",
      });
    } else {
      this.renderFighterPreview(this.ui.p2PreviewPanel, {
        label: "P2",
        characterId: this.selectedP2Character,
        note: "Opponent",
      });
    }

    this.ui.characterCards.classList.toggle("hidden", isMapPhase);
    this.ui.mapCards.classList.toggle("hidden", !isMapPhase);
    this.ui.confirmCharacterButton.classList.toggle("hidden", isMapPhase || isPvpPick);
    this.ui.startMatchButton.classList.toggle("hidden", !isMapPhase);
    this.ui.confirmCharacterButton.textContent = isOnlinePvpRoom ? "Lock In" : "Confirm Character";
    if (isOnlinePvpRoom && !isMapPhase) {
      const localPlayer = this.getPlayerBySlot(localSlot);
      this.ui.confirmCharacterButton.disabled = Boolean(localPlayer?.locked || !localPlayer?.characterId);
    } else {
      this.ui.confirmCharacterButton.disabled = false;
    }

    this.ui.startMatchButton.textContent = this.getSelectionActionText();
    this.ui.startMatchButton.disabled = this.isSelectionActionDisabled();

    if (isMapPhase) {
      this.renderMapCards();
    } else {
      const selectedId = isOnlinePvpRoom
        ? this.getPlayerBySlot(localSlot)?.characterId
        : this.selectedP1Character;
      this.renderCharacterCards(this.ui.characterCards, selectedId, localSlot);
    }
  }

  getSelectionTitle() {
    if (this.currentMode === "pvpRoom") return "1v1 PVP Room";
    if (this.currentMode === "pvpMatchmaking") return "1v1 PVP Pick";
    if (this.currentMode === "room") return "Room Practice";
    if (this.currentMode === "practice") return "Practice Mode";
    return "BAC World";
  }

  getSelectionSubtitle() {
    if (this.currentMode === "pvpRoom") {
      return "Choose and lock your fighter. Host selects the map after both players lock.";
    }
    if (this.currentMode === "pvpMatchmaking") {
      return "Pick your fighter. The map will be selected randomly.";
    }
    if (this.currentMode === "room") {
      return "Choose your fighter and map for this room.";
    }
    if (this.currentMode === "practice") {
      return "Choose your fighter and test abilities against a training dummy.";
    }
    return "Choose fighters for the offline 1v1 prototype.";
  }

  getSelectionStatus() {
    if (this.selectionNotice) return this.selectionNotice;
    if (this.currentMode === "pvpRoom") {
      if (this.selectionPhase === "map") {
        if (!this.currentSession?.selectedMapId) {
          return this.isLocalHost()
            ? "Both fighters locked. Select a map."
            : "Host is selecting the map.";
        }
        const localPlayer = this.getPlayerBySlot(this.currentSession?.localSlot);
        if (!localPlayer?.ready) return "Map selected. Press Ready.";
        if (this.isLocalHost()) {
          const blockReason = this.getOnlineStartBlockReason();
          if (blockReason) return blockReason;
        }
        if (this.isLocalHost()) return "Both players ready. Start Preview.";
        if (!this.areBothPlayersReady()) return "Ready. Waiting for the other player.";
        return "Waiting for Host to start.";
      }
      const localPlayer = this.getPlayerBySlot(this.currentSession?.localSlot);
      if (localPlayer?.locked) return "Locked in. Waiting for the other player.";
      return "Choose your character, then lock in.";
    }
    if (this.currentMode === "pvpMatchmaking") return "Map selection is automatic.";
    if (this.selectionPhase === "map") return "Character locked. Choose a map.";
    return "Choose a character, then confirm.";
  }

  getSelectionActionText() {
    if (this.currentMode === "pvpRoom") {
      const localPlayer = this.getPlayerBySlot(this.currentSession?.localSlot);
      if (!localPlayer?.ready) return "Ready";
      if (this.isLocalHost() && this.p2pChannelState !== "open") return "Connect P2P";
      if (this.isLocalHost()) return "Start Preview";
      return "Waiting for Host";
    }
    return this.currentMode === "room" ? "Start Game" : "Start Practice";
  }

  isSelectionActionDisabled() {
    if (this.currentMode !== "pvpRoom") return false;
    const localPlayer = this.getPlayerBySlot(this.currentSession.localSlot);
    if (!localPlayer?.ready) return false;
    if (!this.isLocalHost()) return true;
    const blockReason = this.getOnlineStartBlockReason();
    return Boolean(blockReason && blockReason !== "P2P not connected.");
  }

  renderFighterPreview(container, { label, characterId, placeholderName, note }) {
    container.replaceChildren();
    container.classList.toggle("waiting", !characterId);

    const character = characterId ? CHARACTERS[characterId] : null;
    const preview = document.createElement("span");
    preview.className = "fighter-preview-box";
    preview.style.backgroundColor = character ? character.color : "rgba(255,255,255,0.08)";

    const info = document.createElement("div");
    info.className = "fighter-preview-info";

    const labelText = document.createElement("p");
    labelText.textContent = label;
    const title = document.createElement("h2");
    title.textContent = character ? character.name : placeholderName;
    const stats = document.createElement("dl");
    stats.className = "fighter-preview-stats";

    const rows = character
      ? this.getCharacterStatRows(character)
      : [
          ["HP", "-"],
          ["Stamina", "-"],
          ["Speed", "-"],
          ["Jump", "-"],
          ["J", "-"],
          ["K", "-"],
          ["L", "-"],
        ];

    for (const [statLabel, value] of rows) {
      const item = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = statLabel;
      dd.textContent = value;
      item.append(dt, dd);
      stats.append(item);
    }

    const noteText = document.createElement("p");
    noteText.textContent = note;

    info.append(labelText, title, stats, noteText);
    container.append(preview, info);
  }

  getCharacterStatRows(character) {
    const basicAttack = ABILITIES[character.abilities.basicAttack];
    const movementSkill = ABILITIES[character.abilities.movementSkill];
    const skill = ABILITIES[character.abilities.skill1];
    const skill2 = ABILITIES[character.abilities.skill2];
    const extra = ABILITIES[character.abilities.extra];
    const special = ABILITIES[character.abilities.special];
    const rows = [
      ["HP", character.stats.maxHp],
      ["Stamina", character.stats.maxStamina],
      ["Speed", character.stats.moveSpeed],
      ["Jump", character.stats.jumpPower],
      [character.actionInputs?.basicAttack ?? "J", basicAttack ? basicAttack.name : "None"],
    ];
    if (movementSkill) {
      rows.push([
        character.actionInputs?.movementSkill ?? "Shift",
        movementSkill.name,
      ]);
    }
    rows.push(
      [character.actionInputs?.skill1 ?? "K", skill ? skill.name : "None"],
      [character.actionInputs?.skill2 ?? "L", skill2 ? skill2.name : "None"],
    );
    if (extra) rows.push([character.actionInputs?.extra ?? ";", extra.name]);
    if (special) {
      rows.push([character.actionInputs?.special ?? "N", special.name]);
    }
    return rows;
  }

  renderCharacterCards(container, selectedId, targetSlot = "p1") {
    container.replaceChildren();
    const onlineLocked = this.isOnlinePvpRoom() && !this.canLocalEditSlot(targetSlot);
    for (const character of Object.values(CHARACTERS)) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `character-card${character.id === selectedId ? " selected" : ""}`;
      card.disabled = onlineLocked;
      card.addEventListener("click", () => {
        if (onlineLocked) return;
        this.selectionNotice = "";
        if (targetSlot === "p1") {
          this.selectedP1Character = character.id;
        } else if (targetSlot === "p2") {
          this.selectedP2Character = character.id;
        }
        this.updatePlayerSelection(targetSlot, character.id);
        this.renderCharacterSelect();
      });

      const preview = document.createElement("span");
      preview.className = "character-preview";
      preview.style.backgroundColor = character.color;

      const body = document.createElement("span");
      const title = document.createElement("h3");
      title.textContent = character.name;
      const description = document.createElement("p");
      description.textContent = character.description ?? "";
      const stats = document.createElement("dl");
      stats.className = "character-stats";
      for (const [label, value] of this.getCharacterStatRows(character)) {
        const item = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value;
        item.append(dt, dd);
        stats.append(item);
      }
      body.append(title);
      if (character.description) body.append(description);
      body.append(stats);
      card.append(preview, body);
      container.append(card);
    }
  }

  renderMapCards() {
    this.ui.mapCards.replaceChildren();
    for (const map of Object.values(MAPS)) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `map-card${map.id === this.selectedMapId ? " selected" : ""}`;
      card.disabled = this.isOnlinePvpRoom() && !this.isLocalHost();
      card.addEventListener("click", () => {
        if (this.isOnlinePvpRoom() && !this.isLocalHost()) return;
        this.selectionNotice = "";
        this.setSelectedMap(map.id);
        this.renderCharacterSelect();
      });

      const title = document.createElement("h3");
      title.textContent = map.name;
      const description = document.createElement("p");
      description.textContent = map.description;
      const swatch = document.createElement("span");
      swatch.className = "map-swatch";
      swatch.style.backgroundColor = map.backgroundColor;
      card.append(swatch, title, description);
      this.ui.mapCards.append(card);
    }
  }

  syncUi() {
    const isMainMenu = this.gameState === "mainMenu";
    const isMatchmaking = this.gameState === "matchmaking";
    const isJoinRoom = this.gameState === "joinRoom";
    const isRoomLobby = this.gameState === "roomLobby";
    const isSelecting = this.gameState === "characterSelect" || this.gameState === "mapSelect";
    const isPreview = this.gameState === "preMatchPreview";
    const isOnlineBattleReady = this.gameState === "onlineBattleReady";
    const isInMatch =
      this.gameState === "roundIntro" ||
      this.gameState === "playing" ||
      this.gameState === "roundOver" ||
      this.gameState === "matchOver" ||
      this.gameState === "onlinePlaying" ||
      this.gameState === "onlineConnectionLost";
    this.ui.mainMenu.classList.toggle("hidden", !isMainMenu);
    this.ui.matchmakingScreen.classList.toggle("hidden", !isMatchmaking);
    this.ui.joinRoomScreen.classList.toggle("hidden", !isJoinRoom);
    this.ui.roomLobby.classList.toggle("hidden", !isRoomLobby);
    this.ui.characterSelect.classList.toggle("hidden", !isSelecting);
    this.ui.preMatchPreview.classList.toggle("hidden", !isPreview);
    this.ui.onlineBattleReady.classList.toggle("hidden", !isOnlineBattleReady);
    this.ui.gameStage.classList.toggle("hidden", !isInMatch);
    this.ui.controlsPanel.classList.add("hidden");
    this.ui.gameOverActions.classList.add("hidden");
    this.ui.onlineDebugPanel.classList.toggle(
      "hidden",
      this.gameState !== "onlinePlaying" && this.gameState !== "onlineConnectionLost",
    );
    this.renderNetworkStatus();
    this.syncOnlineDebugText();
  }

  syncOnlineDebugText() {
    if (!this.ui.onlineDebugText) return;
    const pingText = this.averagePing === null
      ? "-"
      : `${this.averagePing}ms${this.averagePing >= 120 ? " HIGH" : ""}`;
    const metrics = this.p2pMetrics;
    const bufferedAmount = metrics?.bufferedAmount ?? this.p2pService?.getBufferedAmount?.() ?? 0;
    const lastPacketAt = Math.max(this.onlineLastPacketAt || 0, metrics?.lastPacketAt || 0);
    const lastPacketAgo = lastPacketAt ? `${Date.now() - lastPacketAt}ms` : "-";
    const focusText = this.windowHasFocus ? "focused" : "blurred";
    this.ui.onlineDebugText.textContent =
      `Netcode: Rollback / Network: ${this.onlineNetworkStatus} / Role: ${this.onlineRole ?? "-"} / ` +
      `Slot: ${this.currentSession?.localSlot ?? "-"} / ` +
      `Tick: ${this.onlineTick} / Delay: ${this.onlineInputDelayTicks} / ` +
      `Window: ${this.onlineRollbackWindow} / ` +
      `Last Rollback: ${this.lastRollbackTick ?? "-"} / ` +
      `Rollbacks: ${this.rollbackCount} / Misses: ${this.predictionMissCount} / ` +
      `Sent: ${this.onlineLastSentInputTick} / ` +
      `Recv P1: ${this.onlineLastReceivedInputTicks.p1} / ` +
      `Recv P2: ${this.onlineLastReceivedInputTicks.p2} / ` +
      `Bundle: ${this.onlineInputBundleSize} / Ping: ${pingText} / Miss: ${this.heartbeatMissCount} / ` +
      `Predicted: ${this.predictedInputTicks} / Status: ${this.networkStatus.level} / ` +
      `LastPacket: ${lastPacketAgo} / LocalHidden: ${this.localHidden} / RemoteHidden: ${this.remoteHidden} / ` +
      `Focus: ${focusText} / DataChannel: ${this.p2pChannelState} / ` +
      `PC: ${metrics?.connectionState ?? "-"} / ICE: ${metrics?.iceConnectionState ?? "-"} / ` +
      `Buffer: ${formatBytes(bufferedAmount)}${bufferedAmount >= NETWORK_BUFFER_WARNING_AMOUNT ? " HIGH" : ""} / ` +
      `Sync: ${this.desyncStatus} / Phase: ${this.onlinePhase}`;
    const settingsDisabled = this.gameState !== "onlinePlaying" || this.onlineRole !== "host";
    this.ui.onlineInputDelaySelect.disabled = settingsDisabled;
    this.ui.onlineRollbackWindowSelect.disabled = settingsDisabled;
    this.ui.onlineDebugPanel.classList.toggle("debug-hidden", !this.showNetworkDebug);
    this.ui.rollbackLogList.replaceChildren();
    for (const entry of this.rollbackLogs.slice(0, 8)) {
      const item = document.createElement("li");
      const reason = entry.reason
        ? `${entry.reason.slot}: ${formatInputSummary(entry.reason.predicted)} -> ` +
          `${formatInputSummary(entry.reason.actual)}`
        : "input mismatch";
      item.textContent =
        `Tick ${entry.tick}: restored ${entry.restoredTick}, resimulated to ${entry.endTick} (${reason})`;
      this.ui.rollbackLogList.append(item);
    }
  }

}

function createEmptyOnlineInput() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false,
    skill1: false,
    skill2: false,
    movementSkill: false,
    extra: false,
    special: false,
  };
}

function createOnlineInputBuffer() {
  return {
    p1: new Map(),
    p2: new Map(),
  };
}

function createOnlineLastKnownInput() {
  return {
    p1: createEmptyOnlineInput(),
    p2: createEmptyOnlineInput(),
  };
}

function toEpochMilliseconds(value) {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.seconds === "number") {
    return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1000000);
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeOnlineInput(input = {}) {
  return {
    left: Boolean(input.left),
    right: Boolean(input.right),
    up: Boolean(input.up),
    down: Boolean(input.down),
    attack: Boolean(input.attack),
    skill1: Boolean(input.skill1),
    skill2: Boolean(input.skill2),
    movementSkill: Boolean(input.movementSkill),
    extra: Boolean(input.extra),
    special: Boolean(input.special),
  };
}

class OnlineVirtualInput {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
  }

  setInputs(p1Input, p2Input) {
    const next = new Set();
    addMappedInput(next, normalizeOnlineInput(p1Input), ONLINE_P1_CONTROLS);
    addMappedInput(next, normalizeOnlineInput(p2Input), ONLINE_P2_CONTROLS);

    this.pressed.clear();
    for (const code of next) {
      if (!this.down.has(code)) this.pressed.add(code);
    }
    this.down = next;
  }

  isDown(code) {
    return this.down.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  reset() {
    this.down.clear();
    this.pressed.clear();
  }

  createSnapshot() {
    return {
      down: [...this.down],
      pressed: [...this.pressed],
    };
  }

  restoreSnapshot(snapshot = {}) {
    this.down = new Set(snapshot.down ?? []);
    this.pressed = new Set(snapshot.pressed ?? []);
  }
}

function addMappedInput(target, input, controls) {
  if (input.left) target.add(controls.left);
  if (input.right) target.add(controls.right);
  if (input.up) target.add(controls.jump);
  if (input.down) target.add(controls.drop);
  if (input.attack) target.add(controls.attack);
  if (input.skill1) target.add(controls.skill1);
  if (input.skill2) target.add(controls.skill2);
  if (input.movementSkill && controls.movementSkill) target.add(controls.movementSkill);
  if (input.extra && controls.extra) target.add(controls.extra);
  if (input.special && controls.special) target.add(controls.special);
}

function cloneOnlineInput(input = {}) {
  return normalizeOnlineInput(input);
}

function inputsEqual(a, b) {
  const left = normalizeOnlineInput(a);
  const right = normalizeOnlineInput(b);
  return (
    left.left === right.left &&
    left.right === right.right &&
    left.up === right.up &&
    left.down === right.down &&
    left.attack === right.attack &&
    left.skill1 === right.skill1 &&
    left.skill2 === right.skill2 &&
    left.movementSkill === right.movementSkill &&
    left.extra === right.extra &&
    left.special === right.special
  );
}

function getControlsForCharacter(baseControls, characterId) {
  if (characterId === "fylang_character" || characterId === "hai_ht2") {
    return {
      ...baseControls,
      special: "Space",
    };
  }
  if (characterId === "inquisitor") {
    return {
      ...baseControls,
      extra: "KeyB",
      special: "KeyN",
      movementSkill: baseControls.movementSkill ?? "ShiftLeft",
    };
  }
  return { ...baseControls };
}

function formatInputSummary(input) {
  const normalized = normalizeOnlineInput(input);
  const active = Object.entries(normalized)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
  return active.length > 0 ? active.join("+") : "neutral";
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB`;
  if (value >= 1024) return `${Math.round(value / 1024)}KB`;
  return `${value}B`;
}

function serializeCharacter(character) {
  return {
    id: character.id,
    label: character.label,
    color: character.color,
    x: character.x,
    y: character.y,
    vx: character.vx,
    vy: character.vy,
    w: character.w,
    h: character.h,
    facing: character.facing,
    playerIndex: character.playerIndex,
    health: character.health,
    maxHealth: character.maxHealth,
    stamina: character.stamina,
    maxStamina: character.maxStamina,
    cooldowns: { ...character.cooldowns },
    cooldownTicks: { ...character.cooldownTicks },
    buffs: clonePlainObject(character.buffs),
    activeStatuses: clonePlainObject(character.activeStatuses),
    hitStun: character.hitStun,
    hitFlash: character.hitFlash,
    attackFlash: character.attackFlash,
    skillFlash: character.skillFlash,
    guardFlash: character.guardFlash,
    weaponFlash: character.weaponFlash,
    staminaFlash: character.staminaFlash,
    castLockTicks: character.castLockTicks,
    invincibleTicks: character.invincibleTicks,
    hurtboxDisabledTicks: character.hurtboxDisabledTicks,
    dashStopOnEnd: character.dashStopOnEnd,
    actionWeaponVisualId: character.actionWeaponVisualId,
    actionWeaponVisualTicks: character.actionWeaponVisualTicks,
    abilities: { ...character.abilities },
    actionInputs: { ...(character.actionInputs ?? {}) },
    defaultWeaponId: character.defaultWeaponId,
    passiveWeaponIds: [...(character.passiveWeaponIds ?? [])],
    currentStanceMode: character.currentStanceMode,
    currentStanceIndicatorId: character.currentStanceIndicatorId,
    modeSwapBonusBasicAttackReady: character.modeSwapBonusBasicAttackReady,
    modeSwapBonusActionId: character.modeSwapBonusActionId,
    modeSwapBonusDamage: character.modeSwapBonusDamage,
    decoration: character.decoration ? { ...character.decoration } : null,
  };
}

function applyCharacterSnapshot(character, snapshot) {
  character.x = snapshot.x;
  character.y = snapshot.y;
  character.vx = snapshot.vx;
  character.vy = snapshot.vy;
  character.facing = snapshot.facing;
  character.health = snapshot.health;
  character.maxHealth = snapshot.maxHealth;
  character.stamina = snapshot.stamina;
  character.maxStamina = snapshot.maxStamina;
  character.cooldowns = { ...(snapshot.cooldowns ?? {}) };
  character.cooldownTicks = { ...(snapshot.cooldownTicks ?? {}) };
  character.buffs = clonePlainObject(snapshot.buffs ?? {});
  character.activeStatuses = clonePlainObject(snapshot.activeStatuses ?? {});
  character.hitStun = snapshot.hitStun ?? 0;
  character.hitFlash = snapshot.hitFlash ?? 0;
  character.attackFlash = snapshot.attackFlash ?? 0;
  character.skillFlash = snapshot.skillFlash ?? 0;
  character.guardFlash = snapshot.guardFlash ?? 0;
  character.weaponFlash = snapshot.weaponFlash ?? 0;
  character.staminaFlash = snapshot.staminaFlash ?? 0;
  character.castLockTicks = snapshot.castLockTicks ?? 0;
  character.invincibleTicks = snapshot.invincibleTicks ?? 0;
  character.hurtboxDisabledTicks = snapshot.hurtboxDisabledTicks ?? 0;
  character.dashStopOnEnd = Boolean(snapshot.dashStopOnEnd);
  character.actionWeaponVisualId = snapshot.actionWeaponVisualId ?? null;
  character.actionWeaponVisualTicks = snapshot.actionWeaponVisualTicks ?? 0;
  character.abilities = { ...(snapshot.abilities ?? character.abilities) };
  character.actionInputs = { ...(snapshot.actionInputs ?? character.actionInputs) };
  character.defaultWeaponId = snapshot.defaultWeaponId ?? character.defaultWeaponId;
  character.passiveWeaponIds = [...(snapshot.passiveWeaponIds ?? character.passiveWeaponIds ?? [])];
  character.currentStanceMode = snapshot.currentStanceMode ?? character.currentStanceMode;
  character.currentStanceIndicatorId =
    snapshot.currentStanceIndicatorId ?? character.currentStanceIndicatorId;
  character.modeSwapBonusBasicAttackReady = Boolean(
    snapshot.modeSwapBonusBasicAttackReady,
  );
  character.modeSwapBonusActionId = snapshot.modeSwapBonusActionId ?? null;
  character.modeSwapBonusDamage = snapshot.modeSwapBonusDamage ?? 0;
}

function serializeBox(box) {
  return {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    vx: box.vx ?? 0,
    vy: box.vy ?? 0,
    life: box.life,
    remaining: box.remaining,
    type: box.type,
    abilityId: box.abilityId,
    effectType: box.effectType,
    screenShake: box.screenShake,
  };
}

function serializeCharacterSnapshot(character, map) {
  return {
    x: character.x,
    y: character.y,
    vx: character.vx,
    vy: character.vy,
    facing: character.facing,
    health: character.health,
    stamina: character.stamina,
    staminaRegenTimer: character.staminaRegenTimer,
    staminaFlash: character.staminaFlash,
    cooldowns: { ...character.cooldowns },
    cooldownTicks: { ...character.cooldownTicks },
    buffs: clonePlainObject(character.buffs),
    activeStatuses: clonePlainObject(character.activeStatuses),
    pendingAbility: character.pendingAbility ? { ...character.pendingAbility } : null,
    castLockTicks: character.castLockTicks,
    invincibleTicks: character.invincibleTicks,
    hurtboxDisabledTicks: character.hurtboxDisabledTicks,
    onGround: character.onGround,
    groundPlatformIndex: character.groundPlatform
      ? map.platforms.indexOf(character.groundPlatform)
      : null,
    dropTimer: character.dropTimer,
    dashTimer: character.dashTimer,
    dashTicks: character.dashTicks,
    dashStopOnEnd: character.dashStopOnEnd,
    actionWeaponVisualId: character.actionWeaponVisualId,
    actionWeaponVisualTicks: character.actionWeaponVisualTicks,
    abilities: { ...character.abilities },
    defaultWeaponId: character.defaultWeaponId,
    passiveWeaponIds: [...(character.passiveWeaponIds ?? [])],
    currentStanceMode: character.currentStanceMode,
    currentStanceIndicatorId: character.currentStanceIndicatorId,
    modeSwapBonusBasicAttackReady: character.modeSwapBonusBasicAttackReady,
    modeSwapBonusActionId: character.modeSwapBonusActionId,
    modeSwapBonusDamage: character.modeSwapBonusDamage,
    hitStun: character.hitStun,
    hitFlash: character.hitFlash,
    attackFlash: character.attackFlash,
    skillFlash: character.skillFlash,
    guardFlash: character.guardFlash,
    weaponFlash: character.weaponFlash,
  };
}

function restoreCharacterSnapshot(character, snapshot, map) {
  character.x = snapshot.x;
  character.y = snapshot.y;
  character.vx = snapshot.vx;
  character.vy = snapshot.vy;
  character.facing = snapshot.facing;
  character.health = snapshot.health;
  character.stamina = snapshot.stamina;
  character.staminaRegenTimer = snapshot.staminaRegenTimer;
  character.staminaFlash = snapshot.staminaFlash;
  character.cooldowns = { ...(snapshot.cooldowns ?? {}) };
  character.cooldownTicks = { ...(snapshot.cooldownTicks ?? {}) };
  character.buffs = clonePlainObject(snapshot.buffs);
  character.activeStatuses = clonePlainObject(snapshot.activeStatuses);
  character.pendingAbility = snapshot.pendingAbility ? { ...snapshot.pendingAbility } : null;
  character.castLockTicks = snapshot.castLockTicks ?? 0;
  character.invincibleTicks = snapshot.invincibleTicks ?? 0;
  character.hurtboxDisabledTicks = snapshot.hurtboxDisabledTicks ?? 0;
  character.onGround = Boolean(snapshot.onGround);
  character.groundPlatform =
    Number.isInteger(snapshot.groundPlatformIndex) ? map.platforms[snapshot.groundPlatformIndex] : null;
  character.dropTimer = snapshot.dropTimer;
  character.dashTimer = snapshot.dashTimer;
  character.dashTicks = snapshot.dashTicks ?? 0;
  character.dashStopOnEnd = Boolean(snapshot.dashStopOnEnd);
  character.actionWeaponVisualId = snapshot.actionWeaponVisualId ?? null;
  character.actionWeaponVisualTicks = snapshot.actionWeaponVisualTicks ?? 0;
  character.abilities = { ...(snapshot.abilities ?? character.abilities) };
  character.defaultWeaponId = snapshot.defaultWeaponId ?? character.defaultWeaponId;
  character.passiveWeaponIds = [...(snapshot.passiveWeaponIds ?? character.passiveWeaponIds ?? [])];
  character.currentStanceMode = snapshot.currentStanceMode ?? character.currentStanceMode;
  character.currentStanceIndicatorId =
    snapshot.currentStanceIndicatorId ?? character.currentStanceIndicatorId;
  character.modeSwapBonusBasicAttackReady = Boolean(
    snapshot.modeSwapBonusBasicAttackReady,
  );
  character.modeSwapBonusActionId = snapshot.modeSwapBonusActionId ?? null;
  character.modeSwapBonusDamage = snapshot.modeSwapBonusDamage ?? 0;
  character.hitStun = snapshot.hitStun;
  character.hitFlash = snapshot.hitFlash;
  character.attackFlash = snapshot.attackFlash;
  character.skillFlash = snapshot.skillFlash;
  character.guardFlash = snapshot.guardFlash;
  character.weaponFlash = snapshot.weaponFlash;
}

function serializeCombatSnapshot(entity, characters) {
  const ownerIndex = characters.indexOf(entity.owner);
  return {
    ...copyCombatFields(entity),
    ownerIndex,
    hitTargetIds: [...(entity.hitTargetIds ?? [])],
    lastDamageTickEntries: [
      ...(entity.lastDamageTickByTargetId ?? new Map()).entries(),
    ],
  };
}

function restoreCombatSnapshot(snapshot, characters, sharedHitTargetSets = new Map()) {
  const setKey = snapshot.attackInstanceId ?? snapshot.id;
  let hitTargetIds = setKey ? sharedHitTargetSets.get(setKey) : null;
  if (!hitTargetIds) {
    hitTargetIds = new Set(snapshot.hitTargetIds ?? []);
    if (setKey) sharedHitTargetSets.set(setKey, hitTargetIds);
  }
  return {
    ...copyCombatFields(snapshot),
    owner: characters[snapshot.ownerIndex] ?? null,
    hitTargetIds,
    lastDamageTickByTargetId: new Map(
      snapshot.lastDamageTickEntries ?? [],
    ),
  };
}

function copyCombatFields(entity) {
  return {
    id: entity.id,
    attackInstanceId: entity.attackInstanceId,
    abilityId: entity.abilityId,
    type: entity.type,
    x: entity.x,
    y: entity.y,
    w: entity.w,
    h: entity.h,
    vx: entity.vx ?? 0,
    vy: entity.vy ?? 0,
    damage: entity.damage,
    knockback: entity.knockback ? { ...entity.knockback } : null,
    knockbackMode: entity.knockbackMode,
    life: entity.life,
    lifeTicks: entity.lifeTicks,
    remaining: entity.remaining,
    remainingTicks: entity.remainingTicks,
    duration: entity.duration,
    durationTicks: entity.durationTicks,
    tickRate: entity.tickRate,
    stun: entity.stun,
    effectType: entity.effectType,
    screenShake: entity.screenShake,
    destroyOnHit: entity.destroyOnHit,
    destroyOnWall: entity.destroyOnWall,
    pierce: entity.pierce,
    speed: entity.speed,
    homing: entity.homing ? { ...entity.homing } : null,
    homingActive: entity.homingActive,
    hasReleasedHoming: entity.hasReleasedHoming,
    lockedTargetId: entity.lockedTargetId,
    projectileColor: entity.projectileColor,
    visualWeaponId: entity.visualWeaponId,
    excludePartNames: [...(entity.excludePartNames ?? [])],
    facing: entity.facing,
    followOwner: Boolean(entity.followOwner),
    sourceFacing: entity.sourceFacing,
    sourceHitbox: entity.sourceHitbox ? { ...entity.sourceHitbox } : null,
    effects: (entity.effects ?? []).map((effect) => ({ ...effect })),
    hitboxes: (entity.hitboxes ?? []).map((hitbox) => ({ ...hitbox })),
    elapsedTicks: entity.elapsedTicks,
    damageIntervalTicks: entity.damageIntervalTicks,
  };
}

function normalizeSeed(seed) {
  const numeric = Number(seed);
  return Number.isFinite(numeric) ? numeric >>> 0 : 1;
}

function quantize(value) {
  return Math.round((Number(value) || 0) * 1000);
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function clonePlainObject(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}
