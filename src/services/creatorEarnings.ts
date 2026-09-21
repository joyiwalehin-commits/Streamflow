import { CreatorWallet, CreatorWithdrawal, GiftTransaction, SendGiftResponse } from '../types';

export interface SendGiftPayload {
  idempotencyKey?: string;
  streamId: string;
  streamTitle?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  creatorId: string;
  creatorName: string;
  giftId: string;
  count: number;
}

export interface WithdrawalRequestPayload {
  creatorId: string;
  amountNgn: number;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  withdrawalPin?: string;
  attemptViewerCoins?: boolean; // For testing rejection
}

/**
 * Send a virtual gift to a creator during live stream.
 * Automatically handles idempotency, server-side coin deduction, and creator earnings crediting.
 */
export async function sendVirtualGift(payload: SendGiftPayload): Promise<SendGiftResponse> {
  const idempotencyKey = payload.idempotencyKey || `gift_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const response = await fetch('/api/gifts/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      idempotencyKey,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send virtual gift.');
  }

  return data;
}

/**
 * Fetch creator wallet details, including available withdrawable earnings,
 * non-withdrawable viewer coins, gift history, and withdrawal logs.
 */
export async function fetchCreatorWallet(creatorId: string = 'user_me'): Promise<CreatorWallet> {
  const response = await fetch(`/api/creator/wallet?creatorId=${encodeURIComponent(creatorId)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch creator wallet.');
  }

  return data.wallet;
}

/**
 * Fetch current user's wallet overview (viewer coins and earnings)
 */
export async function fetchUserWallet(userId: string = 'user_me'): Promise<{
  userId: string;
  userName: string;
  viewerCoins: number;
  availableEarningsNgn: number;
  availableDiamonds: number;
  totalLifetimeEarningsNgn: number;
  totalLifetimeDiamonds: number;
  totalWithdrawnNgn: number;
}> {
  const response = await fetch(`/api/wallet/user?userId=${encodeURIComponent(userId)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch user wallet.');
  }

  return data.wallet;
}

/**
 * Submit a secure withdrawal request for creator earnings in Nigerian Naira.
 * Server strictly prevents withdrawal of viewer coins.
 */
export async function submitWithdrawalRequest(payload: WithdrawalRequestPayload): Promise<{
  success: boolean;
  message: string;
  withdrawal: CreatorWithdrawal;
  updatedWallet: CreatorWallet;
}> {
  const response = await fetch('/api/creator/withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Withdrawal request failed.');
  }

  return data;
}
