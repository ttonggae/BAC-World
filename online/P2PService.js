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
const MAX_BUFFERED_AMOUNT = 256 * 1024;
const BUFFER_LOW_AMOUNT = 64 * 1024;
const SERVICE_HEARTBEAT_MS = 2000;
const METRICS_EMIT_INTERVAL_MS = 100;
const INPUT_CHANNEL_OPTIONS = Object.freeze({
  ordered: false,
  maxPacketLifeTime: 1200,
});

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
    onMetrics,
  }) {
    this.roomCode = roomCode;
    this.localPlayerId = localPlayerId;
    this.role = role;
    this.onStatus = onStatus;
    this.onChannelState = onChannelState;
    this.onLog = onLog;
    this.onError = onError;
    this.onDataMessage = onDataMessage;
    this.onMetrics = onMetrics;
    this.peer = null;
    this.channel = null;
    this.inputChannel = null;
    this.unsubscribe = null;
    this.heartbeatTimer = null;
    this.lastSignalSignature = "";
    this.lastMetricsEmitAt = 0;
    this.remoteDescriptionSet = false;
    this.processedCandidates = new Set();
    this.signalQueue = Promise.resolve();
    this.metrics = {
      connectionState: "new",
      iceConnectionState: "new",
      signalingState: "stable",
      dataChannelState: "closed",
      inputChannelState: "closed",
      bufferedAmount: 0,
      lastPacketAt: 0,
      lastPingAt: 0,
      lastPongAt: 0,
      droppedSendCount: 0,
      failedSendCount: 0,
    };
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
    this.bindDataChannel(this.channel, "control");
    this.inputChannel = this.peer.createDataChannel("input", INPUT_CHANNEL_OPTIONS);
    this.bindDataChannel(this.inputChannel, "input");
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
      if (event.channel.label === "input") {
        this.inputChannel = event.channel;
        this.bindDataChannel(this.inputChannel, "input");
        return;
      }
      this.channel = event.channel;
      this.bindDataChannel(this.channel, "control");
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
      this.metrics.connectionState = state;
      this.emitMetrics(true);
      if (state === "connected") {
        this.setStatus("connected");
        setWebrtcStatus(this.roomCode, "connected").catch(() => {});
      } else if (state === "failed") {
        this.setStatus("failed");
      } else if (state === "disconnected") {
        this.setStatus("unstable");
      } else if (state === "closed") {
        this.setStatus(state);
      }
    };
    this.peer.oniceconnectionstatechange = () => {
      const state = this.peer?.iceConnectionState ?? "closed";
      this.metrics.iceConnectionState = state;
      this.emitMetrics(true);
      this.log(`ICE: ${state}`);
      if (state === "disconnected") {
        this.setStatus("unstable");
      } else if (state === "failed") {
        this.setStatus("failed");
      }
    };
    this.peer.onsignalingstatechange = () => {
      this.metrics.signalingState = this.peer?.signalingState ?? "closed";
      this.emitMetrics(true);
    };
  }

  listenForSignals() {
    cleanupRoomListener(this.unsubscribe);
    this.unsubscribe = listenToRoom(
      this.roomCode,
      (room) => {
        const signature = JSON.stringify(room?.webrtc ?? {});
        if (signature === this.lastSignalSignature) return;
        this.lastSignalSignature = signature;
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

  bindDataChannel(channel, kind = "control") {
    channel.bufferedAmountLowThreshold = BUFFER_LOW_AMOUNT;
    channel.onopen = () => {
      if (kind === "control") {
        this.setChannelState(channel.readyState);
        this.setStatus("connected");
        this.startServiceHeartbeat();
      } else {
        this.metrics.inputChannelState = channel.readyState;
      }
      this.updateBufferedAmount();
      this.emitMetrics(true);
      this.log(`${kind === "input" ? "Input" : "Data"}Channel open.`);
    };
    channel.onclose = () => {
      if (kind === "control") {
        this.setChannelState(channel.readyState);
        this.setStatus("closed");
        this.stopServiceHeartbeat();
      } else {
        this.metrics.inputChannelState = channel.readyState;
      }
      this.updateBufferedAmount();
      this.emitMetrics(true);
      this.log(`${kind === "input" ? "Input" : "Data"}Channel closed.`);
    };
    channel.onerror = (event) => {
      const error = event.error ?? event;
      if (isUserCloseAbort(error)) {
        this.log(`${kind === "input" ? "Input" : "Data"}Channel close acknowledged.`);
        return;
      }
      if (kind === "control") {
        this.setChannelState(channel.readyState);
        this.fail("DataChannel error.", error);
      } else {
        this.metrics.inputChannelState = channel.readyState;
        this.metrics.failedSendCount += 1;
        this.emitMetrics();
        this.log(`Input DataChannel error: ${error?.message ?? "unknown"}. Falling back to control channel.`);
      }
    };
    channel.onbufferedamountlow = () => this.updateBufferedAmount();
    channel.onmessage = (event) => this.handleMessage(event.data);
    if (kind === "control") {
      this.setChannelState(channel.readyState);
    } else {
      this.metrics.inputChannelState = channel.readyState;
      this.emitMetrics(true);
    }
    this.updateBufferedAmount();
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
      message.type !== "inputRange" &&
      message.type !== "state" &&
      message.type !== "checksum" &&
      message.type !== "lockstepReady" &&
      message.type !== "lockstepReadyAck" &&
      message.type !== "netcodeConfig" &&
      message.type !== "visibility" &&
      message.type !== "resumeInput" &&
      message.type !== "debug" &&
      message.type !== "ping" &&
      message.type !== "pong"
    ) {
      this.log(`Received ${message.type ?? "message"}.`);
    }
    this.metrics.lastPacketAt = Date.now();
    if (message.type === "ping") {
      this.metrics.lastPingAt = Date.now();
      this.send({
        type: "pong",
        time: message.time,
        respondedAt: Date.now(),
        from: this.localPlayerId,
      }, { critical: true });
    } else if (message.type === "pong") {
      this.metrics.lastPongAt = Date.now();
    }
    this.emitMetrics();
    if (this.onDataMessage) {
      this.onDataMessage(message);
    }
  }

  sendPing() {
    this.metrics.lastPingAt = Date.now();
    this.send({
      type: "ping",
      time: Date.now(),
      from: this.localPlayerId,
    }, { critical: true });
    this.log("Sent ping.");
  }

  startServiceHeartbeat() {
    this.stopServiceHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.channel?.readyState !== "open") return;
      this.send({
        type: "ping",
        time: Date.now(),
        from: this.localPlayerId,
        serviceHeartbeat: true,
      }, { critical: true });
    }, SERVICE_HEARTBEAT_MS);
  }

  stopServiceHeartbeat() {
    if (!this.heartbeatTimer) return;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  send(message, options = {}) {
    const realtimeChannel =
      options.realtime && this.inputChannel?.readyState === "open"
        ? this.inputChannel
        : null;
    let channel = realtimeChannel ?? this.channel;
    if (!channel || channel.readyState !== "open") {
      if (options.critical) this.log("DataChannel is not open.");
      return false;
    }
    this.updateBufferedAmount();
    if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT && !options.critical) {
      this.metrics.droppedSendCount += 1;
      this.emitMetrics();
      return false;
    }
    if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT && !options.critical) {
      this.metrics.droppedSendCount += 1;
      this.emitMetrics();
      return false;
    }
    try {
      channel.send(JSON.stringify(message));
      this.updateBufferedAmount();
      return true;
    } catch (error) {
      this.metrics.failedSendCount += 1;
      this.emitMetrics();
      this.fail("DataChannel send failed.", error);
      return false;
    }
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
    this.stopServiceHeartbeat();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.inputChannel) {
      this.inputChannel.close();
      this.inputChannel = null;
    }
    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }
    this.remoteDescriptionSet = false;
    this.processedCandidates.clear();
    this.lastSignalSignature = "";
    this.signalQueue = Promise.resolve();
    this.setChannelState("closed");
    this.metrics.inputChannelState = "closed";
    this.updateBufferedAmount();
  }

  setStatus(status) {
    if (this.onStatus) this.onStatus(status);
  }

  setChannelState(state) {
    this.metrics.dataChannelState = state;
    this.emitMetrics(true);
    if (this.onChannelState) this.onChannelState(state);
  }

  log(message) {
    if (this.onLog) this.onLog(message);
  }

  fail(message, error) {
    console.error(message, error);
    if (this.onError) this.onError(`${message} ${error?.message ?? ""}`.trim());
  }

  updateBufferedAmount() {
    this.metrics.bufferedAmount =
      (this.channel?.bufferedAmount ?? 0) +
      (this.inputChannel?.bufferedAmount ?? 0);
    this.emitMetrics();
  }

  getBufferedAmount() {
    return (
      (this.channel?.bufferedAmount ?? 0) +
      (this.inputChannel?.bufferedAmount ?? 0)
    );
  }

  getMetrics() {
    this.updateBufferedAmount();
    return { ...this.metrics };
  }

  emitMetrics(force = false) {
    const now = Date.now();
    if (!force && now - this.lastMetricsEmitAt < METRICS_EMIT_INTERVAL_MS) return;
    this.lastMetricsEmitAt = now;
    if (this.onMetrics) this.onMetrics({ ...this.metrics });
  }
}

function isUserCloseAbort(error) {
  const message = String(error?.message ?? error ?? "");
  return message.includes("Close called") || message.includes("User-Initiated Abort");
}
