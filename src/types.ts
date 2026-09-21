export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  country: string;
  countryFlag: string;
  language: string;
  bio: string;
  followers: number;
  diamonds: number;
  coins: number;
  email?: string;
  isVerified?: boolean;
  level: number;
}

export interface VirtualGift {
  id: string;
  name: string;
  icon: string;
  coinPrice: number;
  animationType: 'rose' | 'fireworks' | 'supercar' | 'dragon' | 'galaxy' | 'heart';
  color: string;
  soundEffect?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderLevel: number;
  text: string;
  timestamp: string;
  sourceLanguage?: string;
  translatedText?: string;
  targetLanguage?: string;
  isTranslating?: boolean;
  type?: 'chat' | 'gift' | 'system' | 'ai-cohost' | 'pk-alert';
  giftInfo?: {
    giftId: string;
    giftName: string;
    giftIcon: string;
    count: number;
  };
}

export interface StreamSession {
  id: string;
  title: string;
  creator: UserProfile;
  category: 'Gaming' | 'Music & Dance' | 'ChitChat' | 'Cooking' | 'Fitness' | 'Cosplay';
  viewerCount: number;
  likesCount: number;
  isLive: boolean;
  commentsEnabled?: boolean;
  videoMode?: 'camera' | 'interactive_canvas';
  isPrivate: boolean;
  privateType?: 'pay_per_minute' | 'passcode' | 'invite_only';
  pricePerMinute?: number;
  allowedUsernames?: string[];
  allowedUserIds?: string[];
  privatePasscode?: string;
  entryCoinFee?: number;
  streamUrl?: string;
  coverImage: string;
  tags: string[];
  pkBattle?: PKBattleState;
  guests: StreamGuest[];
  totalDiamondsEarned: number;
  durationSeconds: number;
  streaming?: {
    sessionId: string;
    provider: StreamingProviderType;
    isProductionReady: boolean;
    credentials?: StreamingCredentials;
  };
}

export interface PKBattleState {
  isActive: boolean;
  battleId?: string;
  opponent: UserProfile;
  opponentStreamUrl?: string;
  timeRemainingSeconds: number; // e.g. 180s = 3 mins
  playerScore: number;
  opponentScore: number;
  status: 'pending' | 'lobby' | 'countdown' | 'battling' | 'punishment' | 'ended';
  punishmentRule?: string;
  winnerId?: string | 'draw' | null;
  winnerName?: string | null;
  topSupporterMe?: { name: string; avatar: string; coins: number };
  topSupporterOpponent?: { name: string; avatar: string; coins: number };
  playerViewerCount?: number;
  opponentViewerCount?: number;
  topSupportersMe?: PKSupporter[];
  topSupportersOpponent?: PKSupporter[];
  giftLog?: PKGiftLogItem[];
}

export interface PKSupporter {
  userId: string;
  name: string;
  avatar: string;
  points: number;
}

export interface PKGiftLogItem {
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

export interface PKBattleSession {
  id: string;
  challenger: UserProfile;
  opponent: UserProfile;
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
  topSupportersA: PKSupporter[];
  topSupportersB: PKSupporter[];
  giftLog: PKGiftLogItem[];
  startedAt?: string;
  endedAt?: string;
}

export interface PKBattleRecord {
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

export interface StreamGuest {
  id: string;
  user: UserProfile;
  mode: 'video' | 'voice';
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface ShortVideo {
  id: string;
  creator: UserProfile;
  description: string;
  tags: string[];
  audioTitle: string;
  videoUrl?: string;
  likes: number;
  commentsCount: number;
  shares: number;
  isLiked?: boolean;
  originalLanguage: string;
  translatedDescription?: string;
}

export interface StreamExportReport {
  timestamp: string;
  streamTitle: string;
  streamer: string;
  duration: string;
  peakViewers: number;
  totalGiftsReceived: number;
  diamondsEarned: number;
  estimatedEarningsUsd: number;
  pkWinLoss: string;
  topGifter: string;
}

export interface CoinPackage {
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

export interface PaystackTransaction {
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
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  paidAt?: string | null;
  credited: boolean;
  createdAt: string;
  authorizationUrl?: string | null;
  channel?: string;
  gatewayResponse?: string;
  isTestMode: boolean;
}

export interface PaystackConfigResponse {
  isConfigured: boolean;
  testMode: boolean;
  currency: string;
  packages: CoinPackage[];
}

export interface PaystackVerifyResponse {
  success: boolean;
  alreadyCredited?: boolean;
  credited?: boolean;
  coinsAdded?: number;
  transaction?: PaystackTransaction;
  message?: string;
  error?: string;
}

export interface GiftTransaction {
  id: string;
  idempotencyKey: string;
  streamId: string;
  streamTitle?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  creatorId: string;
  creatorName: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  count: number;
  coinsSpent: number; // viewer coins deducted
  diamondsEarned: number; // creator diamonds credited
  earningsNgn: number; // cash equivalent in NGN
  timestamp: string;
}

export interface CreatorWithdrawal {
  id: string;
  creatorId: string;
  creatorName: string;
  amountNgn: number;
  diamondsDeducted: number;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  reference: string;
  requestedAt: string;
  processedAt?: string | null;
  failureReason?: string;
  isViewerCoinsAttempt?: boolean;
}

export interface PrivateSessionTransaction {
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

export interface CreatorWallet {
  creatorId: string;
  creatorName: string;
  viewerCoins: number; // Non-withdrawable
  totalLifetimeDiamonds: number;
  totalLifetimeEarningsNgn: number;
  availableDiamonds: number;
  availableEarningsNgn: number; // Withdrawable
  pendingDiamonds: number;
  pendingWithdrawalsNgn: number;
  totalWithdrawnNgn: number;
  diamondsToNgnRate: number; // e.g. 2.00 NGN per diamond
  minWithdrawalNgn: number; // e.g. 2,000 NGN
  giftHistory: GiftTransaction[];
  withdrawalHistory: CreatorWithdrawal[];
  privateSessionHistory?: PrivateSessionTransaction[];
}

export interface SendGiftResponse {
  success: boolean;
  alreadyProcessed?: boolean;
  message?: string;
  error?: string;
  transaction?: GiftTransaction;
  senderCoins?: number;
  creatorDiamonds?: number;
  creatorEarningsNgn?: number;
}

export interface PrivateSessionJoinResponse {
  success: boolean;
  billingSessionId: string;
  streamId: string;
  pricePerMinute: number;
  viewerCoins: number;
  totalMinutesBilled: number;
  message: string;
  error?: string;
}

export interface PrivateSessionTickResponse {
  success: boolean;
  billingSessionId: string;
  minuteNumber: number;
  viewerCoins: number;
  totalMinutesBilled: number;
  totalCoinsDeducted: number;
  creatorDiamonds?: number;
  insufficientCoins?: boolean;
  message?: string;
  error?: string;
}

export interface PrivateSessionLeaveResponse {
  success: boolean;
  summary: {
    sessionId: string;
    streamId: string;
    streamTitle: string;
    durationSeconds: number;
    durationFormatted: string;
    minutesBilled: number;
    totalCoinsDeducted: number;
    diamondsCredited: number;
    earningsNgn: number;
    endedAt: string;
  };
  viewerCoins: number;
  message: string;
  error?: string;
}

export type StreamingProviderType = 'livekit' | 'agora' | 'mux' | 'cloudflare_stream' | 'dev_webrtc_mock';
export type StreamParticipantRole = 'host' | 'cohost' | 'viewer';

export interface StreamingCredentials {
  provider: StreamingProviderType;
  isProductionReady: boolean;
  roomId: string;
  streamId: string;
  userId: string;
  userName: string;
  role: StreamParticipantRole;
  token: string;
  serverUrl?: string;
  ingestEndpoint?: {
    protocol: 'whip' | 'rtmp' | 'webrtc';
    url: string;
    streamKey?: string;
  };
  playbackEndpoint?: {
    protocol: 'whep' | 'hls' | 'webrtc';
    url: string;
  };
  iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>;
  expiresAt: string;
  instructions?: string;
}

export interface StreamingSessionDetails {
  sessionId: string;
  streamId: string;
  title: string;
  provider: StreamingProviderType;
  isProductionReady: boolean;
  hostId: string;
  createdAt: string;
  active: boolean;
  viewersCount: number;
  broadcasterCredentials: StreamingCredentials;
}

export interface StreamingPresenceParticipant {
  userId: string;
  userName: string;
  avatar?: string;
  role: StreamParticipantRole;
  joinedAt: string;
  isOnline: boolean;
}

export interface StreamingPresenceInfo {
  streamId: string;
  totalViewers: number;
  peakViewers: number;
  participants: StreamingPresenceParticipant[];
  provider: StreamingProviderType;
  isProductionReady: boolean;
  lastUpdated: string;
}

export interface StreamingStatusResponse {
  status: 'configured' | 'dev_fallback';
  activeProvider: StreamingProviderType;
  providerName: string;
  isProductionReady: boolean;
  configuredProviders: string[];
  availableAdapters: Array<{
    id: string;
    name: string;
    description: string;
    requiredEnv: string[];
    isConfigured: boolean;
  }>;
  missingEnvVars: Record<string, string[]>;
  supportedProtocols: string[];
  instructions: string;
}

