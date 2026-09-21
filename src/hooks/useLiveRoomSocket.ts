import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage, VirtualGift } from '../types';

export interface UseLiveRoomSocketOptions {
  streamId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isHost?: boolean;
  onChatMessage?: (msg: ChatMessage) => void;
  onGiftReceived?: (gift: VirtualGift, count: number, senderName: string, diamonds: number) => void;
  onLikeReceived?: () => void;
  onViewerCountUpdate?: (count: number) => void;
  onCommentsToggled?: (enabled: boolean) => void;
  onStreamEnded?: (summary?: any) => void;
  onPKStarted?: (battle: any) => void;
  onPKScoreUpdate?: (data: any) => void;
  onPKEnded?: (data: any) => void;
}

export function useLiveRoomSocket({
  streamId,
  userId,
  userName,
  userAvatar,
  isHost = false,
  onChatMessage,
  onGiftReceived,
  onLikeReceived,
  onViewerCountUpdate,
  onCommentsToggled,
  onStreamEnded,
  onPKStarted,
  onPKScoreUpdate,
  onPKEnded,
}: UseLiveRoomSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeViewerCount, setActiveViewerCount] = useState<number>(1);
  const reconnectTimeoutRef = useRef<any>(null);

  // Keep latest callbacks in refs to avoid reconnection loops
  const callbacksRef = useRef({
    onChatMessage,
    onGiftReceived,
    onLikeReceived,
    onViewerCountUpdate,
    onCommentsToggled,
    onStreamEnded,
    onPKStarted,
    onPKScoreUpdate,
    onPKEnded,
  });

  useEffect(() => {
    callbacksRef.current = {
      onChatMessage,
      onGiftReceived,
      onLikeReceived,
      onViewerCountUpdate,
      onCommentsToggled,
      onStreamEnded,
      onPKStarted,
      onPKScoreUpdate,
      onPKEnded,
    };
  }, [
    onChatMessage,
    onGiftReceived,
    onLikeReceived,
    onViewerCountUpdate,
    onCommentsToggled,
    onStreamEnded,
    onPKStarted,
    onPKScoreUpdate,
    onPKEnded,
  ]);

  useEffect(() => {
    let isSubscribed = true;

    function connect() {
      if (!streamId) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/stream?streamId=${encodeURIComponent(streamId)}`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          setIsConnected(true);
          // Send join message
          ws.send(JSON.stringify({
            type: 'join_room',
            streamId,
            userId,
            userName,
            userAvatar,
            isHost,
          }));
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            switch (data.type) {
              case 'viewer_count':
                if (typeof data.count === 'number') {
                  setActiveViewerCount(data.count);
                  callbacksRef.current.onViewerCountUpdate?.(data.count);
                }
                break;
              case 'chat_message':
                if (data.message) {
                  callbacksRef.current.onChatMessage?.(data.message);
                }
                break;
              case 'gift_broadcast':
                if (data.gift) {
                  callbacksRef.current.onGiftReceived?.(
                    data.gift,
                    data.count || 1,
                    data.senderName || 'Anonymous',
                    data.diamonds || 0
                  );
                }
                break;
              case 'like_broadcast':
                callbacksRef.current.onLikeReceived?.();
                break;
              case 'comments_toggled':
                callbacksRef.current.onCommentsToggled?.(!!data.enabled);
                break;
              case 'stream_ended':
                callbacksRef.current.onStreamEnded?.(data.summary);
                break;
              case 'pk_started':
                if (data.battle) {
                  callbacksRef.current.onPKStarted?.(data.battle);
                }
                break;
              case 'pk_score_update':
                callbacksRef.current.onPKScoreUpdate?.(data);
                break;
              case 'pk_ended':
                callbacksRef.current.onPKEnded?.(data);
                break;
              default:
                break;
            }
          } catch (e) {
            console.warn('Failed to parse WebSocket message:', e);
          }
        };

        ws.onerror = (err) => {
          console.warn('Live stream WebSocket notice (using fallback if disconnected):', err);
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          setIsConnected(false);
          // Try reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isSubscribed) connect();
          }, 3000);
        };
      } catch (err) {
        console.warn('WebSocket connection error:', err);
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        try {
          if (socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'leave_room',
              streamId,
              userId,
            }));
          }
          socketRef.current.close();
        } catch (_) {}
      }
    };
  }, [streamId, userId, userName, userAvatar, isHost]);

  // Public socket actions
  const sendChatMessage = useCallback((message: ChatMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat_message',
        streamId,
        message,
      }));
    }
  }, [streamId]);

  const sendGiftBroadcast = useCallback((gift: VirtualGift, count: number, diamonds: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'gift_broadcast',
        streamId,
        gift,
        count,
        diamonds,
        senderId: userId,
        senderName: userName,
        senderAvatar: userAvatar,
      }));
    }
  }, [streamId, userId, userName, userAvatar]);

  const sendLikeBroadcast = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'like_broadcast',
        streamId,
      }));
    }
  }, [streamId]);

  const toggleCommentsBroadcast = useCallback((enabled: boolean) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'toggle_comments',
        streamId,
        enabled,
      }));
    }
  }, [streamId]);

  const notifyStreamEnded = useCallback((summary?: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'stream_ended',
        streamId,
        summary,
      }));
    }
  }, [streamId]);

  return {
    isConnected,
    activeViewerCount,
    sendChatMessage,
    sendGiftBroadcast,
    sendLikeBroadcast,
    toggleCommentsBroadcast,
    notifyStreamEnded,
  };
}
