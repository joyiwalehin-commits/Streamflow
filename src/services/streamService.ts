import { StreamSession } from '../types';

export interface StartStreamPayload {
  title: string;
  category: 'Gaming' | 'Music & Dance' | 'ChitChat' | 'Cooking' | 'Fitness' | 'Cosplay';
  commentsEnabled: boolean;
  videoMode: 'camera' | 'interactive_canvas';
  isPrivate?: boolean;
  privateType?: 'pay_per_minute' | 'passcode' | 'invite_only';
  pricePerMinute?: number;
  allowedUsernames?: string[];
  allowedUserIds?: string[];
  privatePasscode?: string;
  entryCoinFee?: number;
  tags?: string[];
  enablePKBattle?: boolean;
  creator: {
    id: string;
    name: string;
    avatar: string;
    country: string;
    countryFlag: string;
    followers?: number;
  };
}

export interface EndStreamSummary {
  streamId: string;
  title: string;
  durationSeconds: number;
  durationFormatted: string;
  peakViewers: number;
  totalDiamondsEarned: number;
  estimatedEarningsNgn: number;
  newFollowersCount: number;
  endedAt: string;
}

/**
 * Fetch all active live streams from the server
 */
export async function fetchActiveStreams(): Promise<StreamSession[]> {
  try {
    const res = await fetch('/api/streams');
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    return data.streams || [];
  } catch (err) {
    console.warn('Failed to fetch streams from server, falling back:', err);
    return [];
  }
}

/**
 * Start a new live stream on the server
 */
export async function startLiveStream(payload: StartStreamPayload): Promise<StreamSession> {
  const res = await fetch('/api/streams/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to start live stream');
  }

  const data = await res.json();
  const stream: StreamSession = data.stream;
  if (data.streaming) {
    stream.streaming = data.streaming;
  }
  return stream;
}

/**
 * End an active live stream on the server
 */
export async function endLiveStream(streamId: string): Promise<EndStreamSummary> {
  const res = await fetch(`/api/streams/${streamId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to end live stream');
  }

  const data = await res.json();
  return data.summary;
}
