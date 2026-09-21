import { 
  PKBattleSession, 
  PKBattleRecord, 
  VirtualGift, 
  UserProfile 
} from '../types';
import { OPPONENT_CREATORS } from '../mockData';

export interface ChallengeCreatorPayload {
  challengerId: string;
  challengerName: string;
  challengerAvatar: string;
  challengerStreamId: string;
  opponentId: string;
  opponentName: string;
  opponentAvatar: string;
  opponentStreamId?: string;
  durationSeconds?: number;
  punishmentRule?: string;
}

export interface SendPKGiftPayload {
  battleId: string;
  targetCreatorId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  giftId: string;
  count?: number;
  idempotencyKey?: string;
}

export interface SendPKGiftResponse {
  success: boolean;
  alreadyProcessed?: boolean;
  message: string;
  battleId: string;
  targetCreatorId: string;
  pointsAdded: number;
  scoreA: number;
  scoreB: number;
  senderCoins: number;
  creatorDiamonds: number;
  giftLogItem: any;
  error?: string;
}

/**
 * Fetch available creators ready for PK Battle challenge
 */
export async function fetchAvailableOpponents(): Promise<UserProfile[]> {
  try {
    const res = await fetch('/api/pk/available-opponents');
    if (!res.ok) throw new Error('Failed to load opponents');
    const data = await res.json();
    return data.opponents || [];
  } catch (err) {
    console.warn('Using fallback opponents list:', err);
    return OPPONENT_CREATORS;
  }
}

/**
 * Challenge a creator and initialize a PK Battle in the lobby
 */
export async function createPKChallenge(payload: ChallengeCreatorPayload): Promise<PKBattleSession> {
  const res = await fetch('/api/pk/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to start PK battle challenge.');
  }

  return data.battle;
}

/**
 * Fetch active PK battle for a stream
 */
export async function fetchActivePKBattle(streamId: string): Promise<PKBattleSession | null> {
  try {
    const res = await fetch(`/api/pk/active?streamId=${encodeURIComponent(streamId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.battle || null;
  } catch (err) {
    return null;
  }
}

/**
 * Send virtual gift to support either creator in a PK battle
 * Ensures idempotency and single coin deduction
 */
export async function sendPKBattleGift(payload: SendPKGiftPayload): Promise<SendPKGiftResponse> {
  const idempotencyKey = payload.idempotencyKey || `PK_GIFT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const res = await fetch('/api/pk/gift', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idempotencyKey }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send PK battle gift.');
  }

  return data;
}

/**
 * End or forfeit an active PK Battle
 */
export async function endPKBattle(battleId: string): Promise<PKBattleRecord> {
  const res = await fetch('/api/pk/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ battleId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to end PK battle.');
  }

  return data.record;
}

/**
 * Fetch PK battle historical records
 */
export async function fetchPKBattleHistory(creatorId?: string): Promise<PKBattleRecord[]> {
  try {
    const url = creatorId ? `/api/pk/history?creatorId=${encodeURIComponent(creatorId)}` : '/api/pk/history';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch (err) {
    console.warn('Failed to fetch PK history:', err);
    return [];
  }
}
