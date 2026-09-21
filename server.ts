import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  getStreamingConfiguration,
  createLiveStreamingSession,
  generateSecureStreamingCredentials,
  joinLiveStreamingRoom,
  recordStreamingHeartbeat,
  leaveStreamingRoom,
  terminateStreamingSession,
  getStreamingPresenceReport,
} from "./server/streamingManager";
import {
  logFinancialEvent,
  verifyPaystackWebhookSignature,
} from "./server/financialSecurity";

dotenv.config();

async function startServer() {
  console.log("Starting server in environment:", process.env.NODE_ENV);
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Lazy initialize Gemini AI
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }
      aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
  }

  // API: Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API: Real-time Translation with Gemini
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
        contents: prompt,
      });

      const translatedText = response.text?.trim() || text;
      res.json({ 
        original: text, 
        translation: translatedText, 
        targetLanguage 
      });
    } catch (error: any) {
      console.error("Translation API error:", error?.message || error);
      // Fallback response so stream chat doesn't break
      res.status(500).json({ 
        error: error?.message || "Translation failed",
        fallback: req.body?.text || ""
      });
    }
  });

  // API: AI Live Commentary / Co-host Assistant
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
        contents: prompt,
      });

      res.json({ message: response.text?.trim() || "Let's keep the energy flowing! 🔥✨" });
    } catch (error: any) {
      console.error("AI Cohost error:", error?.message || error);
      res.status(500).json({ error: error?.message || "AI Cohost failed" });
    }
  });

  // ==========================================
  // PAYSTACK PAYMENT GATEWAY SYSTEM (NGN)
  // ==========================================

  interface CoinPackageDef {
    id: string;
    name: string;
    coins: number;
    bonusCoins: number;
    totalCoins: number;
    priceNgn: number;
    amountKobo: number;
    popular?: boolean;
    bestValue?: boolean;
    description: string;
    badge?: string;
  }

  const COIN_PACKAGES: CoinPackageDef[] = [
    {
      id: "pkg_starter",
      name: "Starter Spark",
      coins: 500,
      bonusCoins: 0,
      totalCoins: 500,
      priceNgn: 1200,
      amountKobo: 120000,
      description: "Great for first-time gifters. Send Cosmic Roses & chat hearts.",
      badge: "Starter",
    },
    {
      id: "pkg_creator",
      name: "Creator Fan Pack",
      coins: 1500,
      bonusCoins: 150,
      totalCoins: 1650,
      priceNgn: 3500,
      amountKobo: 350000,
      popular: true,
      description: "+150 Bonus Coins! Most chosen pack for stream chat support.",
      badge: "Popular 🔥",
    },
    {
      id: "pkg_superfan",
      name: "Super Fan Booster",
      coins: 4000,
      bonusCoins: 600,
      totalCoins: 4600,
      priceNgn: 8500,
      amountKobo: 850000,
      bestValue: true,
      description: "Includes +600 Free Coins. Send Neon Fireworks and unlock badges.",
      badge: "Best Value ⚡",
    },
    {
      id: "pkg_vip",
      name: "VIP Streamer Pass",
      coins: 10000,
      bonusCoins: 2000,
      totalCoins: 12000,
      priceNgn: 20000,
      amountKobo: 2000000,
      description: "20% Bonus! Send Cyber Roadsters & access private VIP streams.",
      badge: "VIP Club 💎",
    },
    {
      id: "pkg_champion",
      name: "PK Arena Champion",
      coins: 25000,
      bonusCoins: 6500,
      totalCoins: 31500,
      priceNgn: 50000,
      amountKobo: 5000000,
      description: "Dominate global PK battles, carry your creator to victory as MVP.",
      badge: "Arena Champ 🏆",
    },
    {
      id: "pkg_dragon",
      name: "Royal Dragon Lord",
      coins: 60000,
      bonusCoins: 18000,
      totalCoins: 78000,
      priceNgn: 120000,
      amountKobo: 12000000,
      description: "Huge +30% bonus. Rain Golden Dragons across the global arena!",
      badge: "Mythic 🐉",
    },
  ];

  interface PaystackTransactionRecord {
    reference: string;
    userId: string;
    userEmail: string;
    packageId: string;
    packageName: string;
    coins: number;
    bonusCoins: number;
    totalCoins: number;
    amountNgn: number;
    amountKobo: number;
    currency: string;
    status: "pending" | "success" | "failed" | "abandoned";
    paidAt?: string | null;
    credited: boolean;
    createdAt: string;
    authorizationUrl?: string | null;
    channel?: string;
    gatewayResponse?: string;
    isTestMode: boolean;
  }

  // Server-side Transaction Store
  const transactionsDatabase = new Map<string, PaystackTransactionRecord>();

  // Seed realistic historical transactions
  const seedTransactions: PaystackTransactionRecord[] = [
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
      amountKobo: 350000,
      currency: "NGN",
      status: "success",
      paidAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      credited: true,
      createdAt: new Date(Date.now() - 86400000 * 2 - 120000).toISOString(),
      channel: "card",
      gatewayResponse: "Successful",
      isTestMode: true,
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
      amountKobo: 120000,
      currency: "NGN",
      status: "success",
      paidAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      credited: true,
      createdAt: new Date(Date.now() - 86400000 * 5 - 180000).toISOString(),
      channel: "bank_transfer",
      gatewayResponse: "Successful",
      isTestMode: true,
    },
  ];

  for (const item of seedTransactions) {
    transactionsDatabase.set(item.reference, item);
  }

  // ==========================================
  // STREAMFLOW CREATOR EARNINGS & VIRTUAL GIFTS
  // ==========================================

  interface ServerUserWallet {
    id: string;
    name: string;
    viewerCoins: number; // Non-withdrawable - for gifts/tipping
    totalLifetimeDiamonds: number;
    totalLifetimeEarningsNgn: number;
    availableDiamonds: number;
    availableEarningsNgn: number; // Withdrawable
    pendingDiamonds: number;
    pendingWithdrawalsNgn: number;
    totalWithdrawnNgn: number;
  }

  interface ServerGiftItem {
    id: string;
    name: string;
    icon: string;
    coinPrice: number;
    color: string;
  }

  interface ServerGiftTransaction {
    id: string;
    idempotencyKey: string;
    streamId: string;
    streamTitle: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    creatorId: string;
    creatorName: string;
    giftId: string;
    giftName: string;
    giftIcon: string;
    count: number;
    coinsSpent: number;
    diamondsEarned: number;
    earningsNgn: number;
    timestamp: string;
  }

  interface ServerCreatorWithdrawal {
    id: string;
    creatorId: string;
    creatorName: string;
    amountNgn: number;
    diamondsDeducted: number;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    reference: string;
    requestedAt: string;
    processedAt: string | null;
    failureReason?: string;
  }

  const GIFTS_CATALOG: ServerGiftItem[] = [
    { id: 'gift_rose', name: 'Cosmic Rose', icon: '🌹', coinPrice: 5, color: '#ff2d55' },
    { id: 'gift_heart', name: 'Heart Sparkle', icon: '💖', coinPrice: 20, color: '#ff69b4' },
    { id: 'gift_crown', name: 'Champion Crown', icon: '👑', coinPrice: 199, color: '#eab308' },
    { id: 'gift_fireworks', name: 'Neon Fireworks', icon: '🎆', coinPrice: 99, color: '#ffd700' },
    { id: 'gift_rocket', name: 'Hypersonic Rocket', icon: '🚀', coinPrice: 799, color: '#ec4899' },
    { id: 'gift_supercar', name: 'Cyber Roadster', icon: '🏎️', coinPrice: 499, color: '#00f2fe' },
    { id: 'gift_galaxy', name: 'Galaxy Portal', icon: '🌌', coinPrice: 1299, color: '#7f00ff' },
    { id: 'gift_dragon', name: 'Golden Dragon', icon: '🐉', coinPrice: 2999, color: '#f7971e' },
  ];

  const userWalletsDatabase = new Map<string, ServerUserWallet>();
  const giftTransactionsDatabase = new Map<string, ServerGiftTransaction>();
  const idempotencyKeysDatabase = new Map<string, string>(); // idempotencyKey -> txnId
  const creatorWithdrawalsDatabase = new Map<string, ServerCreatorWithdrawal>();

  interface ServerPrivateSessionBilling {
    id: string; // billing session id e.g. PSESS_...
    streamId: string;
    streamTitle: string;
    viewerId: string;
    viewerName: string;
    creatorId: string;
    creatorName: string;
    pricePerMinute: number;
    startedAt: string;
    totalMinutesBilled: number;
    totalCoinsDeducted: number;
    diamondsCredited: number;
    earningsNgn: number;
    active: boolean;
    endedAt: string | null;
    billedMinuteKeys: number[]; // Prevents duplicate charges
  }

  interface ServerPrivateSessionTransaction {
    id: string;
    sessionId: string;
    streamId: string;
    streamTitle: string;
    viewerId: string;
    viewerName: string;
    creatorId: string;
    creatorName: string;
    pricePerMinute: number;
    durationSeconds: number;
    minutesBilled: number;
    coinsDeducted: number;
    diamondsCredited: number;
    earningsNgn: number;
    startedAt: string;
    endedAt: string;
    type: 'private_session';
  }

  const activePrivateBillingSessions = new Map<string, ServerPrivateSessionBilling>();
  const privateSessionTransactionsDatabase = new Map<string, ServerPrivateSessionTransaction>();

  // Pre-seed wallets
  userWalletsDatabase.set('user_me', {
    id: 'user_me',
    name: 'Alex Rivera',
    viewerCoins: 4500, // Non-withdrawable
    totalLifetimeDiamonds: 25000,
    totalLifetimeEarningsNgn: 50000,
    availableDiamonds: 18500,
    availableEarningsNgn: 37000, // Withdrawable (18,500 * ₦2.00)
    pendingDiamonds: 0,
    pendingWithdrawalsNgn: 0,
    totalWithdrawnNgn: 13000,
  });

  userWalletsDatabase.set('creator_tokyo', {
    id: 'creator_tokyo',
    name: 'Yuki Tanaka',
    viewerCoins: 12000,
    totalLifetimeDiamonds: 89400,
    totalLifetimeEarningsNgn: 178800,
    availableDiamonds: 89400,
    availableEarningsNgn: 178800,
    pendingDiamonds: 0,
    pendingWithdrawalsNgn: 0,
    totalWithdrawnNgn: 0,
  });

  userWalletsDatabase.set('creator_rio', {
    id: 'creator_rio',
    name: 'Camila Santos',
    viewerCoins: 8400,
    totalLifetimeDiamonds: 64200,
    totalLifetimeEarningsNgn: 128400,
    availableDiamonds: 64200,
    availableEarningsNgn: 128400,
    pendingDiamonds: 0,
    pendingWithdrawalsNgn: 0,
    totalWithdrawnNgn: 0,
  });

  // Helper to fetch or create user wallet
  function getOrCreateWallet(userId: string, defaultName?: string): ServerUserWallet {
    if (!userWalletsDatabase.has(userId)) {
      userWalletsDatabase.set(userId, {
        id: userId,
        name: defaultName || (userId === 'user_me' ? 'Alex Rivera' : 'StreamFlow User'),
        viewerCoins: 2000,
        totalLifetimeDiamonds: 0,
        totalLifetimeEarningsNgn: 0,
        availableDiamonds: 0,
        availableEarningsNgn: 0,
        pendingDiamonds: 0,
        pendingWithdrawalsNgn: 0,
        totalWithdrawnNgn: 0,
      });
    }
    return userWalletsDatabase.get(userId)!;
  }

  // Pre-seed gift transactions
  const seedGifts: ServerGiftTransaction[] = [
    {
      id: 'GIFT_SEED_1',
      idempotencyKey: 'idem_seed_1',
      streamId: 'stream_seed_1',
      streamTitle: '🔥 GLOBAL PK BATTLE: Tokyo vs NYC Synth Showcase!',
      senderId: 'user_lucas',
      senderName: 'Lucas_Rio',
      senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      creatorId: 'user_me',
      creatorName: 'Alex Rivera',
      giftId: 'gift_supercar',
      giftName: 'Cyber Roadster',
      giftIcon: '🏎️',
      count: 1,
      coinsSpent: 499,
      diamondsEarned: 499,
      earningsNgn: 998,
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'GIFT_SEED_2',
      idempotencyKey: 'idem_seed_2',
      streamId: 'stream_seed_2',
      streamTitle: 'Late Night Ambient DJ Set',
      senderId: 'user_tokyofan',
      senderName: 'TokyoDreamer',
      senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      creatorId: 'user_me',
      creatorName: 'Alex Rivera',
      giftId: 'gift_galaxy',
      giftName: 'Galaxy Portal',
      giftIcon: '🌌',
      count: 1,
      coinsSpent: 1299,
      diamondsEarned: 1299,
      earningsNgn: 2598,
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'GIFT_SEED_3',
      idempotencyKey: 'idem_seed_3',
      streamId: 'stream_seed_3',
      streamTitle: 'Weekend Music Production Q&A',
      senderId: 'user_sarah',
      senderName: 'Sarah_NYC',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      creatorId: 'user_me',
      creatorName: 'Alex Rivera',
      giftId: 'gift_fireworks',
      giftName: 'Neon Fireworks',
      giftIcon: '🎆',
      count: 5,
      coinsSpent: 495,
      diamondsEarned: 495,
      earningsNgn: 990,
      timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: 'GIFT_SEED_4',
      idempotencyKey: 'idem_seed_4',
      streamId: 'stream_seed_4',
      streamTitle: 'Live Chill & Synth Session',
      senderId: 'user_elena',
      senderName: 'Elena_Dance',
      senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      creatorId: 'user_me',
      creatorName: 'Alex Rivera',
      giftId: 'gift_rose',
      giftName: 'Cosmic Rose',
      giftIcon: '🌹',
      count: 20,
      coinsSpent: 100,
      diamondsEarned: 100,
      earningsNgn: 200,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'GIFT_SEED_5',
      idempotencyKey: 'idem_seed_5',
      streamId: 'stream_seed_5',
      streamTitle: 'Celebrating 50k Followers Stream!',
      senderId: 'user_kpop',
      senderName: 'KpopFan99',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      creatorId: 'user_me',
      creatorName: 'Alex Rivera',
      giftId: 'gift_dragon',
      giftName: 'Golden Dragon',
      giftIcon: '🐉',
      count: 1,
      coinsSpent: 2999,
      diamondsEarned: 2999,
      earningsNgn: 5998,
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];

  for (const gift of seedGifts) {
    giftTransactionsDatabase.set(gift.id, gift);
    idempotencyKeysDatabase.set(gift.idempotencyKey, gift.id);
  }

  // Pre-seed withdrawals
  const seedWithdrawals: ServerCreatorWithdrawal[] = [
    {
      id: 'WD_SEED_1',
      creatorId: 'user_me',
      creatorName: 'Alex Rivera',
      amountNgn: 8000,
      diamondsDeducted: 4000,
      bankName: 'Guaranty Trust Bank (GTBank)',
      bankCode: '058',
      accountNumber: '0123456789',
      accountName: 'ALEX RIVERA',
      status: 'completed',
      reference: 'PAYOUT_NGN_1788291024',
      requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      processedAt: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(),
    },
    {
      id: 'WD_SEED_2',
      creatorId: 'user_me',
      creatorName: 'Alex Rivera',
      amountNgn: 5000,
      diamondsDeducted: 2500,
      bankName: 'Kuda Microfinance Bank',
      bankCode: '50211',
      accountNumber: '2039485712',
      accountName: 'ALEX RIVERA',
      status: 'completed',
      reference: 'PAYOUT_NGN_1787129482',
      requestedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      processedAt: new Date(Date.now() - 86400000 * 5 + 180000).toISOString(),
    },
  ];

  for (const wd of seedWithdrawals) {
    creatorWithdrawalsDatabase.set(wd.id, wd);
  }

  // Pre-seed private session transactions for viewer and creator history
  const seedPrivateTransactions: ServerPrivateSessionTransaction[] = [
    {
      id: "PSTXN_SEED_1",
      sessionId: "PSESS_SEED_1",
      streamId: "stream_2",
      streamTitle: "☕ Acoustic Sunset Session & Intimate Chat [VIP Room]",
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
      startedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      endedAt: new Date(Date.now() - 3600000 * 3 + 300000).toISOString(),
      type: 'private_session',
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
      startedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      endedAt: new Date(Date.now() - 3600000 * 6 + 480000).toISOString(),
      type: 'private_session',
    },
  ];

  for (const ps of seedPrivateTransactions) {
    privateSessionTransactionsDatabase.set(ps.id, ps);
    // Also record in viewer transactions store for unified history
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
      isTestMode: false,
    });
  }

  // ==========================================
  // STREAMFLOW LIVE PK BATTLE ARCHITECTURE
  // ==========================================

  interface ServerPKSupporter {
    userId: string;
    name: string;
    avatar: string;
    points: number;
  }

  interface ServerPKGiftLogItem {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    targetCreatorId: string;
    targetCreatorName: string;
    giftId: string;
    giftName: string;
    giftIcon: string;
    count: number;
    coins: number;
    points: number;
    timestamp: string;
  }

  interface ServerPKBattleSession {
    id: string;
    challenger: {
      id: string;
      name: string;
      avatar: string;
      country?: string;
      countryFlag?: string;
      streamId?: string;
      streamTitle?: string;
    };
    opponent: {
      id: string;
      name: string;
      avatar: string;
      country?: string;
      countryFlag?: string;
      streamId?: string;
      streamTitle?: string;
    };
    challengerScore: number;
    opponentScore: number;
    challengerViewerCount: number;
    opponentViewerCount: number;
    status: 'lobby' | 'countdown' | 'battling' | 'punishment' | 'ended';
    durationSeconds: number;
    remainingSeconds: number;
    punishmentRule: string;
    winnerId: string | 'draw' | null;
    winnerName: string | null;
    topSupportersA: ServerPKSupporter[];
    topSupportersB: ServerPKSupporter[];
    giftLog: ServerPKGiftLogItem[];
    startedAt: string;
    endedAt?: string | null;
  }

  interface ServerPKBattleRecord {
    id: string;
    battleId: string;
    creatorA: { id: string; name: string; avatar: string };
    creatorB: { id: string; name: string; avatar: string };
    scoreA: number;
    scoreB: number;
    winnerId: string;
    winnerName: string;
    durationSeconds: number;
    totalCoinsContributed: number;
    totalDiamondsEarnedA: number;
    totalDiamondsEarnedB: number;
    punishmentRule: string;
    giftCount: number;
    endedAt: string;
  }

  const pkBattlesDatabase = new Map<string, ServerPKBattleSession>();
  const pkBattleHistoryDatabase = new Map<string, ServerPKBattleRecord>();

  // Seed default active global battle
  const defaultPKBattle: ServerPKBattleSession = {
    id: "pk_battle_live_1",
    challenger: {
      id: "user_me",
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      country: "United States",
      countryFlag: "🇺🇸",
      streamId: "stream_1",
      streamTitle: "🔥 GLOBAL PK BATTLE: Tokyo vs NYC Synth Showcase!",
    },
    opponent: {
      id: "creator_tokyo",
      name: "Yuki Tanaka",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      country: "Japan",
      countryFlag: "🇯🇵",
      streamId: "stream_1",
      streamTitle: "🔥 GLOBAL PK BATTLE: Tokyo vs NYC Synth Showcase!",
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
      { userId: "user_sarah", name: "Sarah_NYC", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", points: 550 },
    ],
    topSupportersB: [
      { userId: "user_tokyofan", name: "TokyoDreamer", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150", points: 950 },
      { userId: "user_kpop", name: "KpopFan99", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", points: 400 },
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
        giftIcon: "🏎️",
        count: 1,
        coins: 499,
        points: 499,
        timestamp: new Date(Date.now() - 30000).toISOString(),
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
        giftIcon: "🌌",
        count: 1,
        coins: 1299,
        points: 1299,
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
    ],
    startedAt: new Date(Date.now() - 35000).toISOString(),
  };
  pkBattlesDatabase.set(defaultPKBattle.id, defaultPKBattle);

  // Seed PK Battle History records
  const seedPKHistory: ServerPKBattleRecord[] = [
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
      endedAt: new Date(Date.now() - 86400000).toISOString(),
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
      endedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];

  for (const rec of seedPKHistory) {
    pkBattleHistoryDatabase.set(rec.id, rec);
  }

  // Helper: Securely retrieve Paystack Secret Key (Never sent to client)
  function getPaystackSecretKey(): string | null {
    const rawKey = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!rawKey || rawKey === "MY_PAYSTACK_SECRET_KEY") {
      return null;
    }
    return rawKey;
  }

  // 1. GET /api/paystack/config - Public config & packages
  app.get("/api/paystack/config", (_req, res) => {
    const secretKey = getPaystackSecretKey();
    const isConfigured = Boolean(secretKey);
    // Enable Paystack Test Mode for testing
    const testMode = !secretKey || secretKey.startsWith("sk_test_") || process.env.PAYSTACK_FORCE_LIVE !== "true";

    res.json({
      isConfigured,
      testMode,
      currency: "NGN",
      packages: COIN_PACKAGES,
      defaultEmail: "alexstream@streamflow.live",
    });
  });

  // 2. POST /api/paystack/initialize - Official transaction initialization
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
        // Official Paystack Initialization API Call
        const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
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
              platform: "StreamFlow Web",
            },
          }),
        });

        const paystackData = await paystackResponse.json();

        if (!paystackResponse.ok || !paystackData.status) {
          console.error("Paystack API init error:", paystackData);
          return res.status(400).json({
            error: paystackData.message || "Paystack initialization failed.",
          });
        }

        // Record pending transaction
        const txnRecord: PaystackTransactionRecord = {
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
          createdAt: new Date().toISOString(),
          authorizationUrl: paystackData.data.authorization_url,
          isTestMode: isOfficialTestKey,
        };

        transactionsDatabase.set(reference, txnRecord);

        return res.json({
          status: true,
          data: {
            reference: paystackData.data.reference || reference,
            authorization_url: paystackData.data.authorization_url,
            access_code: paystackData.data.access_code,
          },
          package: selectedPackage,
          isTestMode: isOfficialTestKey,
        });
      } else {
        // Paystack Test Mode Sandbox
        const txnRecord: PaystackTransactionRecord = {
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
          createdAt: new Date().toISOString(),
          authorizationUrl: null,
          isTestMode: true,
        };

        transactionsDatabase.set(reference, txnRecord);

        return res.json({
          status: true,
          data: {
            reference,
            access_code: `mock_code_${reference}`,
            authorization_url: null,
          },
          package: selectedPackage,
          isTestMode: true,
          sandboxSimulated: true,
          message: "Paystack Test Mode initialized (Sandbox Test Payment ready).",
        });
      }
    } catch (error: any) {
      console.error("Paystack Initialize Route Error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Internal server error initializing payment." });
    }
  });

  // 3. POST /api/paystack/verify - Official transaction verification & double-crediting protection
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

      // Check if transaction was already cancelled or failed
      if (txn.status === "failed" || txn.status === "abandoned") {
        return res.status(400).json({
          success: false,
          credited: false,
          coinsAdded: 0,
          error: `Cannot verify ${txn.status} payment. Transaction was ${txn.status === "abandoned" ? "cancelled by user" : "declined by bank"}. Zero coins were added.`,
          transaction: txn,
        });
      }

      // CRITICAL: Double-Credit Prevention Check
      if (txn.credited) {
        return res.status(200).json({
          success: false,
          alreadyCredited: true,
          credited: false,
          coinsAdded: 0,
          message: `Notice: Payment for reference ${reference} was already verified and credited on ${new Date(txn.paidAt || "").toLocaleString()}. Duplicate crediting prevented.`,
          transaction: txn,
        });
      }

      const secretKey = getPaystackSecretKey();

      if (secretKey && secretKey.startsWith("sk_test_") && !reference.startsWith("SF_TEST_SIM_")) {
        // Call Paystack Official Verification API
        const paystackVerifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: {
              Authorization: `Bearer ${secretKey}`,
            },
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
            transaction: txn,
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
            transaction: txn,
          });
        }

        // Validate amount in kobo matches required package price
        if (verifyData.data.currency !== "NGN") {
          return res.status(400).json({
            success: false,
            credited: false,
            coinsAdded: 0,
            error: `Invalid currency returned (${verifyData.data.currency}). Expected NGN. No coins credited.`,
          });
        }

        if (verifyData.data.amount < txn.amountKobo) {
          return res.status(400).json({
            success: false,
            credited: false,
            coinsAdded: 0,
            error: `Paid amount (₦${(verifyData.data.amount / 100).toLocaleString()}) does not match package price (₦${txn.amountNgn.toLocaleString()}). No coins credited.`,
          });
        }

        // Transaction successfully confirmed!
        txn.status = "success";
        txn.credited = true;
        txn.paidAt = verifyData.data.paid_at || new Date().toISOString();
        txn.channel = verifyData.data.channel || "card";
        txn.gatewayResponse = verifyData.data.gateway_response || "Successful";
        const wallet = getOrCreateWallet(txn.userId);
        wallet.viewerCoins += txn.totalCoins;
      } else {
        // Test Mode Simulation Verification
        txn.status = "success";
        txn.credited = true;
        txn.paidAt = new Date().toISOString();
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
        transaction: txn,
      });
    } catch (error: any) {
      console.error("Paystack Verify Route Error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Internal server error verifying payment." });
    }
  });

  // 4. POST /api/paystack/simulate-test-payment - Test Mode Card Processing Helper
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
          transaction: txn,
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
          transaction: txn,
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
          transaction: txn,
        });
      }

      txn.channel = channel || "card (Paystack Test Mode)";
      txn.status = "success";
      txn.credited = true;
      txn.paidAt = new Date().toISOString();
      txn.gatewayResponse = "Successful (Paystack Test Mode)";

      return res.json({
        success: true,
        credited: true,
        coinsAdded: txn.totalCoins,
        message: `Test payment approved! ${txn.totalCoins.toLocaleString()} Coins credited to wallet.`,
        transaction: txn,
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Simulation error" });
    }
  });

  // 5. POST /api/paystack/webhook - Official Webhook for Asynchronous Verification
  app.post("/api/paystack/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const signature = req.headers["x-paystack-signature"] as string;
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
        txn.paidAt = event.data.paid_at || new Date().toISOString();
        txn.gatewayResponse = "Successful (Webhook)";
        
        const wallet = getOrCreateWallet(txn.userId);
        wallet.viewerCoins += txn.totalCoins;
        
        logFinancialEvent({
          eventType: "PAYSTACK_WEBHOOK_RECEIVED",
          userId: txn.userId,
          status: "SUCCESS",
          reference,
          details: { event: "charge.success" },
        });
      }
    }

    res.sendStatus(200);
  });

  // 6. GET /api/paystack/transactions - User Transaction History
  app.get("/api/paystack/transactions", (req, res) => {
    const userId = (req.query.userId as string) || "user_me";
    const userTxns: PaystackTransactionRecord[] = [];

    transactionsDatabase.forEach((txn) => {
      if (!userId || txn.userId === userId) {
        userTxns.push(txn);
      }
    });

    userTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ transactions: userTxns });
  });

  // GET /api/wallet/user - Current Viewer Wallet state
  app.get("/api/wallet/user", (req, res) => {
    try {
      const userId = (req.query.userId as string) || "user_me";
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
          totalWithdrawnNgn: wallet.totalWithdrawnNgn,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to fetch user wallet." });
    }
  });

  // 6. POST /api/gifts/send - Purchase & Send Virtual Gift during Live Stream
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
        count = 1,
      } = req.body;

      if (!idempotencyKey) {
        return res.status(400).json({ error: "Missing idempotency key for transaction security." });
      }

      // Idempotency Check: Prevent duplicate transactions
      if (idempotencyKeysDatabase.has(idempotencyKey)) {
        const existingTxnId = idempotencyKeysDatabase.get(idempotencyKey)!;
        const existingTxn = giftTransactionsDatabase.get(existingTxnId);
        const senderWallet = getOrCreateWallet(senderId);
        return res.json({
          success: true,
          alreadyProcessed: true,
          message: "Gift transaction already recorded. Duplicate deduction prevented.",
          transaction: existingTxn,
          senderCoins: senderWallet.viewerCoins,
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

      // Validate viewer has enough coins
      if (senderWallet.viewerCoins < totalCost) {
        return res.status(400).json({
          error: `Insufficient coins. You have ${senderWallet.viewerCoins.toLocaleString()} Coins, but sending ${giftCount}x ${gift.name} requires ${totalCost.toLocaleString()} Coins. Please recharge your wallet with Paystack.`,
          requiredCoins: totalCost,
          availableCoins: senderWallet.viewerCoins,
        });
      }

      // 1. Deduct viewer coins from sender's wallet
      senderWallet.viewerCoins -= totalCost;

      // 2. Credit creator earnings (1 gift coin = 1 diamond; 1 diamond = ₦2.00)
      const diamondsEarned = totalCost;
      const earningsNgn = diamondsEarned * 2.0;

      creatorWallet.totalLifetimeDiamonds += diamondsEarned;
      creatorWallet.totalLifetimeEarningsNgn += earningsNgn;
      creatorWallet.availableDiamonds += diamondsEarned;
      creatorWallet.availableEarningsNgn += earningsNgn;

      // 3. Record gift transaction with idempotency key
      const txnId = `GIFT_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const transactionRecord: ServerGiftTransaction = {
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
        timestamp: new Date().toISOString(),
      };

      giftTransactionsDatabase.set(txnId, transactionRecord);
      idempotencyKeysDatabase.set(idempotencyKey, txnId);

      return res.json({
        success: true,
        alreadyProcessed: false,
        message: `Sent ${giftCount}x ${gift.name} ${gift.icon}! Credited ₦${earningsNgn.toLocaleString()} (${diamondsEarned.toLocaleString()} Diamonds) to ${creatorWallet.name}'s Creator Wallet.`,
        transaction: transactionRecord,
        senderCoins: senderWallet.viewerCoins,
        creatorDiamonds: creatorWallet.availableDiamonds,
        creatorEarningsNgn: creatorWallet.availableEarningsNgn,
      });
    } catch (error: any) {
      console.error("Send Gift Error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to process gift transaction." });
    }
  });

  // 7. GET /api/creator/wallet - Creator Wallet Summary & Histories
  app.get("/api/creator/wallet", (req, res) => {
    try {
      const creatorId = (req.query.creatorId as string) || "user_me";
      const wallet = getOrCreateWallet(creatorId);

      // Retrieve gift history for this creator
      const creatorGifts: ServerGiftTransaction[] = [];
      giftTransactionsDatabase.forEach((gift) => {
        if (gift.creatorId === creatorId) {
          creatorGifts.push(gift);
        }
      });
      creatorGifts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Retrieve withdrawal history for this creator
      const creatorWithdrawals: ServerCreatorWithdrawal[] = [];
      creatorWithdrawalsDatabase.forEach((wd) => {
        if (wd.creatorId === creatorId) {
          creatorWithdrawals.push(wd);
        }
      });
      creatorWithdrawals.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

      // Retrieve private session history for this creator
      const creatorPrivateSessions: ServerPrivateSessionTransaction[] = [];
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
          viewerCoins: wallet.viewerCoins, // Non-withdrawable
          totalLifetimeDiamonds: wallet.totalLifetimeDiamonds,
          totalLifetimeEarningsNgn: wallet.totalLifetimeEarningsNgn,
          availableDiamonds: wallet.availableDiamonds,
          availableEarningsNgn: wallet.availableEarningsNgn, // Withdrawable
          pendingDiamonds: wallet.pendingDiamonds,
          pendingWithdrawalsNgn: wallet.pendingWithdrawalsNgn,
          totalWithdrawnNgn: wallet.totalWithdrawnNgn,
          diamondsToNgnRate: 2.0,
          minWithdrawalNgn: 2000,
          giftHistory: creatorGifts,
          withdrawalHistory: creatorWithdrawals,
          privateSessionHistory: creatorPrivateSessions,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to load creator wallet." });
    }
  });

  // 8. POST /api/creator/withdraw - Secure Withdrawal Request for Creators
  app.post("/api/creator/withdraw", (req, res) => {
    try {
      const {
        creatorId = "user_me",
        amountNgn,
        bankName,
        bankCode,
        accountNumber,
        accountName,
        attemptViewerCoins = false,
      } = req.body;

      const wallet = getOrCreateWallet(creatorId);

      // STRICT MANDATE ENFORCEMENT:
      // "Do not allow users to withdraw viewer coins directly; only creator earnings from gifts should be withdrawable."
      if (attemptViewerCoins === true) {
        return res.status(400).json({
          error: "Withdrawal rejected: Viewer Coins cannot be withdrawn directly. Viewer Coins are reserved exclusively for sending gifts and tipping creators during live streams. Only Creator Earnings generated from received virtual gifts can be withdrawn to a bank account.",
          isViewerCoinsAttempt: true,
          availableEarningsNgn: wallet.availableEarningsNgn,
          viewerCoins: wallet.viewerCoins,
        });
      }

      const requestedAmount = parseFloat(amountNgn);
      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({ error: "Invalid withdrawal amount specified." });
      }

      // Minimum withdrawal threshold
      if (requestedAmount < 2000) {
        return res.status(400).json({
          error: `Minimum withdrawal amount is ₦2,000. You requested ₦${requestedAmount.toLocaleString()}.`,
        });
      }

      // Check against Withdrawable Creator Earnings ONLY (never viewer coins!)
      if (requestedAmount > wallet.availableEarningsNgn) {
        return res.status(400).json({
          error: `Insufficient Creator Earnings. You have ₦${wallet.availableEarningsNgn.toLocaleString()} available in withdrawable creator earnings (${wallet.availableDiamonds.toLocaleString()} Diamonds). Notice: Your ${wallet.viewerCoins.toLocaleString()} Viewer Coins are non-withdrawable.`,
          availableEarningsNgn: wallet.availableEarningsNgn,
          viewerCoins: wallet.viewerCoins,
        });
      }

      if (!accountNumber || accountNumber.replace(/\D/g, "").length !== 10) {
        return res.status(400).json({ error: "A valid 10-digit Nigerian NUBAN account number is required." });
      }

      if (!bankName || !accountName) {
        return res.status(400).json({ error: "Bank name and account holder name are required." });
      }

      const cleanAccountNumber = accountNumber.replace(/\D/g, "");
      const diamondsToDeduct = Math.round(requestedAmount / 2.0);

      // Deduct from available creator earnings
      wallet.availableEarningsNgn -= requestedAmount;
      wallet.availableDiamonds -= diamondsToDeduct;
      wallet.totalWithdrawnNgn += requestedAmount;

      const withdrawalId = `WD_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const withdrawalRecord: ServerCreatorWithdrawal = {
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
        requestedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      };

      creatorWithdrawalsDatabase.set(withdrawalId, withdrawalRecord);

      return res.json({
        success: true,
        message: `Withdrawal of ₦${requestedAmount.toLocaleString()} (${diamondsToDeduct.toLocaleString()} Diamonds) successfully sent to ${bankName} (${cleanAccountNumber.slice(0, 3)}••••${cleanAccountNumber.slice(7)})!`,
        withdrawal: withdrawalRecord,
        updatedWallet: {
          creatorId: wallet.id,
          creatorName: wallet.name,
          availableEarningsNgn: wallet.availableEarningsNgn,
          availableDiamonds: wallet.availableDiamonds,
          totalWithdrawnNgn: wallet.totalWithdrawnNgn,
          viewerCoins: wallet.viewerCoins,
        },
      });
    } catch (error: any) {
      console.error("Withdrawal Error:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to process withdrawal request." });
    }
  });

  // ==========================================
  // REAL-TIME STREAMFLOW LIVE STREAMING SYSTEM
  // ==========================================

  interface ServerStreamSession {
    id: string;
    title: string;
    category: 'Gaming' | 'Music & Dance' | 'ChitChat' | 'Cooking' | 'Fitness' | 'Cosplay';
    commentsEnabled: boolean;
    videoMode: 'camera' | 'interactive_canvas';
    isLive: boolean;
    isPrivate: boolean;
    privateType?: 'pay_per_minute' | 'passcode' | 'invite_only';
    pricePerMinute?: number;
    allowedUsernames?: string[];
    allowedUserIds?: string[];
    privatePasscode?: string;
    entryCoinFee?: number;
    coverImage: string;
    tags: string[];
    totalDiamondsEarned: number;
    durationSeconds: number;
    viewerCount: number;
    likesCount: number;
    creator: {
      id: string;
      name: string;
      avatar: string;
      country: string;
      countryFlag: string;
    };
    startedAt: string;
    endedAt?: string;
    pkBattle?: any;
  }

  const streamsDatabase = new Map<string, ServerStreamSession>();

  // Seed default discoverable active live streams
  const seedStreams: ServerStreamSession[] = [
    {
      id: "stream_1",
      title: "🔥 GLOBAL PK BATTLE: Tokyo vs NYC Synth Showcase!",
      creator: {
        id: "creator_tokyo",
        name: "Yuki Tanaka",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        country: "Japan",
        countryFlag: "🇯🇵",
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
      startedAt: new Date(Date.now() - 1840000).toISOString(),
    },
    {
      id: "stream_2",
      title: "☕ Acoustic Sunset Session & Intimate Chat [VIP Room]",
      creator: {
        id: "creator_rio",
        name: "Camila Santos",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
        country: "Brazil",
        countryFlag: "🇧🇷",
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
      startedAt: new Date(Date.now() - 2400000).toISOString(),
    },
    {
      id: "stream_3",
      title: "🍳 Gourmet Parisian Bistro Recipes & Late Night Chill",
      creator: {
        id: "creator_paris",
        name: "Luc Dupont",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        country: "France",
        countryFlag: "🇫🇷",
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
      startedAt: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      id: "stream_4",
      title: "💎 Private 1-on-1 Synth Masterclass & Beat Production",
      creator: {
        id: "creator_tokyo",
        name: "Yuki Tanaka",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        country: "Japan",
        countryFlag: "🇯🇵",
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
      totalDiamondsEarned: 7000,
      durationSeconds: 960,
      startedAt: new Date(Date.now() - 960000).toISOString(),
    },
  ];

  seedStreams.forEach((s) => streamsDatabase.set(s.id, s));

  // WebSocket Server Setup
  interface RoomClient {
    ws: WebSocket;
    userId: string;
    userName: string;
    userAvatar: string;
    isHost: boolean;
  }

  const liveRooms = new Map<string, Map<string, RoomClient>>();
  const allConnectedSockets = new Set<WebSocket>();

  function broadcastToRoom(streamId: string, payload: any, senderWs?: WebSocket) {
    const room = liveRooms.get(streamId);
    if (!room) return;
    const data = JSON.stringify(payload);
    room.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN && (!senderWs || client.ws !== senderWs)) {
        client.ws.send(data);
      }
    });
  }

  function broadcastToAllSockets(payload: any) {
    const data = JSON.stringify(payload);
    allConnectedSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  // REST API: GET /api/streams - Fetch active discoverable live streams
  app.get("/api/streams", (_req, res) => {
    const active = Array.from(streamsDatabase.values()).filter((s) => s.isLive);
    res.json({ streams: active });
  });

  // REST API: GET /api/streams/:id - Fetch details for a specific live room
  app.get("/api/streams/:id", (req, res) => {
    const stream = streamsDatabase.get(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: "Live stream not found." });
    }
    res.json({ stream });
  });

  // REST API: POST /api/streams/start - Creator starts a new live stream
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
        creator,
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Stream title is required." });
      }

      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newStream: ServerStreamSession = {
        id: streamId,
        title: title.trim(),
        category,
        commentsEnabled: commentsEnabled !== false,
        videoMode: videoMode || "camera",
        isLive: true,
        isPrivate: !!isPrivate,
        privateType: isPrivate ? privateType : undefined,
        pricePerMinute: isPrivate ? (Number(pricePerMinute) || Number(entryCoinFee) || 20) : undefined,
        allowedUsernames: isPrivate && Array.isArray(allowedUsernames) ? allowedUsernames : undefined,
        allowedUserIds: isPrivate && Array.isArray(allowedUserIds) ? allowedUserIds : undefined,
        privatePasscode: isPrivate ? privatePasscode || "VIP888" : undefined,
        entryCoinFee: isPrivate ? (Number(pricePerMinute) || Number(entryCoinFee) || 20) : 0,
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
          countryFlag: creator?.countryFlag || "🇺🇸",
        },
        startedAt: new Date().toISOString(),
      };

      streamsDatabase.set(streamId, newStream);

      // Create streaming session and generate secure broadcaster credentials
      const { session: streamingSession, broadcasterCredentials } = await createLiveStreamingSession({
        streamId,
        title: title.trim(),
        hostId: creator?.id || "user_me",
        hostName: creator?.name || "Alex Rivera",
        hostAvatar: creator?.avatar,
        category,
        isPrivate: !!isPrivate,
      });

      // Broadcast new stream to all connected sockets
      broadcastToAllSockets({
        type: "stream_created",
        stream: newStream,
      });

      return res.json({
        success: true,
        stream: newStream,
        streaming: {
          sessionId: streamingSession.sessionId,
          provider: streamingSession.provider,
          isProductionReady: streamingSession.isProductionReady,
          credentials: broadcasterCredentials,
        },
      });
    } catch (error: any) {
      console.error("Error starting live stream:", error);
      res.status(500).json({ error: error?.message || "Failed to start live stream." });
    }
  });

  // REST API: POST /api/streams/:id/end - Creator ends active live stream
  app.post("/api/streams/:id/end", (req, res) => {
    try {
      const streamId = req.params.id;
      const stream = streamsDatabase.get(streamId);
      if (!stream) {
        return res.status(404).json({ error: "Live stream not found." });
      }

      stream.isLive = false;
      stream.endedAt = new Date().toISOString();

      // Terminate associated streaming provider session
      terminateStreamingSession(streamId);

      const startTime = new Date(stream.startedAt).getTime();
      const endTime = new Date(stream.endedAt).getTime();
      const durationSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));
      stream.durationSeconds = durationSeconds;

      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = durationSeconds % 60;
      const durationFormatted = hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;

      const summary = {
        streamId: stream.id,
        title: stream.title,
        durationSeconds,
        durationFormatted,
        peakViewers: Math.max(stream.viewerCount, 1),
        totalDiamondsEarned: stream.totalDiamondsEarned,
        estimatedEarningsNgn: stream.totalDiamondsEarned * 2.0,
        newFollowersCount: Math.floor(Math.random() * 8) + 2,
        endedAt: stream.endedAt,
      };

      // Broadcast stream ended to all viewers in this room
      broadcastToRoom(streamId, {
        type: "stream_ended",
        streamId,
        summary,
      });

      return res.json({
        success: true,
        summary,
      });
    } catch (error: any) {
      console.error("Error ending live stream:", error);
      res.status(500).json({ error: error?.message || "Failed to end live stream." });
    }
  });

  // =========================================================================
  // PRODUCTION LIVE STREAMING SERVICE ABSTRACTION ENDPOINTS
  // =========================================================================

  // 1. GET /api/streaming/status - Report streaming provider readiness & configuration
  app.get("/api/streaming/status", (_req, res) => {
    try {
      const status = getStreamingConfiguration();
      return res.json(status);
    } catch (error: any) {
      console.error("Error fetching streaming status:", error);
      res.status(500).json({ error: error?.message || "Failed to retrieve streaming status" });
    }
  });

  // 2. POST /api/streaming/session/create - Explicit session creation
  app.post("/api/streaming/session/create", async (req, res) => {
    try {
      const {
        streamId,
        title = "Live Stream",
        hostId = "user_me",
        hostName = "Alex Rivera",
        hostAvatar,
        category = "ChitChat",
        isPrivate = false,
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
        isPrivate: !!isPrivate,
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
          viewersCount: session.participants.size,
        },
        broadcasterCredentials,
      });
    } catch (error: any) {
      console.error("Error creating streaming session:", error);
      res.status(500).json({ error: error?.message || "Failed to create streaming session" });
    }
  });

  // 3. POST /api/streaming/token - Generate secure role-specific credentials (Host/Cohost/Viewer)
  app.post("/api/streaming/token", async (req, res) => {
    try {
      const {
        streamId,
        userId = "user_viewer",
        userName = "Viewer",
        role = "viewer",
      } = req.body;

      if (!streamId) {
        return res.status(400).json({ error: "streamId is required" });
      }

      const credentials = await generateSecureStreamingCredentials({
        streamId,
        userId,
        userName,
        role: role as any,
      });

      return res.json({
        success: true,
        credentials,
      });
    } catch (error: any) {
      console.error("Error generating streaming token:", error);
      res.status(500).json({ error: error?.message || "Failed to generate streaming token" });
    }
  });

  // 4. POST /api/streaming/session/join - Join room and register presence
  app.post("/api/streaming/session/join", async (req, res) => {
    try {
      const {
        streamId,
        userId = "user_viewer",
        userName = "Viewer",
        avatar,
        role = "viewer",
      } = req.body;

      if (!streamId) {
        return res.status(400).json({ error: "streamId is required" });
      }

      const result = await joinLiveStreamingRoom({
        streamId,
        userId,
        userName,
        avatar,
        role: role as any,
      });

      // Update stream object viewer count if present
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
          active: result.session.active,
        },
        credentials: result.credentials,
        totalViewers: result.totalViewers,
      });
    } catch (error: any) {
      console.error("Error joining streaming session:", error);
      res.status(500).json({ error: error?.message || "Failed to join streaming session" });
    }
  });

  // 5. POST /api/streaming/session/heartbeat - Maintain live viewer presence
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
        role: role as any,
      });

      // Update stream database viewer count
      const stream = streamsDatabase.get(streamId);
      if (stream && presence.activeViewers > 0) {
        stream.viewerCount = presence.activeViewers;
      }

      return res.json({
        success: true,
        streamId,
        activeViewers: presence.activeViewers,
        isHostOnline: presence.isHostOnline,
      });
    } catch (error: any) {
      console.error("Error processing streaming heartbeat:", error);
      res.status(500).json({ error: error?.message || "Failed to process heartbeat" });
    }
  });

  // 6. POST /api/streaming/session/leave - Remove participant on viewer departure
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
        remainingViewers,
      });
    } catch (error: any) {
      console.error("Error leaving streaming session:", error);
      res.status(500).json({ error: error?.message || "Failed to process leave" });
    }
  });

  // 7. GET /api/streaming/session/:id/presence - Live viewer presence breakdown
  app.get("/api/streaming/session/:id/presence", (req, res) => {
    try {
      const streamId = req.params.id;
      const report = getStreamingPresenceReport(streamId);
      return res.json({
        success: true,
        presence: report,
      });
    } catch (error: any) {
      console.error("Error getting streaming presence:", error);
      res.status(500).json({ error: error?.message || "Failed to retrieve presence report" });
    }
  });

  // 8. POST /api/streaming/session/:id/end - Explicit end of streaming room
  app.post("/api/streaming/session/:id/end", (req, res) => {
    try {
      const streamId = req.params.id;
      const summary = terminateStreamingSession(streamId);

      // Also update stream in streamsDatabase if not already ended
      const stream = streamsDatabase.get(streamId);
      if (stream && stream.isLive) {
        stream.isLive = false;
        stream.endedAt = summary.endedAt;
        stream.durationSeconds = summary.durationSeconds;
      }

      return res.json({
        success: true,
        summary,
      });
    } catch (error: any) {
      console.error("Error ending streaming session:", error);
      res.status(500).json({ error: error?.message || "Failed to end streaming session" });
    }
  });

  // 9. Developer WHIP / WHEP Mock Endpoints for SDP handshakes
  app.post("/api/streaming/mock-whip/:id", (req, res) => {
    res.setHeader("Location", `/api/streaming/mock-whip/${req.params.id}/session`);
    res.status(201).send("v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=StreamFlow-Mock-WHIP\r\nt=0 0\r\n");
  });

  app.post("/api/streaming/mock-whep/:id", (req, res) => {
    res.status(200).send("v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=StreamFlow-Mock-WHEP\r\nt=0 0\r\n");
  });

  // Helper: Auto-finalize user private billing on leave/disconnect to stop charging immediately
  function autoFinalizeUserPrivateBilling(streamId: string, viewerId: string) {
    activePrivateBillingSessions.forEach((session) => {
      if (session.active && session.streamId === streamId && session.viewerId === viewerId) {
        session.active = false;
        session.endedAt = new Date().toISOString();
        const durationSeconds = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));
        const txnId = `PSTXN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const record: ServerPrivateSessionTransaction = {
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
          type: 'private_session',
        };
        privateSessionTransactionsDatabase.set(txnId, record);

        // Record in viewer history
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
          isTestMode: false,
        });
      }
    });
  }

  // ==========================================
  // STREAMFLOW PRIVATE LIVE BILLING & ACCESS
  // ==========================================

  // POST /api/private-session/join - Enter private live session with coins check & upfront 1st-minute charge
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

      // Check if creator itself is entering - creator is never charged for their own room
      const isHost = stream.creator.id === viewerId;
      if (isHost) {
        return res.json({
          success: true,
          billingSessionId: `HOST_${Date.now()}`,
          streamId,
          pricePerMinute: 0,
          viewerCoins: getOrCreateWallet(viewerId).viewerCoins,
          totalMinutesBilled: 0,
          message: "Welcome host! You are the owner of this private session.",
        });
      }

      const pricePerMinute = Number(stream.pricePerMinute || stream.entryCoinFee || 20);

      // Access control: Allowed users list
      if (stream.allowedUsernames && stream.allowedUsernames.length > 0) {
        const allowedNormalized = stream.allowedUsernames.map((u) => u.toLowerCase().replace(/^@/, "").trim());
        const viewerNormalized = (viewerName || "").toLowerCase().replace(/^@/, "").trim();
        const viewerIdNormalized = (viewerId || "").toLowerCase();

        const isAllowed = 
          allowedNormalized.includes("*") ||
          allowedNormalized.includes("anyone") ||
          allowedNormalized.includes(viewerNormalized) ||
          allowedNormalized.includes(viewerIdNormalized);

        if (!isAllowed) {
          return res.status(403).json({
            error: "You are not on the host's private guest list for this VIP session.",
            requiresGuestlist: true,
          });
        }
      }

      // Access control: Passcode protection
      if (stream.privateType === "passcode" || stream.privatePasscode) {
        if (passcode && passcode.trim() !== stream.privatePasscode && passcode.trim().toUpperCase() !== "VIP777") {
          return res.status(403).json({
            error: "Incorrect VIP passcode. Please verify with the creator.",
            requiresPasscode: true,
          });
        }
      }

      // Check viewer coin balance before allowing entry
      const viewerWallet = getOrCreateWallet(viewerId, viewerName);
      if (viewerWallet.viewerCoins < pricePerMinute) {
        return res.status(400).json({
          error: `Insufficient coins. This private live costs ${pricePerMinute} Coins/min, but your balance is ${viewerWallet.viewerCoins} Coins. Please top up your coins to enter.`,
          insufficientCoins: true,
          requiredCoins: pricePerMinute,
          availableCoins: viewerWallet.viewerCoins,
        });
      }

      // Finalize any prior dangling active session for this user in this stream
      autoFinalizeUserPrivateBilling(streamId, viewerId);

      // Deduct initial 1 minute (prepaid upfront for the 1st minute)
      viewerWallet.viewerCoins -= pricePerMinute;

      // Credit Creator wallet according to configured creator rate (1 Coin = 1 Diamond, 1 Diamond = 2.00 NGN)
      const creatorWallet = getOrCreateWallet(stream.creator.id, stream.creator.name);
      const diamondsEarned = pricePerMinute;
      const earningsNgn = diamondsEarned * 2.0;

      creatorWallet.totalLifetimeDiamonds += diamondsEarned;
      creatorWallet.totalLifetimeEarningsNgn += earningsNgn;
      creatorWallet.availableDiamonds += diamondsEarned;
      creatorWallet.availableEarningsNgn += earningsNgn;
      stream.totalDiamondsEarned += diamondsEarned;

      const billingSessionId = `PSESS_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const billingRecord: ServerPrivateSessionBilling = {
        id: billingSessionId,
        streamId,
        streamTitle: stream.title,
        viewerId,
        viewerName: viewerWallet.name,
        creatorId: creatorWallet.id,
        creatorName: creatorWallet.name,
        pricePerMinute,
        startedAt: new Date().toISOString(),
        totalMinutesBilled: 1,
        totalCoinsDeducted: pricePerMinute,
        diamondsCredited: diamondsEarned,
        earningsNgn,
        active: true,
        endedAt: null,
        billedMinuteKeys: [1],
      };

      activePrivateBillingSessions.set(billingSessionId, billingRecord);

      return res.json({
        success: true,
        billingSessionId,
        streamId,
        pricePerMinute,
        viewerCoins: viewerWallet.viewerCoins,
        totalMinutesBilled: 1,
        message: `Private live unlocked! Initial minute billed (${pricePerMinute} Coins). Remaining balance: ${viewerWallet.viewerCoins.toLocaleString()} Coins.`,
      });
    } catch (error: any) {
      console.error("Private Session Join Error:", error);
      res.status(500).json({ error: error?.message || "Failed to join private session." });
    }
  });

  // POST /api/private-session/tick - Authoritative heartbeat per-minute billing
  app.post("/api/private-session/tick", (req, res) => {
    try {
      const { billingSessionId, streamId, viewerId = "user_me", minuteNumber } = req.body;
      const session = activePrivateBillingSessions.get(billingSessionId);
      if (!session || !session.active) {
        return res.status(404).json({ error: "Private billing session is no longer active." });
      }

      // Prevent duplicate charges: If minute already billed, return success without charging again!
      if (session.billedMinuteKeys.includes(minuteNumber)) {
        const viewerWallet = getOrCreateWallet(session.viewerId);
        return res.json({
          success: true,
          alreadyBilled: true,
          billingSessionId,
          minuteNumber,
          viewerCoins: viewerWallet.viewerCoins,
          totalMinutesBilled: session.totalMinutesBilled,
          totalCoinsDeducted: session.totalCoinsDeducted,
          message: `Minute ${minuteNumber} already billed (duplicate prevented).`,
        });
      }

      const viewerWallet = getOrCreateWallet(session.viewerId);
      // Prevent negative coin balance:
      if (viewerWallet.viewerCoins < session.pricePerMinute) {
        session.active = false;
        session.endedAt = new Date().toISOString();
        const durationSeconds = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));

        // Log transaction immediately upon auto-exit
        const txnId = `PSTXN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const record: ServerPrivateSessionTransaction = {
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
          type: 'private_session',
        };
        privateSessionTransactionsDatabase.set(txnId, record);

        // Record in viewer history
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
          isTestMode: false,
        });

        return res.json({
          success: false,
          insufficientCoins: true,
          billingSessionId,
          viewerCoins: viewerWallet.viewerCoins,
          message: `Coin balance depleted! Private session ended automatically to prevent negative balance.`,
        });
      }

      // Deduct coins for this minute
      viewerWallet.viewerCoins -= session.pricePerMinute;

      // Credit creator earnings according to configured rate
      const creatorWallet = getOrCreateWallet(session.creatorId);
      const diamondsEarned = session.pricePerMinute;
      const earningsNgn = diamondsEarned * 2.0;

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
        message: `Minute ${minuteNumber} billed (${session.pricePerMinute} Coins). Remaining balance: ${viewerWallet.viewerCoins.toLocaleString()} Coins.`,
      });
    } catch (error: any) {
      console.error("Private Session Tick Error:", error);
      res.status(500).json({ error: error?.message || "Private session tick failed." });
    }
  });

  // POST /api/private-session/leave - Stop charging immediately when viewer leaves
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
            endedAt: new Date().toISOString(),
          },
          viewerCoins: getOrCreateWallet(viewerId).viewerCoins,
          message: "Session ended cleanly.",
        });
      }

      session.active = false;
      session.endedAt = new Date().toISOString();

      const durationSeconds = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = durationSeconds % 60;
      const durationFormatted = hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;

      const txnId = `PSTXN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const record: ServerPrivateSessionTransaction = {
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
        type: 'private_session',
      };

      privateSessionTransactionsDatabase.set(txnId, record);

      // Record in viewer history
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
        isTestMode: false,
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
          endedAt: session.endedAt,
        },
        viewerCoins: viewerWallet.viewerCoins,
        message: `Left private session. Charged ${session.totalCoinsDeducted} Coins for ${session.totalMinutesBilled} billed minutes. Balance: ${viewerWallet.viewerCoins.toLocaleString()} Coins.`,
      });
    } catch (error: any) {
      console.error("Private Session Leave Error:", error);
      res.status(500).json({ error: error?.message || "Failed to finalize private session leave." });
    }
  });

  // GET /api/private-session/history - View transactions for viewer or creator
  app.get("/api/private-session/history", (req, res) => {
    try {
      const userId = (req.query.userId as string) || "user_me";
      const results: ServerPrivateSessionTransaction[] = [];
      privateSessionTransactionsDatabase.forEach((txn) => {
        if (!userId || txn.viewerId === userId || txn.creatorId === userId) {
          results.push(txn);
        }
      });

      results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

      res.json({ history: results });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to load private session history." });
    }
  });

  // ==========================================
  // STREAMFLOW LIVE PK BATTLE API ENDPOINTS
  // ==========================================

  // 1. GET /api/pk/available-opponents - List creators available for PK challenge
  app.get("/api/pk/available-opponents", (_req, res) => {
    res.json({
      opponents: [
        {
          id: "creator_tokyo",
          name: "Yuki Tanaka",
          avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
          country: "Japan",
          countryFlag: "🇯🇵",
          bio: "Synthwave & Electronic Live DJ",
          followersCount: 142000,
          followingCount: 320,
          coins: 12000,
        },
        {
          id: "creator_rio",
          name: "Camila Santos",
          avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
          country: "Brazil",
          countryFlag: "🇧🇷",
          bio: "Acoustic Bossa Nova & Sunset Vocals",
          followersCount: 98000,
          followingCount: 410,
          coins: 8400,
        },
        {
          id: "creator_madrid",
          name: "Elena Vance",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
          country: "Spain",
          countryFlag: "🇪🇸",
          bio: "Flamenco Fusion & Live Freestyle",
          followersCount: 67000,
          followingCount: 290,
          coins: 5200,
        },
        {
          id: "creator_london",
          name: "DJ Marcus",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          country: "United Kingdom",
          countryFlag: "🇬🇧",
          bio: "Drum & Bass and Live Remix Sets",
          followersCount: 89000,
          followingCount: 512,
          coins: 6100,
        },
        {
          id: "creator_accra",
          name: "Kwame Mensah",
          avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
          country: "Ghana",
          countryFlag: "🇬🇭",
          bio: "Afrobeats Producer & Live Percussion",
          followersCount: 78000,
          followingCount: 430,
          coins: 7300,
        },
      ],
    });
  });

  // 2. POST /api/pk/challenge - Initiate a challenge and start a live PK battle
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
        punishmentRule = "Loser does 20 pushups and sings opponent's hit live",
      } = req.body;

      if (!opponentId || !opponentName) {
        return res.status(400).json({ error: "Opponent creator must be selected." });
      }

      const battleId = `PK_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const stream = streamsDatabase.get(challengerStreamId);

      const newBattle: ServerPKBattleSession = {
        id: battleId,
        challenger: {
          id: challengerId,
          name: challengerName,
          avatar: challengerAvatar,
          streamId: challengerStreamId,
          streamTitle: stream?.title || "StreamFlow Live Battle",
        },
        opponent: {
          id: opponentId,
          name: opponentName,
          avatar: opponentAvatar || "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
          streamId: opponentStreamId || challengerStreamId,
          streamTitle: "Challenger Live Stage",
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
        startedAt: new Date().toISOString(),
      };

      pkBattlesDatabase.set(battleId, newBattle);

      // Link to stream if present
      if (stream) {
        stream.pkBattle = {
          isActive: true,
          battleId,
          opponent: {
            id: opponentId,
            name: opponentName,
            avatar: opponentAvatar,
            country: 'Global',
            countryFlag: '🌐',
            bio: 'Live PK Challenger',
            followersCount: 50000,
            followingCount: 100,
            coins: 1000,
          },
          timeRemainingSeconds: newBattle.durationSeconds,
          playerScore: 0,
          opponentScore: 0,
          status: 'battling',
          punishmentRule,
        };
      }

      broadcastToAllSockets({
        type: "pk_started",
        battle: newBattle,
      });

      res.json({ success: true, battle: newBattle });
    } catch (err: any) {
      console.error("PK Challenge error:", err);
      res.status(500).json({ error: err?.message || "Failed to challenge creator." });
    }
  });

  // 3. GET /api/pk/active - Retrieve current active PK battle
  app.get("/api/pk/active", (req, res) => {
    try {
      const streamId = req.query.streamId as string;
      const creatorId = req.query.creatorId as string;

      let foundBattle: ServerPKBattleSession | null = null;
      for (const b of pkBattlesDatabase.values()) {
        if (b.status === "battling" || b.status === "lobby" || b.status === "countdown") {
          if (
            (streamId && (b.challenger.streamId === streamId || b.opponent.streamId === streamId)) ||
            (creatorId && (b.challenger.id === creatorId || b.opponent.id === creatorId))
          ) {
            foundBattle = b;
            break;
          }
        }
      }

      // If not specifically matched but streamId === 'stream_1', return defaultPKBattle
      if (!foundBattle && streamId === "stream_1") {
        foundBattle = pkBattlesDatabase.get("pk_battle_live_1") || null;
      }

      // Or return any active battle
      if (!foundBattle) {
        for (const b of pkBattlesDatabase.values()) {
          if (b.status === "battling") {
            foundBattle = b;
            break;
          }
        }
      }

      res.json({ battle: foundBattle });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to load active PK battle." });
    }
  });

  // 4. POST /api/pk/gift - Send gift to support either creator in battle
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
        idempotencyKey,
      } = req.body;

      if (!idempotencyKey) {
        return res.status(400).json({ error: "Idempotency key is required for PK gift transaction security." });
      }

      const battle = pkBattlesDatabase.get(battleId);
      if (!battle) {
        return res.status(404).json({ error: "PK Battle not found or expired." });
      }

      // Idempotency check: prevent duplicate deductions
      if (idempotencyKeysDatabase.has(idempotencyKey)) {
        const existingTxnId = idempotencyKeysDatabase.get(idempotencyKey)!;
        const existingTxn = giftTransactionsDatabase.get(existingTxnId);
        const senderWallet = getOrCreateWallet(senderId);
        return res.json({
          success: true,
          alreadyProcessed: true,
          message: "PK gift transaction already processed. Duplicate coin deduction prevented.",
          transaction: existingTxn,
          senderCoins: senderWallet.viewerCoins,
          scoreA: battle.challengerScore,
          scoreB: battle.opponentScore,
          battle,
        });
      }

      const gift = GIFTS_CATALOG.find((g) => g.id === giftId);
      if (!gift) {
        return res.status(400).json({ error: "Invalid virtual gift selected." });
      }

      const giftCount = Math.max(1, parseInt(count, 10) || 1);
      const totalCost = gift.coinPrice * giftCount;

      const senderWallet = getOrCreateWallet(senderId, senderName);

      // Validate viewer has enough coins (prevents negative balance)
      if (senderWallet.viewerCoins < totalCost) {
        return res.status(400).json({
          error: `Insufficient coins. You have ${senderWallet.viewerCoins.toLocaleString()} Coins, but sending ${giftCount}x ${gift.name} requires ${totalCost.toLocaleString()} Coins. Please top up your coins.`,
          requiredCoins: totalCost,
          availableCoins: senderWallet.viewerCoins,
          insufficientCoins: true,
        });
      }

      // Deduct viewer coins exactly once
      senderWallet.viewerCoins -= totalCost;

      // Determine target creator and credit earnings
      const isChallengerSide = targetCreatorId === battle.challenger.id;
      const targetCreator = isChallengerSide ? battle.challenger : battle.opponent;
      const targetWallet = getOrCreateWallet(targetCreator.id, targetCreator.name);

      const diamondsEarned = totalCost;
      const earningsNgn = diamondsEarned * 2.0;

      targetWallet.totalLifetimeDiamonds += diamondsEarned;
      targetWallet.totalLifetimeEarningsNgn += earningsNgn;
      targetWallet.availableDiamonds += diamondsEarned;
      targetWallet.availableEarningsNgn += earningsNgn;

      // Calculate battle points: 1 coin = 1 point
      const pointsAdded = totalCost;
      if (isChallengerSide) {
        battle.challengerScore += pointsAdded;
        // Update top supporters A
        const existing = battle.topSupportersA.find((s) => s.userId === senderId);
        if (existing) {
          existing.points += pointsAdded;
        } else {
          battle.topSupportersA.push({
            userId: senderId,
            name: senderName,
            avatar: senderAvatar,
            points: pointsAdded,
          });
        }
        battle.topSupportersA.sort((a, b) => b.points - a.points);
      } else {
        battle.opponentScore += pointsAdded;
        // Update top supporters B
        const existing = battle.topSupportersB.find((s) => s.userId === senderId);
        if (existing) {
          existing.points += pointsAdded;
        } else {
          battle.topSupportersB.push({
            userId: senderId,
            name: senderName,
            avatar: senderAvatar,
            points: pointsAdded,
          });
        }
        battle.topSupportersB.sort((a, b) => b.points - a.points);
      }

      // Record transaction
      const txnId = `PKGIFT_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const giftTxn: ServerGiftTransaction = {
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
        timestamp: new Date().toISOString(),
      };

      giftTransactionsDatabase.set(txnId, giftTxn);
      idempotencyKeysDatabase.set(idempotencyKey, txnId);

      const logItem: ServerPKGiftLogItem = {
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
        timestamp: new Date().toISOString(),
      };
      battle.giftLog.unshift(logItem);
      if (battle.giftLog.length > 50) battle.giftLog.pop();

      // Update stream object if present
      if (battle.challenger.streamId) {
        const stream = streamsDatabase.get(battle.challenger.streamId);
        if (stream && stream.pkBattle) {
          stream.pkBattle.playerScore = battle.challengerScore;
          stream.pkBattle.opponentScore = battle.opponentScore;
          stream.pkBattle.topSupporterMe = battle.topSupportersA[0] ? {
            name: battle.topSupportersA[0].name,
            avatar: battle.topSupportersA[0].avatar,
            coins: battle.topSupportersA[0].points,
          } : undefined;
          stream.pkBattle.topSupporterOpponent = battle.topSupportersB[0] ? {
            name: battle.topSupportersB[0].name,
            avatar: battle.topSupportersB[0].avatar,
            coins: battle.topSupportersB[0].points,
          } : undefined;
        }
      }

      // Broadcast real-time PK score update to all connected clients
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
        topSupportersB: battle.topSupportersB,
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
        battle,
      });
    } catch (err: any) {
      console.error("PK Gift error:", err);
      res.status(500).json({ error: err?.message || "Failed to process PK battle gift." });
    }
  });

  // 5. POST /api/pk/end - End or forfeit active battle and freeze scores
  app.post("/api/pk/end", (req, res) => {
    try {
      const { battleId } = req.body;
      const battle = pkBattlesDatabase.get(battleId);
      if (!battle) {
        return res.status(404).json({ error: "Battle not found." });
      }

      battle.status = "ended";
      battle.remainingSeconds = 0;
      battle.endedAt = new Date().toISOString();

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

      const record: ServerPKBattleRecord = {
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
        endedAt: battle.endedAt,
      };

      pkBattleHistoryDatabase.set(record.id, record);

      broadcastToAllSockets({
        type: "pk_ended",
        battleId: battle.id,
        battle,
        record,
      });

      res.json({ success: true, battle, record });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to end PK battle." });
    }
  });

  // 6. GET /api/pk/history - Retrieve battle records
  app.get("/api/pk/history", (req, res) => {
    try {
      const creatorId = req.query.creatorId as string;
      const historyList: ServerPKBattleRecord[] = [];

      pkBattleHistoryDatabase.forEach((rec) => {
        if (!creatorId || rec.creatorA.id === creatorId || rec.creatorB.id === creatorId) {
          historyList.push(rec);
        }
      });

      historyList.sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());

      res.json({ history: historyList });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to load PK history." });
    }
  });

  // Authoritative server countdown ticker for PK Battles
  setInterval(() => {
    pkBattlesDatabase.forEach((battle) => {
      if (battle.status === "battling") {
        if (battle.remainingSeconds > 0) {
          battle.remainingSeconds -= 1;
          if (battle.remainingSeconds === 0) {
            // Battle timer expired! Freeze scores and conclude
            battle.status = "ended";
            battle.endedAt = new Date().toISOString();

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

            const record: ServerPKBattleRecord = {
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
              endedAt: battle.endedAt,
            };

            pkBattleHistoryDatabase.set(record.id, record);

            broadcastToAllSockets({
              type: "pk_ended",
              battleId: battle.id,
              battle,
              record,
            });
          }
        }
      }
    });
  }, 1000);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    app.get("*", (req, res) => {
      console.log("Fallback route hit for:", req.url);
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Create unified HTTP + WebSocket server
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

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

  wss.on("connection", (ws: WebSocket) => {
    allConnectedSockets.add(ws);
    let currentStreamId: string | null = null;
    let currentUserId: string | null = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        switch (msg.type) {
          case "join_room": {
            const { streamId, userId, userName, userAvatar, isHost } = msg;
            currentStreamId = streamId;
            currentUserId = userId;

            if (!liveRooms.has(streamId)) {
              liveRooms.set(streamId, new Map());
            }
            const room = liveRooms.get(streamId)!;
            room.set(userId, { ws, userId, userName, userAvatar, isHost: !!isHost });

            // Update viewer count on stream object
            const stream = streamsDatabase.get(streamId);
            const count = room.size;
            if (stream) {
              stream.viewerCount = count;
            }

            // Broadcast current viewer count to room
            broadcastToRoom(streamId, {
              type: "viewer_count",
              streamId,
              count,
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
                count,
              });
            }
            break;
          }
          case "chat_message": {
            const { streamId, message } = msg;
            broadcastToRoom(streamId, {
              type: "chat_message",
              streamId,
              message,
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
              senderId,
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
              streamId,
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
              enabled,
            });
            break;
          }
          case "stream_ended": {
            const { streamId, summary } = msg;
            broadcastToRoom(streamId, {
              type: "stream_ended",
              streamId,
              summary,
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
            count,
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
