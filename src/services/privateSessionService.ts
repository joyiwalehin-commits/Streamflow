import type { 
  PrivateSessionJoinResponse, 
  PrivateSessionTickResponse, 
  PrivateSessionLeaveResponse,
  PrivateSessionTransaction
} from '../types';

export type { 
  PrivateSessionJoinResponse, 
  PrivateSessionTickResponse, 
  PrivateSessionLeaveResponse,
  PrivateSessionTransaction
};

export interface JoinPrivateSessionPayload {
  streamId: string;
  viewerId: string;
  viewerName: string;
  passcode?: string;
}

export interface TickPrivateSessionPayload {
  billingSessionId: string;
  streamId: string;
  viewerId: string;
  minuteNumber: number;
}

export interface LeavePrivateSessionPayload {
  billingSessionId: string;
  streamId: string;
  viewerId: string;
}

/**
 * Join a private live session and initiate authoritative per-minute coin billing.
 * Verifies sufficient coins, checks allowed access list / passcode, and bills the initial minute.
 */
export async function joinPrivateSession(payload: JoinPrivateSessionPayload): Promise<PrivateSessionJoinResponse> {
  const response = await fetch('/api/private-session/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to join private live session.');
  }

  return data;
}

/**
 * Heartbeat minute tick to bill subsequent minutes and prevent negative balances.
 * Server prevents duplicate charges using idempotency keys.
 */
export async function sendPrivateSessionTick(payload: TickPrivateSessionPayload): Promise<PrivateSessionTickResponse> {
  const response = await fetch('/api/private-session/tick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Private session billing heartbeat failed.');
  }

  return data;
}

export const tickPrivateSession = sendPrivateSessionTick;

/**
 * Stop charging immediately when viewer leaves or disconnects.
 * Finalizes transactions and logs receipts for both viewer and creator.
 */
export async function leavePrivateSession(payload: LeavePrivateSessionPayload): Promise<PrivateSessionLeaveResponse> {
  const response = await fetch('/api/private-session/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to leave private live session cleanly.');
  }

  return data;
}

/**
 * Fetch recorded private-session transactions for a viewer or creator.
 */
export async function fetchPrivateSessionHistory(userId: string = 'user_me'): Promise<PrivateSessionTransaction[]> {
  try {
    const response = await fetch(`/api/private-session/history?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.history || [];
  } catch (err) {
    console.warn('Failed to fetch private session history:', err);
    return [];
  }
}
