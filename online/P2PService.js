import {
  appendWebrtcCandidate,
  cleanupRoomListener,
  listenToRoom,
  resetRoomWebrtc,
  setWebrtcAnswer,
  setWebrtcOffer,
  setWebrtcStatus,
} from "./FirebaseService.js";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

function serializeDescription(description) {
  return {
    type: description.type,
    sdp: description.sdp,
  };
}

function serializeCandidate(candidate, from) {
  const json = candidate.toJSON();
  return {
    id: `${from}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    from,
    candidate: json.candidate,
    sdpMid: json.sdpMid ?? null,
    sdpMLineIndex: json.sdpMLineIndex ?? null,
    usernameFragment: json.usernameFragment ?? null,
  };
}

function candidateKey(candidate) {
  return JSON.stringify({
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  });
}

function toRtcCandidate(candidate) {
  return new RTCIceCandidate({
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  });
}

export class P2PService {
  constructor({
    roomCode,
    localPlayerId,
    role,
    onStatus,
    onChannelState,
    onLog,
    onError,
    onDataMessage,
  }) {
    this.roomCode = roomCode;
    this.localPlayerId = localPlayerId;
    this.role = role;
    this.onStatus = onStatus;
    this.onChannelState = onChannelState;
    this.onLog = onLog;
    this.onError = onError;
    this.onDataMessage = onDataMessage;
    this.peer = null;
    this.channel = null;
    this.unsubscribe = null;
    this.remoteDescriptionSet = false;
    this.processedCandidates = new Set();
    this.signalQueue = Promise.resolve();
  }

  get isHost() {
    return this.role === "host";
  }

  async connect() {
    if (this.isHost) {
      await this.connectAsHost();
    } else {
      await this.connectAsGuest();
    }
  }

  async connectAsHost() {
    this.closeLocal();
    this.setStatus("connecting");
    await resetRoomWebrtc(this.roomCode);
    this.createPeer();
    this.channel = this.peer.createDataChannel("game");
    this.bindDataChannel(this.channel);
    this.listenForSignals();

    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    await setWebrtcOffer(this.roomCode, serializeDescription(offer));
    this.log("Host offer saved.");
  }

  async connectAsGuest() {
    this.closeLocal();
    this.setStatus("connecting");
    this.createPeer();
    this.peer.ondatachannel = (event) => {
      this.channel = event.channel;
      this.bindDataChannel(this.channel);
    };
    this.listenForSignals();
    this.log("Guest waiting for offer.");
  }

  createPeer() {
    if (!window.RTCPeerConnection) {
      throw new Error("WebRTC is not supported in this browser.");
    }

    this.peer = new RTCPeerConnection(RTC_CONFIG);
    this.peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const field = this.isHost ? "hostCandidates" : "guestCandidates";
      appendWebrtcCandidate(
        this.roomCode,
        field,
        serializeCandidate(event.candidate, this.localPlayerId),
      ).catch((error) => this.fail("ICE candidate save failed.", error));
    };
    this.peer.onconnectionstatechange = () => {
      const state = this.peer?.connectionState ?? "closed";
      if (state === "connected") {
        this.setStatus("connected");
        setWebrtcStatus(this.roomCode, "connected").catch(() => {});
      } else if (state === "failed") {
        this.setStatus("failed");
      } else if (state === "closed" || state === "disconnected") {
        this.setStatus(state);
      }
    };
    this.peer.oniceconnectionstatechange = () => {
      this.log(`ICE: ${this.peer?.iceConnectionState ?? "closed"}`);
    };
  }

  listenForSignals() {
    cleanupRoomListener(this.unsubscribe);
    this.unsubscribe = listenToRoom(
      this.roomCode,
      (room) => {
        this.signalQueue = this.signalQueue
          .then(() => this.handleSignal(room?.webrtc ?? {}))
          .catch((error) => this.fail("Signal handling failed.", error));
      },
      (error) => this.fail("Signal listener failed.", error),
    );
  }

  async handleSignal(webrtc) {
    if (!this.peer) return;

    if (this.isHost) {
      if (webrtc.answer && !this.remoteDescriptionSet) {
        await this.peer.setRemoteDescription(new RTCSessionDescription(webrtc.answer));
        this.remoteDescriptionSet = true;
        this.log("Host received answer.");
      }
      await this.addRemoteCandidates(webrtc.guestCandidates ?? []);
      return;
    }

    if (webrtc.offer && !this.remoteDescriptionSet) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(webrtc.offer));
      this.remoteDescriptionSet = true;
      this.log("Guest received offer.");

      const answer = await this.peer.createAnswer();
      await this.peer.setLocalDescription(answer);
      await setWebrtcAnswer(this.roomCode, serializeDescription(answer));
      this.log("Guest answer saved.");
    }
    await this.addRemoteCandidates(webrtc.hostCandidates ?? []);
  }

  async addRemoteCandidates(candidates) {
    if (!this.peer || !this.remoteDescriptionSet) return;
    for (const candidate of candidates) {
      if (!candidate?.candidate) continue;
      const key = candidate.id ?? candidateKey(candidate);
      if (this.processedCandidates.has(key)) continue;
      this.processedCandidates.add(key);
      try {
        await this.peer.addIceCandidate(toRtcCandidate(candidate));
        this.log("Remote ICE candidate added.");
      } catch (error) {
        this.fail("Remote ICE candidate failed.", error);
      }
    }
  }

  bindDataChannel(channel) {
    channel.onopen = () => {
      this.setChannelState(channel.readyState);
      this.setStatus("connected");
      this.log("DataChannel open.");
    };
    channel.onclose = () => {
      this.setChannelState(channel.readyState);
      this.setStatus("closed");
      this.log("DataChannel closed.");
    };
    channel.onerror = (event) => {
      this.setChannelState(channel.readyState);
      this.fail("DataChannel error.", event.error ?? event);
    };
    channel.onmessage = (event) => this.handleMessage(event.data);
    this.setChannelState(channel.readyState);
  }

  handleMessage(raw) {
    let message = raw;
    try {
      message = JSON.parse(raw);
    } catch {
      message = { type: "text", text: raw };
    }

    if (
      message.type !== "input" &&
      message.type !== "inputBundle" &&
      message.type !== "state" &&
      message.type !== "checksum" &&
      message.type !== "lockstepReady" &&
      message.type !== "lockstepReadyAck" &&
      message.type !== "netcodeConfig" &&
      message.type !== "debug" &&
      message.type !== "ping" &&
      message.type !== "pong"
    ) {
      this.log(`Received ${message.type ?? "message"}.`);
    }
    if (message.type === "ping") {
      this.send({
        type: "pong",
        time: message.time,
        respondedAt: Date.now(),
        from: this.localPlayerId,
      });
    }
    if (this.onDataMessage) {
      this.onDataMessage(message);
    }
  }

  sendPing() {
    this.send({
      type: "ping",
      time: Date.now(),
      from: this.localPlayerId,
    });
    this.log("Sent ping.");
  }

  send(message) {
    if (!this.channel || this.channel.readyState !== "open") {
      this.log("DataChannel is not open.");
      return;
    }
    this.channel.send(JSON.stringify(message));
  }

  async disconnect({ resetSignal = false } = {}) {
    this.closeLocal();
    if (resetSignal) {
      await resetRoomWebrtc(this.roomCode);
    }
    this.setStatus("closed");
    this.setChannelState("closed");
  }

  closeLocal() {
    cleanupRoomListener(this.unsubscribe);
    this.unsubscribe = null;
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }
    this.remoteDescriptionSet = false;
    this.processedCandidates.clear();
    this.signalQueue = Promise.resolve();
    this.setChannelState("closed");
  }

  setStatus(status) {
    if (this.onStatus) this.onStatus(status);
  }

  setChannelState(state) {
    if (this.onChannelState) this.onChannelState(state);
  }

  log(message) {
    if (this.onLog) this.onLog(message);
  }

  fail(message, error) {
    console.error(message, error);
    if (this.onError) this.onError(`${message} ${error?.message ?? ""}`.trim());
  }
}
