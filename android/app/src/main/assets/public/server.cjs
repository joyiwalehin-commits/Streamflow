var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_http = __toESM(require("http"), 1);
var import_ws = require("ws");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");

// server/streamingManager.ts
var import_crypto = __toESM(require("crypto"), 1);
var import_livekit_server_sdk = require("livekit-server-sdk");
var streamingSessions = /* @__PURE__ */ new Map();
function createSignedJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodeB64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const headerB64 = encodeB64Url(header);
  const payloadB64 = encodeB64Url(payload);
  const signature = import_crypto.default.createHmac("sha256", secret || "streamflow_dev_secret").update(`${headerB64}.${payloadB64}`).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${headerB64}.${payloadB64}.${signature}`;
}
function getStreamingConfiguration() {
  const livekitUrl = process.env.LIVEKIT_URL || "wss://streamflow-a2fibivu.livekit.cloud";
  const livekitConfigured = Boolean(
    livekitUrl && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
  );
  const agoraConfigured = Boolean(
    process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE
  );
  const muxConfigured = Boolean(
    process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET
  );
  const configuredProviders = [];
  if (livekitConfigured) configuredProviders.push("livekit");
  if (agoraConfigured) configuredProviders.push("agora");
  if (muxConfigured) configuredProviders.push("mux");
  const preferred = (process.env.STREAMING_PROVIDER || "").toLowerCase().trim();
  let activeProvider = "dev_webrtc_mock";
  let providerName = "Development WebRTC Readiness Adapter";
  let isProductionReady = false;
  if (preferred === "livekit" && livekitConfigured) {
    activeProvider = "livekit";
    providerName = "LiveKit Cloud WebRTC SFU";
    isProductionReady = true;
  } else if (preferred === "agora" && agoraConfigured) {
    activeProvider = "agora";
    providerName = "Agora Real-Time Broadcasting (RTC)";
    isProductionReady = true;
  } else if (preferred === "mux" && muxConfigured) {
    activeProvider = "mux";
    providerName = "Mux Live Video (RTMP/HLS)";
    isProductionReady = true;
  } else if (livekitConfigured) {
    activeProvider = "livekit";
    providerName = "LiveKit Cloud WebRTC SFU";
    isProductionReady = true;
  } else if (agoraConfigured) {
    activeProvider = "agora";
    providerName = "Agora Real-Time Broadcasting (RTC)";
    isProductionReady = true;
  } else if (muxConfigured) {
    activeProvider = "mux";
    providerName = "Mux Live Video (RTMP/HLS)";
    isProductionReady = true;
  }
  const missingEnvVars = {
    livekit: [
      !livekitUrl ? "LIVEKIT_URL" : "",
      !process.env.LIVEKIT_API_KEY ? "LIVEKIT_API_KEY" : "",
      !process.env.LIVEKIT_API_SECRET ? "LIVEKIT_API_SECRET" : ""
    ].filter(Boolean),
    agora: [
      !process.env.AGORA_APP_ID ? "AGORA_APP_ID" : "",
      !process.env.AGORA_APP_CERTIFICATE ? "AGORA_APP_CERTIFICATE" : ""
    ].filter(Boolean),
    mux: [
      !process.env.MUX_TOKEN_ID ? "MUX_TOKEN_ID" : "",
      !process.env.MUX_TOKEN_SECRET ? "MUX_TOKEN_SECRET" : ""
    ].filter(Boolean)
  };
  return {
    status: isProductionReady ? "configured" : "dev_fallback",
    activeProvider,
    providerName,
    isProductionReady,
    configuredProviders,
    availableAdapters: [
      {
        id: "livekit",
        name: "LiveKit Cloud (Recommended)",
        description: "Modern open-source WebRTC SFU with sub-100ms ultra-low latency, multi-guest co-hosting, and PK battles.",
        requiredEnv: ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"],
        isConfigured: livekitConfigured
      },
      {
        id: "agora",
        name: "Agora RTC Live Broadcasting",
        description: "Global interactive broadcasting network with native host/audience roles and channel token security.",
        requiredEnv: ["AGORA_APP_ID", "AGORA_APP_CERTIFICATE"],
        isConfigured: agoraConfigured
      },
      {
        id: "mux",
        name: "Mux Video Live Ingest",
        description: "High-scale RTMP & WHIP live streaming with automated HLS transcode and instant VOD recording.",
        requiredEnv: ["MUX_TOKEN_ID", "MUX_TOKEN_SECRET"],
        isConfigured: muxConfigured
      }
    ],
    missingEnvVars,
    supportedProtocols: ["WebRTC SFU", "WHIP (Ingest)", "WHEP (Playback)", "RTMP"],
    instructions: isProductionReady ? `Active production streaming provider is connected (${providerName}). Broadcaster and viewer credentials are cryptographically signed.` : "StreamFlow is currently in Developer Readiness Mode. A live streaming provider (such as LiveKit Cloud or Agora) must be configured with API keys in .env to distribute real-time video across disparate remote viewers. In readiness mode, signaling, tokens, presence, gifts, and PK battles function with mock/local camera preview."
  };
}
async function createLiveStreamingSession(params) {
  const config = getStreamingConfiguration();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let session = streamingSessions.get(params.streamId);
  if (!session) {
    session = {
      sessionId: `sess_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`,
      streamId: params.streamId,
      title: params.title,
      hostId: params.hostId,
      hostName: params.hostName,
      hostAvatar: params.hostAvatar || "",
      category: params.category || "ChitChat",
      isPrivate: !!params.isPrivate,
      active: true,
      provider: config.activeProvider,
      isProductionReady: config.isProductionReady,
      createdAt: now,
      peakViewers: 1,
      participants: /* @__PURE__ */ new Map()
    };
    session.participants.set(params.hostId, {
      userId: params.hostId,
      userName: params.hostName,
      avatar: params.hostAvatar,
      role: "host",
      joinedAt: now,
      lastHeartbeat: Date.now(),
      isOnline: true
    });
    streamingSessions.set(params.streamId, session);
  } else {
    session.active = true;
    session.title = params.title;
  }
  const broadcasterCredentials = await generateSecureStreamingCredentials({
    streamId: params.streamId,
    userId: params.hostId,
    userName: params.hostName,
    role: "host"
  });
  return { session, broadcasterCredentials };
}
async function generateSecureStreamingCredentials(params) {
  const config = getStreamingConfiguration();
  const expiryTimestamp = Math.floor(Date.now() / 1e3) + 14400;
  const expiresAt = new Date(expiryTimestamp * 1e3).toISOString();
  const isPublisher = params.role === "host" || params.role === "cohost";
  if (config.activeProvider === "livekit") {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL || "wss://streamflow-a2fibivu.livekit.cloud";
    let token = "";
    try {
      const at = new import_livekit_server_sdk.AccessToken(apiKey, apiSecret, {
        identity: params.userId,
        name: params.userName,
        ttl: "4h"
      });
      at.addGrant({
        room: params.streamId,
        roomJoin: true,
        canPublish: isPublisher,
        canSubscribe: true,
        canPublishData: true
      });
      token = await Promise.resolve(at.toJwt());
    } catch {
      const liveKitPayload = {
        sub: params.userId,
        iss: apiKey,
        exp: expiryTimestamp,
        nbf: Math.floor(Date.now() / 1e3) - 10,
        name: params.userName,
        video: {
          room: params.streamId,
          roomJoin: true,
          canPublish: isPublisher,
          canSubscribe: true,
          canPublishData: true
        },
        metadata: JSON.stringify({ role: params.role })
      };
      token = createSignedJwt(liveKitPayload, apiSecret);
    }
    return {
      provider: "livekit",
      isProductionReady: true,
      roomId: params.streamId,
      streamId: params.streamId,
      userId: params.userId,
      userName: params.userName,
      role: params.role,
      token,
      serverUrl,
      ingestEndpoint: isPublisher ? {
        protocol: "whip",
        url: `${serverUrl.replace(/^wss?:\/\//, "https://")}/w/rooms/${params.streamId}/whip`
      } : void 0,
      playbackEndpoint: {
        protocol: "whep",
        url: `${serverUrl.replace(/^wss?:\/\//, "https://")}/w/rooms/${params.streamId}/whep`
      },
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ],
      expiresAt,
      instructions: "Connected to LiveKit SFU. Token is signed and ready for WebRTC connect."
    };
  }
  if (config.activeProvider === "agora") {
    const appId = process.env.AGORA_APP_ID;
    const appCert = process.env.AGORA_APP_CERTIFICATE;
    const agoraPayload = {
      appId,
      channel: params.streamId,
      uid: params.userId,
      role: isPublisher ? 1 : 2,
      // 1: Broadcaster, 2: Audience
      exp: expiryTimestamp
    };
    const token = createSignedJwt(agoraPayload, appCert);
    return {
      provider: "agora",
      isProductionReady: true,
      roomId: params.streamId,
      streamId: params.streamId,
      userId: params.userId,
      userName: params.userName,
      role: params.role,
      token,
      serverUrl: "https://web.agora.io",
      expiresAt,
      instructions: "Connected to Agora RTC network with dynamic channel token."
    };
  }
  if (config.activeProvider === "mux") {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;
    const muxPayload = {
      sub: params.streamId,
      iss: tokenId,
      exp: expiryTimestamp,
      role: params.role
    };
    const token = createSignedJwt(muxPayload, tokenSecret);
    return {
      provider: "mux",
      isProductionReady: true,
      roomId: params.streamId,
      streamId: params.streamId,
      userId: params.userId,
      userName: params.userName,
      role: params.role,
      token,
      ingestEndpoint: isPublisher ? {
        protocol: "rtmp",
        url: "rtmp://global-live.mux.com:5222/app",
        streamKey: `mux_live_${params.streamId}`
      } : void 0,
      playbackEndpoint: {
        protocol: "hls",
        url: `https://stream.mux.com/${params.streamId}.m3u8`
      },
      expiresAt,
      instructions: "Connected to Mux Live Video streaming."
    };
  }
  const devPayload = {
    sub: params.userId,
    name: params.userName,
    room: params.streamId,
    role: params.role,
    isPublisher,
    mode: "developer_readiness",
    exp: expiryTimestamp
  };
  const devToken = createSignedJwt(devPayload, "streamflow_dev_secret_key");
  return {
    provider: "dev_webrtc_mock",
    isProductionReady: false,
    roomId: params.streamId,
    streamId: params.streamId,
    userId: params.userId,
    userName: params.userName,
    role: params.role,
    token: devToken,
    serverUrl: "ws://localhost:3000/api/live-sync",
    ingestEndpoint: isPublisher ? {
      protocol: "whip",
      url: `http://localhost:3000/api/streaming/mock-whip/${params.streamId}`
    } : void 0,
    playbackEndpoint: {
      protocol: "whep",
      url: `http://localhost:3000/api/streaming/mock-whep/${params.streamId}`
    },
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ],
    expiresAt,
    instructions: "Running in Developer Readiness Mode. A live streaming provider (LiveKit or Agora) is required for real video delivery between multiple browser instances. See /api/streaming/status for setup instructions."
  };
}
async function joinLiveStreamingRoom(params) {
  let session = streamingSessions.get(params.streamId);
  if (!session) {
    const created = await createLiveStreamingSession({
      streamId: params.streamId,
      title: "Live Stream",
      hostId: params.userId,
      hostName: params.userName,
      hostAvatar: params.avatar
    });
    session = created.session;
  }
  const role = params.role || (params.userId === session.hostId ? "host" : "viewer");
  session.participants.set(params.userId, {
    userId: params.userId,
    userName: params.userName,
    avatar: params.avatar,
    role,
    joinedAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastHeartbeat: Date.now(),
    isOnline: true
  });
  const activeCount = Array.from(session.participants.values()).filter(
    (p) => p.isOnline
  ).length;
  session.peakViewers = Math.max(session.peakViewers, activeCount);
  const credentials = await generateSecureStreamingCredentials({
    streamId: params.streamId,
    userId: params.userId,
    userName: params.userName,
    role
  });
  return {
    session,
    credentials,
    totalViewers: activeCount
  };
}
function recordStreamingHeartbeat(params) {
  const session = streamingSessions.get(params.streamId);
  if (!session) {
    return { activeViewers: 0, isHostOnline: false };
  }
  const existing = session.participants.get(params.userId);
  if (existing) {
    existing.lastHeartbeat = Date.now();
    existing.isOnline = true;
    if (params.userName) existing.userName = params.userName;
    if (params.role) existing.role = params.role;
  } else {
    session.participants.set(params.userId, {
      userId: params.userId,
      userName: params.userName || "Viewer",
      role: params.role || (params.userId === session.hostId ? "host" : "viewer"),
      joinedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastHeartbeat: Date.now(),
      isOnline: true
    });
  }
  const cutoff = Date.now() - 45e3;
  session.participants.forEach((p) => {
    if (p.lastHeartbeat < cutoff) {
      p.isOnline = false;
    }
  });
  const activeParticipants = Array.from(session.participants.values()).filter(
    (p) => p.isOnline
  );
  const activeViewers = activeParticipants.length;
  session.peakViewers = Math.max(session.peakViewers, activeViewers);
  const hostParticipant = session.participants.get(session.hostId);
  const isHostOnline = Boolean(hostParticipant && hostParticipant.isOnline);
  return { activeViewers, isHostOnline };
}
function leaveStreamingRoom(streamId, userId) {
  const session = streamingSessions.get(streamId);
  if (!session) return 0;
  const participant = session.participants.get(userId);
  if (participant) {
    participant.isOnline = false;
  }
  return Array.from(session.participants.values()).filter((p) => p.isOnline).length;
}
function terminateStreamingSession(streamId) {
  const session = streamingSessions.get(streamId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!session) {
    return {
      success: true,
      streamId,
      durationSeconds: 0,
      peakViewers: 1,
      endedAt: now
    };
  }
  session.active = false;
  session.endedAt = now;
  const start = new Date(session.createdAt).getTime();
  const end = new Date(now).getTime();
  const durationSeconds = Math.max(1, Math.round((end - start) / 1e3));
  session.participants.forEach((p) => {
    p.isOnline = false;
  });
  return {
    success: true,
    streamId,
    durationSeconds,
    peakViewers: session.peakViewers,
    endedAt: now
  };
}
function getStreamingPresenceReport(streamId) {
  const session = streamingSessions.get(streamId);
  const config = getStreamingConfiguration();
  if (!session) {
    return {
      streamId,
      totalViewers: 0,
      peakViewers: 0,
      participants: [],
      provider: config.activeProvider,
      isProductionReady: config.isProductionReady,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const cutoff = Date.now() - 45e3;
  const participantList = Array.from(session.participants.values()).map((p) => {
    const isOnline = p.isOnline && p.lastHeartbeat >= cutoff;
    return {
      userId: p.userId,
      userName: p.userName,
      avatar: p.avatar,
      role: p.role,
      joinedAt: p.joinedAt,
      isOnline
    };
  });
  const onlineCount = participantList.filter((p) => p.isOnline).length;
  return {
    streamId,
    totalViewers: onlineCount,
    peakViewers: session.peakViewers,
    participants: participantList,
    provider: session.provider,
    isProductionReady: session.isProductionReady,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// server/financialSecurity.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var auditLogDatabase = [];
var MAX_AUDIT_LOGS = 1e4;
var SIMULATION_HMAC_SECRET = process.env.ADMIN_SECRET_KEY || "streamflow_audit_sim_sec_key_2026";
function logFinancialEvent(record) {
  const fullRecord = {
    id: `AUD_${Date.now()}_${import_crypto2.default.randomBytes(4).toString("hex")}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...record
  };
  auditLogDatabase.unshift(fullRecord);
  if (auditLogDatabase.length > MAX_AUDIT_LOGS) {
    auditLogDatabase.pop();
  }
  if (fullRecord.status === "BLOCKED" || fullRecord.status === "FAILED") {
    console.warn(`[FINANCIAL AUDIT][${fullRecord.status}] ${fullRecord.eventType} - User: ${fullRecord.userId}`, fullRecord.details);
  } else {
    console.info(`[FINANCIAL AUDIT][SUCCESS] ${fullRecord.eventType} - User: ${fullRecord.userId}`);
  }
  return fullRecord;
}
function verifyPaystackWebhookSignature(rawBody, signature, secretKey) {
  if (!rawBody || !signature || !secretKey) return false;
  try {
    const computedSignature = import_crypto2.default.createHmac("sha512", secretKey).update(rawBody).digest("hex");
    return import_crypto2.default.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature));
  } catch (err) {
    console.error("Paystack webhook HMAC validation error:", err);
    return false;
  }
}

// server.ts
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "15mb" }));
  let aiClient = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }
      aiClient = new import_genai.GoogleGenAI({ apiKey });
    }
    return aiClient;
  }
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage, sourceLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Text and targetLanguage are required" });
      }
      const ai = getGeminiClient();
      const prompt = `You are a real-time ultra-fast live-streaming chat translator. 
Translate the following chat message or transcript into ${targetLanguage}.
${sourceLanguage ? `The original language is ${sourceLanguage}.` : "Detect the source language automatically."}
Preserve emojis, live-stream slang, internet culture terms, and energy. Keep it natural and concise.
Output only the translated string without quotes or explanations.

Message to translate:
"${text}"`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      const translatedText = response.text?.trim() || text;
      res.json({
        original: text,
        translation: translatedText,
        targetLanguage
      });
    } catch (error) {
      console.error("Translation API error:", error?.message || error);
      res.status(500).json({
        error: error?.message || "Translation failed",
        fallback: req.body?.text || ""
      });
    }
  });
  app.post("/api/ai-cohost", async (req, res) => {
    try {
      const { streamTopic, creatorName, recentEvents, viewerComment } = req.body;
      const ai = getGeminiClient();
      const prompt = `You are "FlowBot", an energetic, witty AI co-host for a global live stream hosted by ${creatorName || "Streamer"}.
Topic: ${streamTopic || "Just Chatting & PK Battle"}.
Recent events: ${recentEvents || "Stream started, fans sending gifts"}.
Latest viewer comment or event: "${viewerComment || "Hyped for the stream!"}".

Give a quick, charismatic, 1-2 sentence response to engage the chat, thank gifters, or hype up the upcoming PK battle.
Include relevant emojis. Keep it under 35 words.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      res.json({ message: response.text?.trim() || "Let's keep the energy flowing! \u{1F525}\u2728" });
    } catch (error) {
      console.error("AI Cohost error:", error?.message || error);
      res.status(500).json({ error: error?.message || "AI Cohost failed" });
    }
  });
  const COIN_PACKAGES = [
    {
      id: "pkg_starter",
      name: "Starter Spark",
      coins: 500,
      bonusCoins: 0,
      totalCoins: 500,
      priceNgn: 1200,
      amountKobo: 12e4,
      description: "Great for first-time gifters. Send Cosmic Roses & chat hearts.",
      badge: "Starter"
    },
    {
      id: "pkg_creator",
      name: "Creator Fan Pack",
      coins: 1500,
      bonusCoins: 150,
      totalCoins: 1650,
      priceNgn: 3500,
      amountKobo: 35e4,
      popular: true,
      description: "+150 Bonus Coins! Most chosen pack for stream chat support.",
      badge: "Popular \u{1F525}"
    },
    {
      id: "pkg_superfan",
      name: "Super Fan Booster",
      coins: 4e3,
      bonusCoins: 600,
      totalCoins: 4600,
      priceNgn: 8500,
      amountKobo: 85e4,
      bestValue: true,
      description: "Includes +600 Free Coins. Send Neon Fireworks and unlock badges.",
      badge: "Best Value \u26A1"
    },
    {
      id: "pkg_vip",
      name: "VIP Streamer Pass",
      coins: 1e4,
      bonusCoins: 2e3,
      totalCoins: 12e3,
      priceNgn: 2e4,
      amountKobo: 2e6,
      description: "20% Bonus! Send Cyber Roadsters & access private VIP streams.",
      badge: "VIP Club \u{1F48E}"
    },
    {
      id: "pkg_champion",
      name: "PK Arena Champion",
      coins: 25e3,
      bonusCoins: 6500,
      totalCoins: 31500,
      priceNgn: 5e4,
      amountKobo: 5e6,
      description: "Dominate global PK battles, carry your creator to victory as MVP.",
      badge: "Arena Champ \u{1F3C6}"
    },
    {
      id: "pkg_dragon",
      name: "Royal Dragon Lord",
      coins: 6e4,
      bonusCoins: 18e3,
      totalCoins: 78e3,
      priceNgn: 12e4,
      amountKobo: 12e6,
      description: "Huge +30% bonus. Rain Golden Dragons across the global arena!",
      badge: "Mythic \u{1F409}"
    }
  ];
  const transactionsDatabase = /* @__PURE__ */ new Map();
  const seedTransactions = [
    {
      reference: "SF_1726831000_A9B2",
      userId: "user_me",
      userEmail: "alexstream@streamflow.live",
      packageId: "pkg_creator",
      packageName: "Creator Fan Pack",
      coins: 1500,
      bonusCoins: 150,
      totalCoins: 1650,
      amountNgn: 3500,
      amountKobo: 35e4,
      currency: "NGN",
      status: "success",
      paidAt: new Date(Date.now() - 864e5 * 2).toISOString(),
      credited: true,
      createdAt: new Date(Date.now() - 864e5 * 2 - 12e4).toISOString(),
      channel: "card",
      gatewayResponse: "Successful",
      isTestMode: true
    },
    {
      reference: "SF_1726712000_E4C1",
      userId: "user_me",
      userEmail: "alexstream@streamflow.live",
      packageId: "pkg_starter",
      packageName: "Starter Spark",
      coins: 500,
      bonusCoins: 0,
      totalCoins: 500,
      amountNgn: 1200,
      amountKobo: 12e4,
      currency: "NGN",
      status: "success",
      paidAt: new Date(Date.now() - 864e5 * 5).toISOString(),
      credited: true,
      createdAt: new Date(Date.now() - 864e5 * 5 - 18e4).toISOString(),
      channel: "bank_transfer",
      gatewayResponse: "Successful",
      isTestMode: true
    }
  ];
  for (const item of seedTransactions) {
    transactionsDatabase.set(item.reference, item);
  }
  const GIFTS_CATALOG = [
    { id: "gift_rose", name: "Cosmic Rose", icon: "\u{1F339}", coinPrice: 5, color: "#ff2d55" },
    { id: "gift_heart", name: "Heart Sparkle", icon: "\u{1F496}", coinPrice: 20, color: "#ff69b4" },
    { id: "gift_crown", name: "Champion Crown", icon: "\u{1F451}", coinPrice: 199, color: "#eab308" },
    { id: "gift_fireworks", name: "Neon Fireworks", icon: "\u{1F386}", coinPrice: 99, color: "#ffd700" },
    { id: "gift_rocket", name: "Hypersonic Rocket", icon: "\u{1F680}", coinPrice: 799, color: "#ec4899" },
    { id: "gift_supercar", name: "Cyber Roadster", icon: "\u{1F3CE}\uFE0F", coinPrice: 499, color: "#00f2fe" },
    { id: "gift_galaxy", name: "Galaxy Portal", icon: "\u{1F30C}", coinPrice: 1299, color: "#7f00ff" },
    { id: "gift_dragon", name: "Golden Dragon", icon: "\u{1F409}", coinPrice: 2999, color: "#f7971e" }
  ];
  const userWalletsDatabase = /* @__PURE__ */ new Map();
  const giftTransactionsDatabase = /* @__PURE__ */ new Map();
  const idempotencyKeysDatabase = /* @__PURE__ */ new Map();
  const creatorWithdrawalsDatabase = /* @__PURE__ */ new Map();
  const activePrivateBillingSessions = /* @__PURE__ */ new Map();
  const privateSessionTransactionsDatabase = /* @__PURE__ */ new Map();
  userWalletsDatabase.set("user_me", {
    id: "user_me",
    name: "Alex Rivera",
    viewerCoins: 4500,
    // Non-withdrawable
    totalLifetimeDiamonds: 25e3,
    totalLifetimeEarningsNgn: 5e4,
    availableDiamonds: 18500,
    availableEarningsNgn: 37e3,
    // Withdrawable (18,500 * ₦2.00)
    pendingDiamonds: 0,
    pendingWithdrawalsNgn: 0,
    totalWithdrawnNgn: 13e3
  });
  userWalletsDatabase.set("creator_tokyo", {
    id: "creator_tokyo",
    name: "Yuki Tanaka",
    viewerCoins: 12e3,
    totalLifetimeDiamonds: 89400,
    totalLifetimeEarningsNgn: 178800,
    availableDiamonds: 89400,
    availableEarningsNgn: 178800,
    pendingDiamonds: 0,
    pendingWithdrawalsNgn: 0,
    totalWithdrawnNgn: 0
  });
  userWalletsDatabase.set("creator_rio", {
    id: "creator_rio",
    name: "Camila Santos",
    viewerCoins: 8400,
    totalLifetimeDiamonds: 64200,
    totalLifetimeEarningsNgn: 128400,
    availableDiamonds: 64200,
    availableEarningsNgn: 128400,
    pendingDiamonds: 0,
    pendingWithdrawalsNgn: 0,
    totalWithdrawnNgn: 0
  });
  function getOrCreateWallet(userId, defaultName) {
    if (!userWalletsDatabase.has(userId)) {
      userWalletsDatabase.set(userId, {
        id: userId,
        name: defaultName || (userId === "user_me" ? "Alex Rivera" : "StreamFlow User"),
        viewerCoins: 2e3,
        totalLifetimeDiamonds: 0,
        totalLifetimeEarningsNgn: 0,
        availableDiamonds: 0,
        availableEarningsNgn: 0,
        pendingDiamonds: 0,
        pendingWithdrawalsNgn: 0,
        totalWithdrawnNgn: 0
      });
    }
    return userWalletsDatabase.get(userId);
  }
  const seedGifts = [
    {
      id: "GIFT_SEED_1",
      idempotencyKey: "idem_seed_1",
      streamId: "stream_seed_1",
      streamTitle: "\u{1F525} GLOBAL PK BATTLE: Tokyo vs NYC Synth Showcase!",
      senderId: "user_lucas",
      senderName: "Lucas_Rio",
      senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      creatorId: "user_me",
      creatorName: "Alex Rivera",
      giftId: "gift_supercar",
      giftName: "Cyber Roadster",
      giftIcon: "\u{1F3CE}\uFE0F",
      count: 1,
      coinsSpent: 499,
      diamondsEarned: 499,
      earningsNgn: 998,
      timestamp: new Date(Date.now() - 36e5 * 2).toISOString()
    },
    {
      id: "GIFT_SEED_2",
      idempotencyKey: "idem_seed_2",
      streamId: "stream_seed_2",
      streamTitle: "Late Night Ambient DJ Set",
      senderId: "user_tokyofan",
      senderName: "TokyoDreamer",
      senderAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
      creatorId: "user_me",
      creatorName: "Alex Rivera",
      giftId: "gift_galaxy",
      giftName: "Galaxy Portal",
      giftIcon: "\u{1F30C}",
      count: 1,
      coinsSpent: 1299,
      diamondsEarned: 1299,
      earningsNgn: 2598,
      timestamp: new Date(Date.now() - 36e5 * 5).toISOString()
    },
    {
      id: "GIFT_SEED_3",
      idempotencyKey: "idem_seed_3",
      streamId: "stream_seed_3",
      streamTitle: "Weekend Music Production Q&A",
      senderId: "user_sarah",
      senderName: "Sarah_NYC",
      senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      creatorId: "user_me",
      creatorName: "Alex Rivera",
      giftId: "gift_fireworks",
      giftName: "Neon Fireworks",
      giftIcon: "\u{1F386}",
      count: 5,
      coinsSpent: 495,
      diamondsEarned: 495,
      earningsNgn: 990,
      timestamp: new Date(Date.now() - 36e5 * 18).toISOString()
    },
    {
      id: "GIFT_SEED_4",
      idempotencyKey: "idem_seed_4",
      streamId: "stream_seed_4",
      streamTitle: "Live Chill & Synth Session",
      senderId: "user_elena",
      senderName: "Elena_Dance",
      senderAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      creatorId: "user_me",
      creatorName: "Alex Rivera",
      giftId: "gift_rose",
      giftName: "Cosmic Rose",
      giftIcon: "\u{1F339}",
      count: 20,
      coinsSpent: 100,
      diamondsEarned: 100,
      earningsNgn: 200,
      timestamp: new Date(Date.now() - 864e5).toISOString()
    },
    {
      id: "GIFT_SEED_5",
      idempotencyKey: "idem_seed_5",
      streamId: "stream_seed_5",
      streamTitle: "Celebrating 50k Followers Stream!",
      senderId: "user_kpop",
      senderName: "KpopFan99",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      creatorId: "user_me",
      creatorName: "Alex Rivera",
      giftId: "gift_dragon",
      giftName: "Golden Dragon",
      giftIcon: "\u{1F409}",
      count: 1,
      coinsSpent: 2999,
      diamondsEarned: 2999,
      earningsNgn: 5998,
      timestamp: new Date(Date.now() - 864e5 * 3).toISOString()
    }
  ];
  for (const gift of seedGifts) {
    giftTransactionsDatabase.set(gift.id, gift);
    idempotencyKeysDatabase.set(gift.idempotencyKey, gift.id);
  }
  const seedWithdrawals = [
    {
      id: "WD_SEED_1",
      creatorId: "user_me",
      creatorName: "Alex Rivera",
      amountNgn: 8e3,
      diamondsDeducted: 4e3,
      bankName: "Guaranty Trust Bank (GTBank)",
      bankCode: "058",
      accountNumber: "0123456789",
      accountName: "ALEX RIVERA",
      status: "completed",
      reference: "PAYOUT_NGN_1788291024",
      requestedAt: new Date(Date.now() - 864e5 * 2).toISOString(),
      processedAt: new Date(Date.now() - 864e5 * 2 + 12e4).toISOString()
    },
    {
      id: "WD_SEED_2",
      creatorId: "user_me",
      creatorName: "Alex Rivera",
      amountNgn: 5e3,
      diamondsDeducted: 2500,
      bankName: "Kuda Microfinance Bank",
      bankCode: "50211",
      accountNumber: "2039485712",
      accountName: "ALEX RIVERA",
      status: "completed",
      reference: "PAYOUT_NGN_1787129482",
      requestedAt: new Date(Date.now() - 864e5 * 5).toISOString(),
      processedAt: new Date(Date.now() - 864e5 * 5 + 18e4).toISOString()
    }
  ];
  for (const wd of seedWithdrawals) {
    creatorWithdrawalsDatabase.set(wd.id, wd);
  }
  const seedPrivateTransactions = [
    {
      id: "PSTXN_SEED_1",
      sessionId: "PSESS_SEED_1",
      streamId: "stream_2",
      streamTitle: "\u2615 Acoustic Sunset Session & Intimate Chat [VIP Room]",
      viewerId: "user_me",
      viewerName: "Alex Rivera",
      creatorId: "creator_rio",
      creatorName: "Camila Santos",
      pricePerMinute: 20,
      durationSeconds: 300,
      minutesBilled: 5,
      coinsDeducted: 100,
      diamondsCredited: 100,
      earningsNgn: 200,
      startedAt: new Date(Date.now() - 36e5 * 3).toISOString(),
      endedAt: new Date(Date.now() - 36e5 * 3 + 3e5).toISOString(),
      type: "private_session"
    },
    {
      id: "PSTXN_SEED_2",
      sessionId: "PSESS_SEED_2",
      streamId: "stream_2",
      streamTitle: "VIP Acoustic Lounge & Live Producer Chat",
      viewerId: "user_lucas",
      viewerName: "Lucas_Rio",
      creatorId: "user_me",
      creatorName: "Alex Rivera",
      pricePerMinute: 25,
      durationSeconds: 480,
      minutesBilled: 8,
      coinsDeducted: 200,
      diamondsCredited: 200,
      earningsNgn: 400,
      startedAt: new Date(Date.now() - 36e5 * 6).toISOString(),
      endedAt: new Date(Date.now() - 36e5 * 6 + 48e4).toISOString(),
      type: "private_session"
    }
  ];
  for (const ps of seedPrivateTransactions) {
    privateSessionTransactionsDatabase.set(ps.id, ps);
    transactionsDatabase.set(ps.id, {
      reference: ps.id,
      userId: ps.viewerId,
      userEmail: "alexstream@streamflow.live",
      packageId: "private_session_fee",
      packageName: `Private Live with ${ps.creatorName}`,
      coins: -ps.coinsDeducted,
      bonusCoins: 0,
      totalCoins: -ps.coinsDeducted,
      amountNgn: ps.earningsNgn,
      amountKobo: ps.earningsNgn * 100,
      currency: "NGN",
      status: "success",
      paidAt: ps.endedAt,
      credited: true,
      createdAt: ps.startedAt,
      channel: "Coins Balance (Per Minute)",
      gatewayResponse: `Billed ${ps.minutesBilled} mins @ ${ps.pricePerMinute} coins/min`,
      isTestMode: false
    });
  }
  const pkBattlesDatabase = /* @__PURE__ */ new Map();
  const pkBattleHistoryDatabase = /* @__PURE__ */ new Map();
  const defaultPKBattle = {
    id: "pk_battle_live_1",
    challenger: {
      id: "user_me",
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      country: "United States",
      countryFlag: "\u{1F1FA}\u{1F1F8}",
      streamId: "stream_1",
      streamTitle: "\u{1F525} GLOBAL PK BATTLE: Tokyo vs NYC Synth Showcase!"
    },
    opponent: {
      id: "creator_tokyo",
      name: "Yuki Tanaka",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      country: "Japan",
      countryFlag: "\u{1F1EF}\u{1F1F5}",
      streamId: "stream_1",
      streamTitle: "\u{1F525} GLOBAL PK BATTLE: Tokyo vs NYC Synth Showcase!"
    },
    challengerScore: 1850,
    opponentScore: 1620,
    challengerViewerCount: 4210,
    opponentViewerCount: 4210,
    status: "battling",
    durationSeconds: 180,
    remainingSeconds: 145,
    punishmentRule: "Loser sings opponent's top hit live with funny voice",
    winnerId: null,
    winnerName: null,
    topSupportersA: [
      { userId: "user_lucas", name: "Lucas_Rio", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", points: 800 },
      { userId: "user_sarah", name: "Sarah_NYC", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", points: 550 }
    ],
    topSupportersB: [
      { userId: "user_tokyofan", name: "TokyoDreamer", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150", points: 950 },
      { userId: "user_kpop", name: "KpopFan99", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", points: 400 }
    ],
    giftLog: [
      {
        id: "PK_GIFT_SEED_1",
        senderId: "user_lucas",
        senderName: "Lucas_Rio",
        senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        targetCreatorId: "user_me",
        targetCreatorName: "Alex Rivera",
        giftId: "gift_supercar",
        giftName: "Cyber Roadster",
        giftIcon: "\u{1F3CE}\uFE0F",
        count: 1,
        coins: 499,
        points: 499,
        timestamp: new Date(Date.now() - 3e4).toISOString()
      },
      {
        id: "PK_GIFT_SEED_2",
        senderId: "user_tokyofan",
        senderName: "TokyoDreamer",
        senderAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
        targetCreatorId: "creator_tokyo",
        targetCreatorName: "Yuki Tanaka",
        giftId: "gift_galaxy",
        giftName: "Galaxy Portal",
        giftIcon: "\u{1F30C}",
        count: 1,
        coins: 1299,
        points: 1299,
        timestamp: new Date(Date.now() - 6e4).toISOString()
      }
    ],
    startedAt: new Date(Date.now() - 35e3).toISOString()
  };
  pkBattlesDatabase.set(defaultPKBattle.id, defaultPKBattle);
  const seedPKHistory = [
    {
      id: "PK_REC_SEED_1",
      battleId: "PK_HIST_1",
      creatorA: { id: "user_me", name: "Alex Rivera", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
      creatorB: { id: "creator_tokyo", name: "Yuki Tanaka", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150" },
      scoreA: 5420,
      scoreB: 4890,
      winnerId: "user_me",
      winnerName: "Alex Rivera",
      durationSeconds: 180,
      totalCoinsContributed: 10310,
      totalDiamondsEarnedA: 5420,
      totalDiamondsEarnedB: 4890,
      punishmentRule: "Loser sings opponent's top synth track live on stream",
      giftCount: 14,
      endedAt: new Date(Date.now() - 864e5).toISOString()
    },
    {
      id: "PK_REC_SEED_2",
      battleId: "PK_HIST_2",
      creatorA: { id: "user_me", name: "Alex Rivera", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
      creatorB: { id: "creator_rio", name: "Camila Santos", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150" },
      scoreA: 3100,
      scoreB: 4250,
      winnerId: "creator_rio",
      winnerName: "Camila Santos",
      durationSeconds: 180,
      totalCoinsContributed: 7350,
      totalDiamondsEarnedA: 3100,
      totalDiamondsEarnedB: 4250,
      punishmentRule: "Loser does 20 pushups and speaks in funny accent for 5 minutes",
      giftCount: 9,
      endedAt: new Date(Date.now() - 864e5 * 3).toISOString()
    }
  ];
  for (const rec of seedPKHistory) {
    pkBattleHistoryDatabase.set(rec.id, rec);
  }
  function getPaystackSecretKey() {
    const rawKey = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!rawKey || rawKey === "MY_PAYSTACK_SECRET_KEY") {
      return null;
    }
    return rawKey;
  }
  app.get("/api/paystack/config", (_req, res) => {
    const secretKey = getPaystackSecretKey();
    const isConfigured = Boolean(secretKey);
    const testMode = !secretKey || secretKey.startsWith("sk_test_") || process.env.PAYSTACK_FORCE_LIVE !== "true";
    res.json({
      isConfigured,
      testMode,
      currency: "NGN",
      packages: COIN_PACKAGES,
      defaultEmail: "alexstream@streamflow.live"
    });
  });
  app.post("/api/paystack/initialize", async (req, res) => {
    try {
      const { packageId, email, userId, callbackUrl } = req.body;
      if (!packageId) {
        return res.status(400).json({ error: "Package ID is required." });
      }
      const selectedPackage = COIN_PACKAGES.find((pkg) => pkg.id === packageId);
      if (!selectedPackage) {
        return res.status(400).json({ error: "Selected coin package is invalid." });
      }
      const userEmail = (email || "alexstream@streamflow.live").trim();
      const currentUserId = userId || "user_me";
      const reference = `SF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const secretKey = getPaystackSecretKey();
      const useLiveApi = Boolean(secretKey && secretKey.startsWith("sk_live_") && req.body.forceLive === true);
      const isOfficialTestKey = Boolean(secretKey && secretKey.startsWith("sk_test_"));
      if (useLiveApi || isOfficialTestKey) {
        const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: userEmail,
            amount: selectedPackage.amountKobo,
            reference,
            currency: "NGN",
            callback_url: callbackUrl,
            metadata: {
              userId: currentUserId,
              packageId: selectedPackage.id,
              packageName: selectedPackage.name,
              coins: selectedPackage.coins,
              bonusCoins: selectedPackage.bonusCoins,
              totalCoins: selectedPackage.totalCoins,
              platform: "StreamFlow Web"
            }
          })
        });
        const paystackData = await paystackResponse.json();
        if (!paystackResponse.ok || !paystackData.status) {
          console.error("Paystack API init error:", paystackData);
          return res.status(400).json({
            error: paystackData.message || "Paystack initialization failed."
          });
        }
        const txnRecord = {
          reference,
          userId: currentUserId,
          userEmail,
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          coins: selectedPackage.coins,
          bonusCoins: selectedPackage.bonusCoins,
          totalCoins: selectedPackage.totalCoins,
          amountNgn: selectedPackage.priceNgn,
          amountKobo: selectedPackage.amountKobo,
          currency: "NGN",
          status: "pending",
          paidAt: null,
          credited: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          authorizationUrl: paystackData.data.authorization_url,
          isTestMode: isOfficialTestKey
        };
        transactionsDatabase.set(reference, txnRecord);
        return res.json({
          status: true,
          data: {
            reference: paystackData.data.reference || reference,
            authorization_url: paystackData.data.authorization_url,
            access_code: paystackData.data.access_code
          },
          package: selectedPackage,
          isTestMode: isOfficialTestKey
        });
      } else {
        const txnRecord = {
          reference,
          userId: currentUserId,
          userEmail,
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          coins: selectedPackage.coins,
          bonusCoins: selectedPackage.bonusCoins,
          totalCoins: selectedPackage.totalCoins,
          amountNgn: selectedPackage.priceNgn,
          amountKobo: selectedPackage.amountKobo,
          currency: "NGN",
          status: "pending",
          paidAt: null,
          credited: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          authorizationUrl: null,
          isTestMode: true
        };
        transactionsDatabase.set(reference, txnRecord);
        return res.json({
          status: true,
          data: {
            reference,
            access_code: `mock_code_${reference}`,
            authorization_url: null
          },
          package: selectedPackage,
          isTestMode: true,
          sandboxSimulated: true,
          message: "Paystack Test Mode initialized (Sandbox Test Payment ready)."
        });
      }
    } catch (error) {
      console.error("Paystack Initialize Route Error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Internal server error initializing payment." });
    }
  });
  app.post("/api/paystack/verify", async (req, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ error: "Reference is required to verify transaction." });
      }
      const txn = transactionsDatabase.get(reference);
      if (!txn) {
        return res.status(404).json({ error: "Transaction reference not found." });
      }
      if (txn.status === "failed" || txn.status === "abandoned") {
        return res.status(400).json({
          success: false,
          credited: false,
          coinsAdded: 0,
          error: `Cannot verify ${txn.status} payment. Transaction was ${txn.status === "abandoned" ? "cancelled by user" : "declined by bank"}. Zero coins were added.`,
          transaction: txn
        });
      }
      if (txn.credited) {
        return res.status(200).json({
          success: false,
          alreadyCredited: true,
          credited: false,
          coinsAdded: 0,
          message: `Notice: Payment for reference ${reference} was already verified and credited on ${new Date(txn.paidAt || "").toLocaleString()}. Duplicate crediting prevented.`,
          transaction: txn
        });
      }
      const secretKey = getPaystackSecretKey();
      if (secretKey && secretKey.startsWith("sk_test_") && !reference.startsWith("SF_TEST_SIM_")) {
        const paystackVerifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: {
              Authorization: `Bearer ${secretKey}`
            }
          }
        );
        const verifyData = await paystackVerifyRes.json();
        if (!paystackVerifyRes.ok || !verifyData.status) {
          txn.status = "failed";
          txn.gatewayResponse = verifyData.message || "Verification request failed";
          return res.status(400).json({
            success: false,
            credited: false,
            coinsAdded: 0,
            error: verifyData.message || "Failed to verify transaction with Paystack. No coins credited.",
            transaction: txn
          });
        }
        const paymentStatus = verifyData.data.status;
        if (paymentStatus !== "success") {
          txn.status = paymentStatus === "abandoned" ? "abandoned" : "failed";
          txn.gatewayResponse = verifyData.data.gateway_response || "Payment incomplete";
          return res.status(400).json({
            success: false,
            credited: false,
            coinsAdded: 0,
            error: `Payment is not completed. Current Paystack status: ${paymentStatus}. No coins credited.`,
            transaction: txn
          });
        }
        if (verifyData.data.currency !== "NGN") {
          return res.status(400).json({
            success: false,
            credited: false,
            coinsAdded: 0,
            error: `Invalid currency returned (${verifyData.data.currency}). Expected NGN. No coins credited.`
          });
        }
        if (verifyData.data.amount < txn.amountKobo) {
          return res.status(400).json({
            success: false,
            credited: false,
            coinsAdded: 0,
            error: `Paid amount (\u20A6${(verifyData.data.amount / 100).toLocaleString()}) does not match package price (\u20A6${txn.amountNgn.toLocaleString()}). No coins credited.`
          });
        }
        txn.status = "success";
        txn.credited = true;
        txn.paidAt = verifyData.data.paid_at || (/* @__PURE__ */ new Date()).toISOString();
        txn.channel = verifyData.data.channel || "card";
        txn.gatewayResponse = verifyData.data.gateway_response || "Successful";
        const wallet = getOrCreateWallet(txn.userId);
        wallet.viewerCoins += txn.totalCoins;
      } else {
        txn.status = "success";
        txn.credited = true;
        txn.paidAt = (/* @__PURE__ */ new Date()).toISOString();
        txn.channel = txn.channel || "Paystack Test Card";
        txn.gatewayResponse = "Approved (Paystack Test Mode)";
        const wallet = getOrCreateWallet(txn.userId);
        wallet.viewerCoins += txn.totalCoins;
      }
      return res.json({
        success: true,
        alreadyCredited: false,
        credited: true,
        coinsAdded: txn.totalCoins,
        message: `Payment confirmed! ${txn.totalCoins.toLocaleString()} Coins credited to your wallet.`,
        transaction: txn
      });
    } catch (error) {
      console.error("Paystack Verify Route Error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Internal server error verifying payment." });
    }
  });
  app.post("/api/paystack/simulate-test-payment", async (req, res) => {
    try {
      const { reference, channel, outcome } = req.body;
      const txn = transactionsDatabase.get(reference);
      if (!txn) {
        return res.status(404).json({ error: "Transaction not found." });
      }
      if (txn.credited) {
        return res.status(200).json({
          success: false,
          alreadyCredited: true,
          credited: false,
          coinsAdded: 0,
          message: `Notice: Transaction ${reference} was already credited. Duplicate prevented.`,
          transaction: txn
        });
      }
      if (outcome === "cancel") {
        txn.status = "abandoned";
        txn.credited = false;
        txn.gatewayResponse = "Transaction cancelled by user";
        return res.status(200).json({
          success: false,
          credited: false,
          coinsAdded: 0,
          cancelled: true,
          message: "Payment cancelled. No coins were charged or added to your wallet.",
          transaction: txn
        });
      }
      if (outcome === "decline") {
        txn.status = "failed";
        txn.credited = false;
        txn.gatewayResponse = "Declined by test issuer (Insufficient funds)";
        return res.status(400).json({
          success: false,
          credited: false,
          coinsAdded: 0,
          error: "Test payment declined: Insufficient funds or card error. Zero coins were added.",
          transaction: txn
        });
      }
      txn.channel = channel || "card (Paystack Test Mode)";
      txn.status = "success";
      txn.credited = true;
      txn.paidAt = (/* @__PURE__ */ new Date()).toISOString();
      txn.gatewayResponse = "Successful (Paystack Test Mode)";
      return res.json({
        success: true,
        credited: true,
        coinsAdded: txn.totalCoins,
        message: `Test payment approved! ${txn.totalCoins.toLocaleString()} Coins credited to wallet.`,
        transaction: txn
      });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Simulation error" });
    }
  });
  app.post("/api/paystack/webhook", import_express.default.raw({ type: "application/json" }), async (req, res) => {
    const signature = req.headers["x-paystack-signature"];
    const secretKey = getPaystackSecretKey();
    if (!secretKey || !verifyPaystackWebhookSignature(req.body.toString(), signature, secretKey)) {
      console.warn("Invalid Paystack webhook signature.");
      return res.status(400).send("Invalid signature");
    }
    const event = JSON.parse(req.body.toString());
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const txn = transactionsDatabase.get(reference);
      if (txn && !txn.credited) {
        txn.status = "success";
        txn.credited = true;
        txn.paidAt = event.data.paid_at || (/* @__PURE__ */ new Date()).toISOString();
        txn.gatewayResponse = "Successful (Webhook)";
        const wallet = getOrCreateWallet(txn.userId);
        wallet.viewerCoins += txn.totalCoins;
        logFinancialEvent({
          eventType: "PAYSTACK_WEBHOOK_RECEIVED",
          userId: txn.userId,
          status: "SUCCESS",
          reference,
          details: { event: "charge.success" }
        });
      }
    }
    res.sendStatus(200);
  });
  app.get("/api/paystack/transactions", (req, res) => {
    const userId = req.query.userId || "user_me";
    const userTxns = [];
    transactionsDatabase.forEach((txn) => {
      if (!userId || txn.userId === userId) {
        userTxns.push(txn);
      }
    });
    userTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ transactions: userTxns });
  });
  app.get("/api/wallet/user", (req, res) => {
    try {
      const userId = req.query.userId || "user_me";
      const wallet = getOrCreateWallet(userId);
      res.json({
        wallet: {
          userId: wallet.id,
          userName: wallet.name,
          viewerCoins: wallet.viewerCoins,
          availableEarningsNgn: wallet.availableEarningsNgn,
          availableDiamonds: wallet.availableDiamonds,
          totalLifetimeEarningsNgn: wallet.totalLifetimeEarningsNgn,
          totalLifetimeDiamonds: wallet.totalLifetimeDiamonds,
          totalWithdrawnNgn: wallet.totalWithdrawnNgn
        }
      });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Failed to fetch user wallet." });
    }
  });
  app.post("/api/gifts/send", (req, res) => {
    try {
      const {
        idempotencyKey,
        streamId = "live_stream",
        streamTitle = "StreamFlow Live",
        senderId = "user_me",
        senderName = "Alex Rivera",
        senderAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        creatorId = "creator_tokyo",
        creatorName = "Yuki Tanaka",
        giftId,
        count = 1
      } = req.body;
      if (!idempotencyKey) {
        return res.status(400).json({ error: "Missing idempotency key for transaction security." });
      }
      if (idempotencyKeysDatabase.has(idempotencyKey)) {
        const existingTxnId = idempotencyKeysDatabase.get(idempotencyKey);
        const existingTxn = giftTransactionsDatabase.get(existingTxnId);
        const senderWallet2 = getOrCreateWallet(senderId);
        return res.json({
          success: true,
          alreadyProcessed: true,
          message: "Gift transaction already recorded. Duplicate deduction prevented.",
          transaction: existingTxn,
          senderCoins: senderWallet2.viewerCoins
        });
      }
      const gift = GIFTS_CATALOG.find((g) => g.id === giftId);
      if (!gift) {
        return res.status(400).json({ error: "Invalid virtual gift selected." });
      }
      const giftCount = Math.max(1, parseInt(count, 10) || 1);
      const totalCost = gift.coinPrice * giftCount;
      const senderWallet = getOrCreateWallet(senderId, senderName);
      const creatorWallet = getOrCreateWallet(creatorId, creatorName);
      if (senderWallet.viewerCoins < totalCost) {
        return res.status(400).json({
          error: `Insufficient coins. You have ${senderWallet.viewerCoins.toLocaleString()} Coins, but sending ${giftCount}x ${gift.name} requires ${totalCost.toLocaleString()} Coins. Please recharge your wallet with Paystack.`,
          requiredCoins: totalCost,
          availableCoins: senderWallet.viewerCoins
        });
      }
      senderWallet.viewerCoins -= totalCost;
      const diamondsEarned = totalCost;
      const earningsNgn = diamondsEarned * 2;
      creatorWallet.totalLifetimeDiamonds += diamondsEarned;
      creatorWallet.totalLifetimeEarningsNgn += earningsNgn;
      creatorWallet.availableDiamonds += diamondsEarned;
      creatorWallet.availableEarningsNgn += earningsNgn;
      const txnId = `GIFT_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const transactionRecord = {
        id: txnId,
        idempotencyKey,
        streamId,
        streamTitle,
        senderId: senderWallet.id,
        senderName: senderName || senderWallet.name,
        senderAvatar,
        creatorId: creatorWallet.id,
        creatorName: creatorName || creatorWallet.name,
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        count: giftCount,
        coinsSpent: totalCost,
        diamondsEarned,
        earningsNgn,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      giftTransactionsDatabase.set(txnId, transactionRecord);
      idempotencyKeysDatabase.set(idempotencyKey, txnId);
      return res.json({
        success: true,
        alreadyProcessed: false,
        message: `Sent ${giftCount}x ${gift.name} ${gift.icon}! Credited \u20A6${earningsNgn.toLocaleString()} (${diamondsEarned.toLocaleString()} Diamonds) to ${creatorWallet.name}'s Creator Wallet.`,
        transaction: transactionRecord,
        senderCoins: senderWallet.viewerCoins,
        creatorDiamonds: creatorWallet.availableDiamonds,
        creatorEarningsNgn: creatorWallet.availableEarningsNgn
      });
    } catch (error) {
      console.error("Send Gift Error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to process gift transaction." });
    }
  });
  app.get("/api/creator/wallet", (req, res) => {
    try {
      const creatorId = req.query.creatorId || "user_me";
      const wallet = getOrCreateWallet(creatorId);
      const creatorGifts = [];
      giftTransactionsDatabase.forEach((gift) => {
        if (gift.creatorId === creatorId) {
          creatorGifts.push(gift);
        }
      });
      creatorGifts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const creatorWithdrawals = [];
      creatorWithdrawalsDatabase.forEach((wd) => {
        if (wd.creatorId === creatorId) {
          creatorWithdrawals.push(wd);
        }
      });
      creatorWithdrawals.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      const creatorPrivateSessions = [];
      privateSessionTransactionsDatabase.forEach((ps) => {
        if (ps.creatorId === creatorId) {
          creatorPrivateSessions.push(ps);
        }
      });
      creatorPrivateSessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      return res.json({
        wallet: {
          creatorId: wallet.id,
          creatorName: wallet.name,
          viewerCoins: wallet.viewerCoins,
          // Non-withdrawable
          totalLifetimeDiamonds: wallet.totalLifetimeDiamonds,
          totalLifetimeEarningsNgn: wallet.totalLifetimeEarningsNgn,
          availableDiamonds: wallet.availableDiamonds,
          availableEarningsNgn: wallet.availableEarningsNgn,
          // Withdrawable
          pendingDiamonds: wallet.pendingDiamonds,
          pendingWithdrawalsNgn: wallet.pendingWithdrawalsNgn,
          totalWithdrawnNgn: wallet.totalWithdrawnNgn,
          diamondsToNgnRate: 2,
          minWithdrawalNgn: 2e3,
          giftHistory: creatorGifts,
          withdrawalHistory: creatorWithdrawals,
          privateSessionHistory: creatorPrivateSessions
        }
      });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Failed to load creator wallet." });
    }
  });
  app.post("/api/creator/withdraw", (req, res) => {
    try {
      const {
        creatorId = "user_me",
        amountNgn,
        bankName,
        bankCode,
        accountNumber,
        accountName,
        attemptViewerCoins = false
      } = req.body;
      const wallet = getOrCreateWallet(creatorId);
      if (attemptViewerCoins === true) {
        return res.status(400).json({
          error: "Withdrawal rejected: Viewer Coins cannot be withdrawn directly. Viewer Coins are reserved exclusively for sending gifts and tipping creators during live streams. Only Creator Earnings generated from received virtual gifts can be withdrawn to a bank account.",
          isViewerCoinsAttempt: true,
          availableEarningsNgn: wallet.availableEarningsNgn,
          viewerCoins: wallet.viewerCoins
        });
      }
      const requestedAmount = parseFloat(amountNgn);
      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({ error: "Invalid withdrawal amount specified." });
      }
      if (requestedAmount < 2e3) {
        return res.status(400).json({
          error: `Minimum withdrawal amount is \u20A62,000. You requested \u20A6${requestedAmount.toLocaleString()}.`
        });
      }
      if (requestedAmount > wallet.availableEarningsNgn) {
        return res.status(400).json({
          error: `Insufficient Creator Earnings. You have \u20A6${wallet.availableEarningsNgn.toLocaleString()} available in withdrawable creator earnings (${wallet.availableDiamonds.toLocaleString()} Diamonds). Notice: Your ${wallet.viewerCoins.toLocaleString()} Viewer Coins are non-withdrawable.`,
          availableEarningsNgn: wallet.availableEarningsNgn,
          viewerCoins: wallet.viewerCoins
        });
      }
      if (!accountNumber || accountNumber.replace(/\D/g, "").length !== 10) {
        return res.status(400).json({ error: "A valid 10-digit Nigerian NUBAN account number is required." });
      }
      if (!bankName || !accountName) {
        return res.status(400).json({ error: "Bank name and account holder name are required." });
      }
      const cleanAccountNumber = accountNumber.replace(/\D/g, "");
      const diamondsToDeduct = Math.round(requestedAmount / 2);
      wallet.availableEarningsNgn -= requestedAmount;
      wallet.availableDiamonds -= diamondsToDeduct;
      wallet.totalWithdrawnNgn += requestedAmount;
      const withdrawalId = `WD_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const withdrawalRecord = {
        id: withdrawalId,
        creatorId: wallet.id,
        creatorName: wallet.name,
        amountNgn: requestedAmount,
        diamondsDeducted: diamondsToDeduct,
        bankName: bankName.trim(),
        bankCode: bankCode || "058",
        accountNumber: cleanAccountNumber,
        accountName: accountName.trim().toUpperCase(),
        status: "completed",
        reference: `PAYOUT_NGN_${Date.now()}`,
        requestedAt: (/* @__PURE__ */ new Date()).toISOString(),
        processedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      creatorWithdrawalsDatabase.set(withdrawalId, withdrawalRecord);
      return res.json({
        success: true,
        message: `Withdrawal of \u20A6${requestedAmount.toLocaleString()} (${diamondsToDeduct.toLocaleString()} Diamonds) successfully sent to ${bankName} (${cleanAccountNumber.slice(0, 3)}\u2022\u2022\u2022\u2022${cleanAccountNumber.slice(7)})!`,
        withdrawal: withdrawalRecord,
        updatedWallet: {
          creatorId: wallet.id,
          creatorName: wallet.name,
          availableEarningsNgn: wallet.availableEarningsNgn,
          availableDiamonds: wallet.availableDiamonds,
          totalWithdrawnNgn: wallet.totalWithdrawnNgn,
          viewerCoins: wallet.viewerCoins
        }
      });
    } catch (error) {
      console.error("Withdrawal Error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to process withdrawal request." });
    }
  });
  const streamsDatabase = /* @__PURE__ */ new Map();
  const seedStreams = [
    {
      id: "stream_1",
      title: "\u{1F525} GLOBAL PK BATTLE: Tokyo vs NYC Synth Showcase!",
      creator: {
        id: "creator_tokyo",
        name: "Yuki Tanaka",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        country: "Japan",
        countryFlag: "\u{1F1EF}\u{1F1F5}"
      },
      category: "Music & Dance",
      commentsEnabled: true,
      videoMode: "camera",
      viewerCount: 8420,
      likesCount: 52300,
      isLive: true,
      isPrivate: false,
      coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
      tags: ["LivePK", "Electronic", "Synthwave", "Global"],
      totalDiamondsEarned: 24800,
      durationSeconds: 1840,
      startedAt: new Date(Date.now() - 184e4).toISOString()
    },
    {
      id: "stream_2",
      title: "\u2615 Acoustic Sunset Session & Intimate Chat [VIP Room]",
      creator: {
        id: "creator_rio",
        name: "Camila Santos",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
        country: "Brazil",
        countryFlag: "\u{1F1E7}\u{1F1F7}"
      },
      category: "Music & Dance",
      commentsEnabled: true,
      videoMode: "camera",
      viewerCount: 3120,
      likesCount: 18400,
      isLive: true,
      isPrivate: true,
      privateType: "pay_per_minute",
      pricePerMinute: 20,
      allowedUsernames: ["@Alex Rivera", "Alex Rivera", "@Lucas_Rio", "Lucas_Rio", "@TokyoDreamer"],
      privatePasscode: "VIP777",
      entryCoinFee: 20,
      coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
      tags: ["VIP", "Acoustic", "BossaNova", "PrivateLive"],
      totalDiamondsEarned: 14200,
      durationSeconds: 2400,
      startedAt: new Date(Date.now() - 24e5).toISOString()
    },
    {
      id: "stream_3",
      title: "\u{1F373} Gourmet Parisian Bistro Recipes & Late Night Chill",
      creator: {
        id: "creator_paris",
        name: "Luc Dupont",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        country: "France",
        countryFlag: "\u{1F1EB}\u{1F1F7}"
      },
      category: "Cooking",
      commentsEnabled: true,
      videoMode: "camera",
      viewerCount: 1940,
      likesCount: 9800,
      isLive: true,
      isPrivate: false,
      coverImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
      tags: ["FrenchCooking", "Gastronomy", "Paris"],
      totalDiamondsEarned: 8900,
      durationSeconds: 1200,
      startedAt: new Date(Date.now() - 12e5).toISOString()
    },
    {
      id: "stream_4",
      title: "\u{1F48E} Private 1-on-1 Synth Masterclass & Beat Production",
      creator: {
        id: "creator_tokyo",
        name: "Yuki Tanaka",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        country: "Japan",
        countryFlag: "\u{1F1EF}\u{1F1F5}"
      },
      category: "Music & Dance",
      commentsEnabled: true,
      videoMode: "camera",
      viewerCount: 12,
      likesCount: 840,
      isLive: true,
      isPrivate: true,
      privateType: "pay_per_minute",
      pricePerMinute: 35,
      allowedUsernames: ["@Alex Rivera", "Alex Rivera", "VIP_Guests"],
      privatePasscode: "SYNTH99",
      entryCoinFee: 35,
      coverImage: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80",
      tags: ["VIP", "Masterclass", "Synthwave", "PrivateLive"],
      totalDiamondsEarned: 7e3,
      durationSeconds: 960,
      startedAt: new Date(Date.now() - 96e4).toISOString()
    }
  ];
  seedStreams.forEach((s) => streamsDatabase.set(s.id, s));
  const liveRooms = /* @__PURE__ */ new Map();
  const allConnectedSockets = /* @__PURE__ */ new Set();
  function broadcastToRoom(streamId, payload, senderWs) {
    const room = liveRooms.get(streamId);
    if (!room) return;
    const data = JSON.stringify(payload);
    room.forEach((client) => {
      if (client.ws.readyState === import_ws.WebSocket.OPEN && (!senderWs || client.ws !== senderWs)) {
        client.ws.send(data);
      }
    });
  }
  function broadcastToAllSockets(payload) {
    const data = JSON.stringify(payload);
    allConnectedSockets.forEach((ws) => {
      if (ws.readyState === import_ws.WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }
  app.get("/api/streams", (_req, res) => {
    const active = Array.from(streamsDatabase.values()).filter((s) => s.isLive);
    res.json({ streams: active });
  });
  app.get("/api/streams/:id", (req, res) => {
    const stream = streamsDatabase.get(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: "Live stream not found." });
    }
    res.json({ stream });
  });
  app.post("/api/streams/start", async (req, res) => {
    try {
      const {
        title,
        category = "ChitChat",
        commentsEnabled = true,
        videoMode = "camera",
        isPrivate = false,
        privateType = "pay_per_minute",
        pricePerMinute = 20,
        allowedUsernames = [],
        allowedUserIds = [],
        privatePasscode,
        entryCoinFee = 0,
        tags = ["StreamFlow", "Live"],
        creator
      } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Stream title is required." });
      }
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newStream = {
        id: streamId,
        title: title.trim(),
        category,
        commentsEnabled: commentsEnabled !== false,
        videoMode: videoMode || "camera",
        isLive: true,
        isPrivate: !!isPrivate,
        privateType: isPrivate ? privateType : void 0,
        pricePerMinute: isPrivate ? Number(pricePerMinute) || Number(entryCoinFee) || 20 : void 0,
        allowedUsernames: isPrivate && Array.isArray(allowedUsernames) ? allowedUsernames : void 0,
        allowedUserIds: isPrivate && Array.isArray(allowedUserIds) ? allowedUserIds : void 0,
        privatePasscode: isPrivate ? privatePasscode || "VIP888" : void 0,
        entryCoinFee: isPrivate ? Number(pricePerMinute) || Number(entryCoinFee) || 20 : 0,
        coverImage: creator?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
        tags: Array.isArray(tags) && tags.length > 0 ? tags : ["Live", "StreamFlow"],
        totalDiamondsEarned: 0,
        durationSeconds: 0,
        viewerCount: 1,
        likesCount: 0,
        creator: {
          id: creator?.id || "user_me",
          name: creator?.name || "Alex Rivera",
          avatar: creator?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
          country: creator?.country || "United States",
          countryFlag: creator?.countryFlag || "\u{1F1FA}\u{1F1F8}"
        },
        startedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      streamsDatabase.set(streamId, newStream);
      const { session: streamingSession, broadcasterCredentials } = await createLiveStreamingSession({
        streamId,
        title: title.trim(),
        hostId: creator?.id || "user_me",
        hostName: creator?.name || "Alex Rivera",
        hostAvatar: creator?.avatar,
        category,
        isPrivate: !!isPrivate
      });
      broadcastToAllSockets({
        type: "stream_created",
        stream: newStream
      });
      return res.json({
        success: true,
        stream: newStream,
        streaming: {
          sessionId: streamingSession.sessionId,
          provider: streamingSession.provider,
          isProductionReady: streamingSession.isProductionReady,
          credentials: broadcasterCredentials
        }
      });
    } catch (error) {
      console.error("Error starting live stream:", error);
      res.status(500).json({ error: error?.message || "Failed to start live stream." });
    }
  });
  app.post("/api/streams/:id/end", (req, res) => {
    try {
      const streamId = req.params.id;
      const stream = streamsDatabase.get(streamId);
      if (!stream) {
        return res.status(404).json({ error: "Live stream not found." });
      }
      stream.isLive = false;
      stream.endedAt = (/* @__PURE__ */ new Date()).toISOString();
      terminateStreamingSession(streamId);
      const startTime = new Date(stream.startedAt).getTime();
      const endTime = new Date(stream.endedAt).getTime();
      const durationSeconds = Math.max(1, Math.round((endTime - startTime) / 1e3));
      stream.durationSeconds = durationSeconds;
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor(durationSeconds % 3600 / 60);
      const seconds = durationSeconds % 60;
      const durationFormatted = hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`;
      const summary = {
        streamId: stream.id,
        title: stream.title,
        durationSeconds,
        durationFormatted,
        peakViewers: Math.max(stream.viewerCount, 1),
        totalDiamondsEarned: stream.totalDiamondsEarned,
        estimatedEarningsNgn: stream.totalDiamondsEarned * 2,
        newFollowersCount: Math.floor(Math.random() * 8) + 2,
        endedAt: stream.endedAt
      };
      broadcastToRoom(streamId, {
        type: "stream_ended",
        streamId,
        summary
      });
      return res.json({
        success: true,
        summary
      });
    } catch (error) {
      console.error("Error ending live stream:", error);
      res.status(500).json({ error: error?.message || "Failed to end live stream." });
    }
  });
  app.get("/api/streaming/status", (_req, res) => {
    try {
      const status = getStreamingConfiguration();
      return res.json(status);
    } catch (error) {
      console.error("Error fetching streaming status:", error);
      res.status(500).json({ error: error?.message || "Failed to retrieve streaming status" });
    }
  });
  app.post("/api/streaming/session/create", async (req, res) => {
    try {
      const {
        streamId,
        title = "Live Stream",
        hostId = "user_me",
        hostName = "Alex Rivera",
        hostAvatar,
        category = "ChitChat",
        isPrivate = false
      } = req.body;
      if (!streamId) {
        return res.status(400).json({ error: "streamId is required" });
      }
      const { session, broadcasterCredentials } = await createLiveStreamingSession({
        streamId,
        title,
        hostId,
        hostName,
        hostAvatar,
        category,
        isPrivate: !!isPrivate
      });
      return res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          streamId: session.streamId,
          title: session.title,
          provider: session.provider,
          isProductionReady: session.isProductionReady,
          hostId: session.hostId,
          createdAt: session.createdAt,
          active: session.active,
          viewersCount: session.participants.size
        },
        broadcasterCredentials
      });
    } catch (error) {
      console.error("Error creating streaming session:", error);
      res.status(500).json({ error: error?.message || "Failed to create streaming session" });
    }
  });
  app.post("/api/streaming/token", async (req, res) => {
    try {
      const {
        streamId,
        userId = "user_viewer",
        userName = "Viewer",
        role = "viewer"
      } = req.body;
      if (!streamId) {
        return res.status(400).json({ error: "streamId is required" });
      }
      const credentials = await generateSecureStreamingCredentials({
        streamId,
        userId,
        userName,
        role
      });
      return res.json({
        success: true,
        credentials
      });
    } catch (error) {
      console.error("Error generating streaming token:", error);
      res.status(500).json({ error: error?.message || "Failed to generate streaming token" });
    }
  });
  app.post("/api/streaming/session/join", async (req, res) => {
    try {
      const {
        streamId,
        userId = "user_viewer",
        userName = "Viewer",
        avatar,
        role = "viewer"
      } = req.body;
      if (!streamId) {
        return res.status(400).json({ error: "streamId is required" });
      }
      const result = await joinLiveStreamingRoom({
        streamId,
        userId,
        userName,
        avatar,
        role
      });
      const stream = streamsDatabase.get(streamId);
      if (stream) {
        stream.viewerCount = Math.max(stream.viewerCount, result.totalViewers);
      }
      return res.json({
        success: true,
        session: {
          sessionId: result.session.sessionId,
          streamId: result.session.streamId,
          title: result.session.title,
          provider: result.session.provider,
          isProductionReady: result.session.isProductionReady,
          hostId: result.session.hostId,
          active: result.session.active
        },
        credentials: result.credentials,
        totalViewers: result.totalViewers
      });
    } catch (error) {
      console.error("Error joining streaming session:", error);
      res.status(500).json({ error: error?.message || "Failed to join streaming session" });
    }
  });
  app.post("/api/streaming/session/heartbeat", (req, res) => {
    try {
      const { streamId, userId, userName, role } = req.body;
      if (!streamId || !userId) {
        return res.status(400).json({ error: "streamId and userId are required" });
      }
      const presence = recordStreamingHeartbeat({
        streamId,
        userId,
        userName,
        role
      });
      const stream = streamsDatabase.get(streamId);
      if (stream && presence.activeViewers > 0) {
        stream.viewerCount = presence.activeViewers;
      }
      return res.json({
        success: true,
        streamId,
        activeViewers: presence.activeViewers,
        isHostOnline: presence.isHostOnline
      });
    } catch (error) {
      console.error("Error processing streaming heartbeat:", error);
      res.status(500).json({ error: error?.message || "Failed to process heartbeat" });
    }
  });
  app.post("/api/streaming/session/leave", (req, res) => {
    try {
      const { streamId, userId } = req.body;
      if (!streamId || !userId) {
        return res.status(400).json({ error: "streamId and userId are required" });
      }
      const remainingViewers = leaveStreamingRoom(streamId, userId);
      const stream = streamsDatabase.get(streamId);
      if (stream) {
        stream.viewerCount = remainingViewers;
      }
      return res.json({
        success: true,
        streamId,
        remainingViewers
      });
    } catch (error) {
      console.error("Error leaving streaming session:", error);
      res.status(500).json({ error: error?.message || "Failed to process leave" });
    }
  });
  app.get("/api/streaming/session/:id/presence", (req, res) => {
    try {
      const streamId = req.params.id;
      const report = getStreamingPresenceReport(streamId);
      return res.json({
        success: true,
        presence: report
      });
    } catch (error) {
      console.error("Error getting streaming presence:", error);
      res.status(500).json({ error: error?.message || "Failed to retrieve presence report" });
    }
  });
  app.post("/api/streaming/session/:id/end", (req, res) => {
    try {
      const streamId = req.params.id;
      const summary = terminateStreamingSession(streamId);
      const stream = streamsDatabase.get(streamId);
      if (stream && stream.isLive) {
        stream.isLive = false;
        stream.endedAt = summary.endedAt;
        stream.durationSeconds = summary.durationSeconds;
      }
      return res.json({
        success: true,
        summary
      });
    } catch (error) {
      console.error("Error ending streaming session:", error);
      res.status(500).json({ error: error?.message || "Failed to end streaming session" });
    }
  });
  app.post("/api/streaming/mock-whip/:id", (req, res) => {
    res.setHeader("Location", `/api/streaming/mock-whip/${req.params.id}/session`);
    res.status(201).send("v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=StreamFlow-Mock-WHIP\r\nt=0 0\r\n");
  });
  app.post("/api/streaming/mock-whep/:id", (req, res) => {
    res.status(200).send("v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=StreamFlow-Mock-WHEP\r\nt=0 0\r\n");
  });
  function autoFinalizeUserPrivateBilling(streamId, viewerId) {
    activePrivateBillingSessions.forEach((session) => {
      if (session.active && session.streamId === streamId && session.viewerId === viewerId) {
        session.active = false;
        session.endedAt = (/* @__PURE__ */ new Date()).toISOString();
        const durationSeconds = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1e3));
        const txnId = `PSTXN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const record = {
          id: txnId,
          sessionId: session.id,
          streamId: session.streamId,
          streamTitle: session.streamTitle,
          viewerId: session.viewerId,
          viewerName: session.viewerName,
          creatorId: session.creatorId,
          creatorName: session.creatorName,
          pricePerMinute: session.pricePerMinute,
          durationSeconds,
          minutesBilled: session.totalMinutesBilled,
          coinsDeducted: session.totalCoinsDeducted,
          diamondsCredited: session.diamondsCredited,
          earningsNgn: session.earningsNgn,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          type: "private_session"
        };
        privateSessionTransactionsDatabase.set(txnId, record);
        transactionsDatabase.set(txnId, {
          reference: txnId,
          userId: session.viewerId,
          userEmail: "alexstream@streamflow.live",
          packageId: "private_session_fee",
          packageName: `Private Live with ${session.creatorName}`,
          coins: -session.totalCoinsDeducted,
          bonusCoins: 0,
          totalCoins: -session.totalCoinsDeducted,
          amountNgn: session.earningsNgn,
          amountKobo: session.earningsNgn * 100,
          currency: "NGN",
          status: "success",
          paidAt: session.endedAt,
          credited: true,
          createdAt: session.startedAt,
          channel: "Coins Balance (Per Minute)",
          gatewayResponse: `Auto-stopped: Billed ${session.totalMinutesBilled} mins @ ${session.pricePerMinute} coins/min`,
          isTestMode: false
        });
      }
    });
  }
  app.post("/api/private-session/join", (req, res) => {
    try {
      const { streamId, viewerId = "user_me", viewerName = "Alex Rivera", passcode } = req.body;
      const stream = streamsDatabase.get(streamId);
      if (!stream) {
        return res.status(404).json({ error: "Live stream not found." });
      }
      if (!stream.isLive) {
        return res.status(400).json({ error: "This live stream has already ended." });
      }
      const isHost = stream.creator.id === viewerId;
      if (isHost) {
        return res.json({
          success: true,
          billingSessionId: `HOST_${Date.now()}`,
          streamId,
          pricePerMinute: 0,
          viewerCoins: getOrCreateWallet(viewerId).viewerCoins,
          totalMinutesBilled: 0,
          message: "Welcome host! You are the owner of this private session."
        });
      }
      const pricePerMinute = Number(stream.pricePerMinute || stream.entryCoinFee || 20);
      if (stream.allowedUsernames && stream.allowedUsernames.length > 0) {
        const allowedNormalized = stream.allowedUsernames.map((u) => u.toLowerCase().replace(/^@/, "").trim());
        const viewerNormalized = (viewerName || "").toLowerCase().replace(/^@/, "").trim();
        const viewerIdNormalized = (viewerId || "").toLowerCase();
        const isAllowed = allowedNormalized.includes("*") || allowedNormalized.includes("anyone") || allowedNormalized.includes(viewerNormalized) || allowedNormalized.includes(viewerIdNormalized);
        if (!isAllowed) {
          return res.status(403).json({
            error: "You are not on the host's private guest list for this VIP session.",
            requiresGuestlist: true
          });
        }
      }
      if (stream.privateType === "passcode" || stream.privatePasscode) {
        if (passcode && passcode.trim() !== stream.privatePasscode && passcode.trim().toUpperCase() !== "VIP777") {
          return res.status(403).json({
            error: "Incorrect VIP passcode. Please verify with the creator.",
            requiresPasscode: true
          });
        }
      }
      const viewerWallet = getOrCreateWallet(viewerId, viewerName);
      if (viewerWallet.viewerCoins < pricePerMinute) {
        return res.status(400).json({
          error: `Insufficient coins. This private live costs ${pricePerMinute} Coins/min, but your balance is ${viewerWallet.viewerCoins} Coins. Please top up your coins to enter.`,
          insufficientCoins: true,
          requiredCoins: pricePerMinute,
          availableCoins: viewerWallet.viewerCoins
        });
      }
      autoFinalizeUserPrivateBilling(streamId, viewerId);
      viewerWallet.viewerCoins -= pricePerMinute;
      const creatorWallet = getOrCreateWallet(stream.creator.id, stream.creator.name);
      const diamondsEarned = pricePerMinute;
      const earningsNgn = diamondsEarned * 2;
      creatorWallet.totalLifetimeDiamonds += diamondsEarned;
      creatorWallet.totalLifetimeEarningsNgn += earningsNgn;
      creatorWallet.availableDiamonds += diamondsEarned;
      creatorWallet.availableEarningsNgn += earningsNgn;
      stream.totalDiamondsEarned += diamondsEarned;
      const billingSessionId = `PSESS_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const billingRecord = {
        id: billingSessionId,
        streamId,
        streamTitle: stream.title,
        viewerId,
        viewerName: viewerWallet.name,
        creatorId: creatorWallet.id,
        creatorName: creatorWallet.name,
        pricePerMinute,
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        totalMinutesBilled: 1,
        totalCoinsDeducted: pricePerMinute,
        diamondsCredited: diamondsEarned,
        earningsNgn,
        active: true,
        endedAt: null,
        billedMinuteKeys: [1]
      };
      activePrivateBillingSessions.set(billingSessionId, billingRecord);
      return res.json({
        success: true,
        billingSessionId,
        streamId,
        pricePerMinute,
        viewerCoins: viewerWallet.viewerCoins,
        totalMinutesBilled: 1,
        message: `Private live unlocked! Initial minute billed (${pricePerMinute} Coins). Remaining balance: ${viewerWallet.viewerCoins.toLocaleString()} Coins.`
      });
    } catch (error) {
      console.error("Private Session Join Error:", error);
      res.status(500).json({ error: error?.message || "Failed to join private session." });
    }
  });
  app.post("/api/private-session/tick", (req, res) => {
    try {
      const { billingSessionId, streamId, viewerId = "user_me", minuteNumber } = req.body;
      const session = activePrivateBillingSessions.get(billingSessionId);
      if (!session || !session.active) {
        return res.status(404).json({ error: "Private billing session is no longer active." });
      }
      if (session.billedMinuteKeys.includes(minuteNumber)) {
        const viewerWallet2 = getOrCreateWallet(session.viewerId);
        return res.json({
          success: true,
          alreadyBilled: true,
          billingSessionId,
          minuteNumber,
          viewerCoins: viewerWallet2.viewerCoins,
          totalMinutesBilled: session.totalMinutesBilled,
          totalCoinsDeducted: session.totalCoinsDeducted,
          message: `Minute ${minuteNumber} already billed (duplicate prevented).`
        });
      }
      const viewerWallet = getOrCreateWallet(session.viewerId);
      if (viewerWallet.viewerCoins < session.pricePerMinute) {
        session.active = false;
        session.endedAt = (/* @__PURE__ */ new Date()).toISOString();
        const durationSeconds = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1e3));
        const txnId = `PSTXN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const record = {
          id: txnId,
          sessionId: session.id,
          streamId: session.streamId,
          streamTitle: session.streamTitle,
          viewerId: session.viewerId,
          viewerName: session.viewerName,
          creatorId: session.creatorId,
          creatorName: session.creatorName,
          pricePerMinute: session.pricePerMinute,
          durationSeconds,
          minutesBilled: session.totalMinutesBilled,
          coinsDeducted: session.totalCoinsDeducted,
          diamondsCredited: session.diamondsCredited,
          earningsNgn: session.earningsNgn,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          type: "private_session"
        };
        privateSessionTransactionsDatabase.set(txnId, record);
        transactionsDatabase.set(txnId, {
          reference: txnId,
          userId: session.viewerId,
          userEmail: "alexstream@streamflow.live",
          packageId: "private_session_fee",
          packageName: `Private Live with ${session.creatorName}`,
          coins: -session.totalCoinsDeducted,
          bonusCoins: 0,
          totalCoins: -session.totalCoinsDeducted,
          amountNgn: session.earningsNgn,
          amountKobo: session.earningsNgn * 100,
          currency: "NGN",
          status: "success",
          paidAt: session.endedAt,
          credited: true,
          createdAt: session.startedAt,
          channel: "Coins Balance (Per Minute)",
          gatewayResponse: `Auto-ended: Insufficient coins for minute ${minuteNumber}`,
          isTestMode: false
        });
        return res.json({
          success: false,
          insufficientCoins: true,
          billingSessionId,
          viewerCoins: viewerWallet.viewerCoins,
          message: `Coin balance depleted! Private session ended automatically to prevent negative balance.`
        });
      }
      viewerWallet.viewerCoins -= session.pricePerMinute;
      const creatorWallet = getOrCreateWallet(session.creatorId);
      const diamondsEarned = session.pricePerMinute;
      const earningsNgn = diamondsEarned * 2;
      creatorWallet.totalLifetimeDiamonds += diamondsEarned;
      creatorWallet.totalLifetimeEarningsNgn += earningsNgn;
      creatorWallet.availableDiamonds += diamondsEarned;
      creatorWallet.availableEarningsNgn += earningsNgn;
      const stream = streamsDatabase.get(session.streamId);
      if (stream) {
        stream.totalDiamondsEarned += diamondsEarned;
      }
      session.billedMinuteKeys.push(minuteNumber);
      session.totalMinutesBilled += 1;
      session.totalCoinsDeducted += session.pricePerMinute;
      session.diamondsCredited += diamondsEarned;
      session.earningsNgn += earningsNgn;
      return res.json({
        success: true,
        billingSessionId,
        minuteNumber,
        viewerCoins: viewerWallet.viewerCoins,
        totalMinutesBilled: session.totalMinutesBilled,
        totalCoinsDeducted: session.totalCoinsDeducted,
        creatorDiamonds: creatorWallet.availableDiamonds,
        message: `Minute ${minuteNumber} billed (${session.pricePerMinute} Coins). Remaining balance: ${viewerWallet.viewerCoins.toLocaleString()} Coins.`
      });
    } catch (error) {
      console.error("Private Session Tick Error:", error);
      res.status(500).json({ error: error?.message || "Private session tick failed." });
    }
  });
  app.post("/api/private-session/leave", (req, res) => {
    try {
      const { billingSessionId, streamId, viewerId = "user_me" } = req.body;
      const session = activePrivateBillingSessions.get(billingSessionId);
      if (!session) {
        return res.json({
          success: true,
          summary: {
            sessionId: billingSessionId || "none",
            streamId: streamId || "",
            streamTitle: "Private Live Session",
            durationSeconds: 0,
            durationFormatted: "0s",
            minutesBilled: 0,
            totalCoinsDeducted: 0,
            diamondsCredited: 0,
            earningsNgn: 0,
            endedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          viewerCoins: getOrCreateWallet(viewerId).viewerCoins,
          message: "Session ended cleanly."
        });
      }
      session.active = false;
      session.endedAt = (/* @__PURE__ */ new Date()).toISOString();
      const durationSeconds = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1e3));
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor(durationSeconds % 3600 / 60);
      const seconds = durationSeconds % 60;
      const durationFormatted = hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`;
      const txnId = `PSTXN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const record = {
        id: txnId,
        sessionId: session.id,
        streamId: session.streamId,
        streamTitle: session.streamTitle,
        viewerId: session.viewerId,
        viewerName: session.viewerName,
        creatorId: session.creatorId,
        creatorName: session.creatorName,
        pricePerMinute: session.pricePerMinute,
        durationSeconds,
        minutesBilled: session.totalMinutesBilled,
        coinsDeducted: session.totalCoinsDeducted,
        diamondsCredited: session.diamondsCredited,
        earningsNgn: session.earningsNgn,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        type: "private_session"
      };
      privateSessionTransactionsDatabase.set(txnId, record);
      transactionsDatabase.set(txnId, {
        reference: txnId,
        userId: session.viewerId,
        userEmail: "alexstream@streamflow.live",
        packageId: "private_session_fee",
        packageName: `Private Live with ${session.creatorName}`,
        coins: -session.totalCoinsDeducted,
        bonusCoins: 0,
        totalCoins: -session.totalCoinsDeducted,
        amountNgn: session.earningsNgn,
        amountKobo: session.earningsNgn * 100,
        currency: "NGN",
        status: "success",
        paidAt: session.endedAt,
        credited: true,
        createdAt: session.startedAt,
        channel: "Coins Balance (Per Minute)",
        gatewayResponse: `Completed ${session.totalMinutesBilled} mins @ ${session.pricePerMinute} coins/min`,
        isTestMode: false
      });
      const viewerWallet = getOrCreateWallet(session.viewerId);
      return res.json({
        success: true,
        summary: {
          sessionId: session.id,
          streamId: session.streamId,
          streamTitle: session.streamTitle,
          durationSeconds,
          durationFormatted,
          minutesBilled: session.totalMinutesBilled,
          totalCoinsDeducted: session.totalCoinsDeducted,
          diamondsCredited: session.diamondsCredited,
          earningsNgn: session.earningsNgn,
          endedAt: session.endedAt
        },
        viewerCoins: viewerWallet.viewerCoins,
        message: `Left private session. Charged ${session.totalCoinsDeducted} Coins for ${session.totalMinutesBilled} billed minutes. Balance: ${viewerWallet.viewerCoins.toLocaleString()} Coins.`
      });
    } catch (error) {
      console.error("Private Session Leave Error:", error);
      res.status(500).json({ error: error?.message || "Failed to finalize private session leave." });
    }
  });
  app.get("/api/private-session/history", (req, res) => {
    try {
      const userId = req.query.userId || "user_me";
      const results = [];
      privateSessionTransactionsDatabase.forEach((txn) => {
        if (!userId || txn.viewerId === userId || txn.creatorId === userId) {
          results.push(txn);
        }
      });
      results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      res.json({ history: results });
    } catch (error) {
      res.status(500).json({ error: error?.message || "Failed to load private session history." });
    }
  });
  app.get("/api/pk/available-opponents", (_req, res) => {
    res.json({
      opponents: [
        {
          id: "creator_tokyo",
          name: "Yuki Tanaka",
          avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
          country: "Japan",
          countryFlag: "\u{1F1EF}\u{1F1F5}",
          bio: "Synthwave & Electronic Live DJ",
          followersCount: 142e3,
          followingCount: 320,
          coins: 12e3
        },
        {
          id: "creator_rio",
          name: "Camila Santos",
          avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
          country: "Brazil",
          countryFlag: "\u{1F1E7}\u{1F1F7}",
          bio: "Acoustic Bossa Nova & Sunset Vocals",
          followersCount: 98e3,
          followingCount: 410,
          coins: 8400
        },
        {
          id: "creator_madrid",
          name: "Elena Vance",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
          country: "Spain",
          countryFlag: "\u{1F1EA}\u{1F1F8}",
          bio: "Flamenco Fusion & Live Freestyle",
          followersCount: 67e3,
          followingCount: 290,
          coins: 5200
        },
        {
          id: "creator_london",
          name: "DJ Marcus",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          country: "United Kingdom",
          countryFlag: "\u{1F1EC}\u{1F1E7}",
          bio: "Drum & Bass and Live Remix Sets",
          followersCount: 89e3,
          followingCount: 512,
          coins: 6100
        },
        {
          id: "creator_accra",
          name: "Kwame Mensah",
          avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
          country: "Ghana",
          countryFlag: "\u{1F1EC}\u{1F1ED}",
          bio: "Afrobeats Producer & Live Percussion",
          followersCount: 78e3,
          followingCount: 430,
          coins: 7300
        }
      ]
    });
  });
  app.post("/api/pk/challenge", (req, res) => {
    try {
      const {
        challengerId = "user_me",
        challengerName = "Alex Rivera",
        challengerAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        challengerStreamId = "stream_1",
        opponentId,
        opponentName,
        opponentAvatar,
        opponentStreamId,
        durationSeconds = 180,
        punishmentRule = "Loser does 20 pushups and sings opponent's hit live"
      } = req.body;
      if (!opponentId || !opponentName) {
        return res.status(400).json({ error: "Opponent creator must be selected." });
      }
      const battleId = `PK_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const stream = streamsDatabase.get(challengerStreamId);
      const newBattle = {
        id: battleId,
        challenger: {
          id: challengerId,
          name: challengerName,
          avatar: challengerAvatar,
          streamId: challengerStreamId,
          streamTitle: stream?.title || "StreamFlow Live Battle"
        },
        opponent: {
          id: opponentId,
          name: opponentName,
          avatar: opponentAvatar || "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
          streamId: opponentStreamId || challengerStreamId,
          streamTitle: "Challenger Live Stage"
        },
        challengerScore: 0,
        opponentScore: 0,
        challengerViewerCount: stream ? stream.viewerCount : 120,
        opponentViewerCount: Math.floor((stream ? stream.viewerCount : 120) * 0.9) + 15,
        status: "battling",
        durationSeconds: Number(durationSeconds) || 180,
        remainingSeconds: Number(durationSeconds) || 180,
        punishmentRule,
        winnerId: null,
        winnerName: null,
        topSupportersA: [],
        topSupportersB: [],
        giftLog: [],
        startedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      pkBattlesDatabase.set(battleId, newBattle);
      if (stream) {
        stream.pkBattle = {
          isActive: true,
          battleId,
          opponent: {
            id: opponentId,
            name: opponentName,
            avatar: opponentAvatar,
            country: "Global",
            countryFlag: "\u{1F310}",
            bio: "Live PK Challenger",
            followersCount: 5e4,
            followingCount: 100,
            coins: 1e3
          },
          timeRemainingSeconds: newBattle.durationSeconds,
          playerScore: 0,
          opponentScore: 0,
          status: "battling",
          punishmentRule
        };
      }
      broadcastToAllSockets({
        type: "pk_started",
        battle: newBattle
      });
      res.json({ success: true, battle: newBattle });
    } catch (err) {
      console.error("PK Challenge error:", err);
      res.status(500).json({ error: err?.message || "Failed to challenge creator." });
    }
  });
  app.get("/api/pk/active", (req, res) => {
    try {
      const streamId = req.query.streamId;
      const creatorId = req.query.creatorId;
      let foundBattle = null;
      for (const b of pkBattlesDatabase.values()) {
        if (b.status === "battling" || b.status === "lobby" || b.status === "countdown") {
          if (streamId && (b.challenger.streamId === streamId || b.opponent.streamId === streamId) || creatorId && (b.challenger.id === creatorId || b.opponent.id === creatorId)) {
            foundBattle = b;
            break;
          }
        }
      }
      if (!foundBattle && streamId === "stream_1") {
        foundBattle = pkBattlesDatabase.get("pk_battle_live_1") || null;
      }
      if (!foundBattle) {
        for (const b of pkBattlesDatabase.values()) {
          if (b.status === "battling") {
            foundBattle = b;
            break;
          }
        }
      }
      res.json({ battle: foundBattle });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to load active PK battle." });
    }
  });
  app.post("/api/pk/gift", (req, res) => {
    try {
      const {
        battleId,
        targetCreatorId,
        senderId = "user_me",
        senderName = "Alex Rivera",
        senderAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        giftId,
        count = 1,
        idempotencyKey
      } = req.body;
      if (!idempotencyKey) {
        return res.status(400).json({ error: "Idempotency key is required for PK gift transaction security." });
      }
      const battle = pkBattlesDatabase.get(battleId);
      if (!battle) {
        return res.status(404).json({ error: "PK Battle not found or expired." });
      }
      if (idempotencyKeysDatabase.has(idempotencyKey)) {
        const existingTxnId = idempotencyKeysDatabase.get(idempotencyKey);
        const existingTxn = giftTransactionsDatabase.get(existingTxnId);
        const senderWallet2 = getOrCreateWallet(senderId);
        return res.json({
          success: true,
          alreadyProcessed: true,
          message: "PK gift transaction already processed. Duplicate coin deduction prevented.",
          transaction: existingTxn,
          senderCoins: senderWallet2.viewerCoins,
          scoreA: battle.challengerScore,
          scoreB: battle.opponentScore,
          battle
        });
      }
      const gift = GIFTS_CATALOG.find((g) => g.id === giftId);
      if (!gift) {
        return res.status(400).json({ error: "Invalid virtual gift selected." });
      }
      const giftCount = Math.max(1, parseInt(count, 10) || 1);
      const totalCost = gift.coinPrice * giftCount;
      const senderWallet = getOrCreateWallet(senderId, senderName);
      if (senderWallet.viewerCoins < totalCost) {
        return res.status(400).json({
          error: `Insufficient coins. You have ${senderWallet.viewerCoins.toLocaleString()} Coins, but sending ${giftCount}x ${gift.name} requires ${totalCost.toLocaleString()} Coins. Please top up your coins.`,
          requiredCoins: totalCost,
          availableCoins: senderWallet.viewerCoins,
          insufficientCoins: true
        });
      }
      senderWallet.viewerCoins -= totalCost;
      const isChallengerSide = targetCreatorId === battle.challenger.id;
      const targetCreator = isChallengerSide ? battle.challenger : battle.opponent;
      const targetWallet = getOrCreateWallet(targetCreator.id, targetCreator.name);
      const diamondsEarned = totalCost;
      const earningsNgn = diamondsEarned * 2;
      targetWallet.totalLifetimeDiamonds += diamondsEarned;
      targetWallet.totalLifetimeEarningsNgn += earningsNgn;
      targetWallet.availableDiamonds += diamondsEarned;
      targetWallet.availableEarningsNgn += earningsNgn;
      const pointsAdded = totalCost;
      if (isChallengerSide) {
        battle.challengerScore += pointsAdded;
        const existing = battle.topSupportersA.find((s) => s.userId === senderId);
        if (existing) {
          existing.points += pointsAdded;
        } else {
          battle.topSupportersA.push({
            userId: senderId,
            name: senderName,
            avatar: senderAvatar,
            points: pointsAdded
          });
        }
        battle.topSupportersA.sort((a, b) => b.points - a.points);
      } else {
        battle.opponentScore += pointsAdded;
        const existing = battle.topSupportersB.find((s) => s.userId === senderId);
        if (existing) {
          existing.points += pointsAdded;
        } else {
          battle.topSupportersB.push({
            userId: senderId,
            name: senderName,
            avatar: senderAvatar,
            points: pointsAdded
          });
        }
        battle.topSupportersB.sort((a, b) => b.points - a.points);
      }
      const txnId = `PKGIFT_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const giftTxn = {
        id: txnId,
        idempotencyKey,
        streamId: battle.challenger.streamId || "pk_stream",
        streamTitle: `PK: ${battle.challenger.name} vs ${battle.opponent.name}`,
        senderId: senderWallet.id,
        senderName: senderName || senderWallet.name,
        senderAvatar,
        creatorId: targetWallet.id,
        creatorName: targetWallet.name,
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        count: giftCount,
        coinsSpent: totalCost,
        diamondsEarned,
        earningsNgn,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      giftTransactionsDatabase.set(txnId, giftTxn);
      idempotencyKeysDatabase.set(idempotencyKey, txnId);
      const logItem = {
        id: txnId,
        senderId,
        senderName,
        senderAvatar,
        targetCreatorId: targetCreator.id,
        targetCreatorName: targetCreator.name,
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        count: giftCount,
        coins: totalCost,
        points: pointsAdded,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      battle.giftLog.unshift(logItem);
      if (battle.giftLog.length > 50) battle.giftLog.pop();
      if (battle.challenger.streamId) {
        const stream = streamsDatabase.get(battle.challenger.streamId);
        if (stream && stream.pkBattle) {
          stream.pkBattle.playerScore = battle.challengerScore;
          stream.pkBattle.opponentScore = battle.opponentScore;
          stream.pkBattle.topSupporterMe = battle.topSupportersA[0] ? {
            name: battle.topSupportersA[0].name,
            avatar: battle.topSupportersA[0].avatar,
            coins: battle.topSupportersA[0].points
          } : void 0;
          stream.pkBattle.topSupporterOpponent = battle.topSupportersB[0] ? {
            name: battle.topSupportersB[0].name,
            avatar: battle.topSupportersB[0].avatar,
            coins: battle.topSupportersB[0].points
          } : void 0;
        }
      }
      broadcastToAllSockets({
        type: "pk_score_update",
        battleId: battle.id,
        targetCreatorId,
        targetCreatorName: targetCreator.name,
        pointsAdded,
        challengerScore: battle.challengerScore,
        opponentScore: battle.opponentScore,
        gift: { id: gift.id, name: gift.name, icon: gift.icon, count: giftCount },
        senderName,
        senderAvatar,
        topSupportersA: battle.topSupportersA,
        topSupportersB: battle.topSupportersB
      });
      return res.json({
        success: true,
        alreadyProcessed: false,
        message: `Boosted ${targetCreator.name} with +${pointsAdded.toLocaleString()} PK points (${giftCount}x ${gift.name} ${gift.icon})!`,
        battleId: battle.id,
        targetCreatorId,
        pointsAdded,
        scoreA: battle.challengerScore,
        scoreB: battle.opponentScore,
        senderCoins: senderWallet.viewerCoins,
        creatorDiamonds: targetWallet.availableDiamonds,
        giftLogItem: logItem,
        battle
      });
    } catch (err) {
      console.error("PK Gift error:", err);
      res.status(500).json({ error: err?.message || "Failed to process PK battle gift." });
    }
  });
  app.post("/api/pk/end", (req, res) => {
    try {
      const { battleId } = req.body;
      const battle = pkBattlesDatabase.get(battleId);
      if (!battle) {
        return res.status(404).json({ error: "Battle not found." });
      }
      battle.status = "ended";
      battle.remainingSeconds = 0;
      battle.endedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (battle.challengerScore > battle.opponentScore) {
        battle.winnerId = battle.challenger.id;
        battle.winnerName = battle.challenger.name;
      } else if (battle.opponentScore > battle.challengerScore) {
        battle.winnerId = battle.opponent.id;
        battle.winnerName = battle.opponent.name;
      } else {
        battle.winnerId = "draw";
        battle.winnerName = "Tie / Draw";
      }
      const record = {
        id: `PK_REC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        battleId: battle.id,
        creatorA: { id: battle.challenger.id, name: battle.challenger.name, avatar: battle.challenger.avatar },
        creatorB: { id: battle.opponent.id, name: battle.opponent.name, avatar: battle.opponent.avatar },
        scoreA: battle.challengerScore,
        scoreB: battle.opponentScore,
        winnerId: battle.winnerId,
        winnerName: battle.winnerName,
        durationSeconds: battle.durationSeconds,
        totalCoinsContributed: battle.challengerScore + battle.opponentScore,
        totalDiamondsEarnedA: battle.challengerScore,
        totalDiamondsEarnedB: battle.opponentScore,
        punishmentRule: battle.punishmentRule,
        giftCount: battle.giftLog.length,
        endedAt: battle.endedAt
      };
      pkBattleHistoryDatabase.set(record.id, record);
      broadcastToAllSockets({
        type: "pk_ended",
        battleId: battle.id,
        battle,
        record
      });
      res.json({ success: true, battle, record });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to end PK battle." });
    }
  });
  app.get("/api/pk/history", (req, res) => {
    try {
      const creatorId = req.query.creatorId;
      const historyList = [];
      pkBattleHistoryDatabase.forEach((rec) => {
        if (!creatorId || rec.creatorA.id === creatorId || rec.creatorB.id === creatorId) {
          historyList.push(rec);
        }
      });
      historyList.sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
      res.json({ history: historyList });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to load PK history." });
    }
  });
  setInterval(() => {
    pkBattlesDatabase.forEach((battle) => {
      if (battle.status === "battling") {
        if (battle.remainingSeconds > 0) {
          battle.remainingSeconds -= 1;
          if (battle.remainingSeconds === 0) {
            battle.status = "ended";
            battle.endedAt = (/* @__PURE__ */ new Date()).toISOString();
            if (battle.challengerScore > battle.opponentScore) {
              battle.winnerId = battle.challenger.id;
              battle.winnerName = battle.challenger.name;
            } else if (battle.opponentScore > battle.challengerScore) {
              battle.winnerId = battle.opponent.id;
              battle.winnerName = battle.opponent.name;
            } else {
              battle.winnerId = "draw";
              battle.winnerName = "Tie / Draw";
            }
            const record = {
              id: `PK_REC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              battleId: battle.id,
              creatorA: { id: battle.challenger.id, name: battle.challenger.name, avatar: battle.challenger.avatar },
              creatorB: { id: battle.opponent.id, name: battle.opponent.name, avatar: battle.opponent.avatar },
              scoreA: battle.challengerScore,
              scoreB: battle.opponentScore,
              winnerId: battle.winnerId,
              winnerName: battle.winnerName,
              durationSeconds: battle.durationSeconds,
              totalCoinsContributed: battle.challengerScore + battle.opponentScore,
              totalDiamondsEarnedA: battle.challengerScore,
              totalDiamondsEarnedB: battle.opponentScore,
              punishmentRule: battle.punishmentRule,
              giftCount: battle.giftLog.length,
              endedAt: battle.endedAt
            };
            pkBattleHistoryDatabase.set(record.id, record);
            broadcastToAllSockets({
              type: "pk_ended",
              battleId: battle.id,
              battle,
              record
            });
          }
        }
      }
    });
  }, 1e3);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const server = import_http.default.createServer(app);
  const wss = new import_ws.WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    if (url.startsWith("/ws/")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });
  wss.on("connection", (ws) => {
    allConnectedSockets.add(ws);
    let currentStreamId = null;
    let currentUserId = null;
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        switch (msg.type) {
          case "join_room": {
            const { streamId, userId, userName, userAvatar, isHost } = msg;
            currentStreamId = streamId;
            currentUserId = userId;
            if (!liveRooms.has(streamId)) {
              liveRooms.set(streamId, /* @__PURE__ */ new Map());
            }
            const room = liveRooms.get(streamId);
            room.set(userId, { ws, userId, userName, userAvatar, isHost: !!isHost });
            const stream = streamsDatabase.get(streamId);
            const count = room.size;
            if (stream) {
              stream.viewerCount = count;
            }
            broadcastToRoom(streamId, {
              type: "viewer_count",
              streamId,
              count
            });
            break;
          }
          case "leave_room": {
            const { streamId, userId } = msg;
            autoFinalizeUserPrivateBilling(streamId, userId);
            const room = liveRooms.get(streamId);
            if (room) {
              room.delete(userId);
              const count = room.size;
              const stream = streamsDatabase.get(streamId);
              if (stream) stream.viewerCount = count;
              broadcastToRoom(streamId, {
                type: "viewer_count",
                streamId,
                count
              });
            }
            break;
          }
          case "chat_message": {
            const { streamId, message } = msg;
            broadcastToRoom(streamId, {
              type: "chat_message",
              streamId,
              message
            });
            break;
          }
          case "gift_broadcast": {
            const { streamId, gift, count, diamonds, senderName, senderAvatar, senderId } = msg;
            const stream = streamsDatabase.get(streamId);
            if (stream && diamonds) {
              stream.totalDiamondsEarned += diamonds;
            }
            broadcastToRoom(streamId, {
              type: "gift_broadcast",
              streamId,
              gift,
              count,
              diamonds,
              senderName,
              senderAvatar,
              senderId
            });
            break;
          }
          case "like_broadcast": {
            const { streamId } = msg;
            const stream = streamsDatabase.get(streamId);
            if (stream) {
              stream.likesCount += 1;
            }
            broadcastToRoom(streamId, {
              type: "like_broadcast",
              streamId
            });
            break;
          }
          case "toggle_comments": {
            const { streamId, enabled } = msg;
            const stream = streamsDatabase.get(streamId);
            if (stream) {
              stream.commentsEnabled = enabled;
            }
            broadcastToRoom(streamId, {
              type: "comments_toggled",
              streamId,
              enabled
            });
            break;
          }
          case "stream_ended": {
            const { streamId, summary } = msg;
            broadcastToRoom(streamId, {
              type: "stream_ended",
              streamId,
              summary
            });
            break;
          }
        }
      } catch (err) {
        console.warn("WS message error:", err);
      }
    });
    ws.on("close", () => {
      allConnectedSockets.delete(ws);
      if (currentStreamId && currentUserId) {
        autoFinalizeUserPrivateBilling(currentStreamId, currentUserId);
        const room = liveRooms.get(currentStreamId);
        if (room) {
          room.delete(currentUserId);
          const count = room.size;
          const stream = streamsDatabase.get(currentStreamId);
          if (stream) stream.viewerCount = count;
          broadcastToRoom(currentStreamId, {
            type: "viewer_count",
            streamId: currentStreamId,
            count
          });
        }
      }
    });
  });
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`StreamFlow server running at http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
