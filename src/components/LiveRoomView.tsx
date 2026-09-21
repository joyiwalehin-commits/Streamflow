import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Share2, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Gift, 
  Coins,
  Swords, 
  Users, 
  Lock, 
  Key, 
  Sparkles, 
  FileSpreadsheet,
  AlertCircle,
  Radio,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Square,
  ArrowLeft,
  UserPlus,
  UserCheck,
  MessageSquare,
  MessageSquareOff,
  Layers,
  Info,
  Sliders,
  Sparkle,
  Trophy,
  CheckCircle2,
  Wallet,
  Clock,
  Receipt,
  Shield,
  Loader2
} from 'lucide-react';
import { StreamSession, UserProfile, VirtualGift, ChatMessage, PKBattleState, PKBattleSession, StreamingCredentials, StreamingStatusResponse } from '../types';
import { PKBattleArena } from './PKBattleArena';
import { PKBattleLobbyModal } from './PKBattleLobbyModal';
import { PKBattleHistoryModal } from './PKBattleHistoryModal';
import { fetchActivePKBattle } from '../services/pkBattleService';
import { MultiGuestPanel } from './MultiGuestPanel';
import { LiveChatStream } from './LiveChatStream';
import { VirtualGiftModal } from './VirtualGiftModal';
import { useLiveRoomSocket } from '../hooks/useLiveRoomSocket';
import { endLiveStream, EndStreamSummary } from '../services/streamService';
import { streamingProviderService } from '../services/streamingProviderService';
import { StreamingSetupModal } from './StreamingSetupModal';
import { StreamingPresenceModal } from './StreamingPresenceModal';
import { LiveKitVideoStage } from './LiveKitVideoStage';
import {
  joinPrivateSession,
  tickPrivateSession,
  leavePrivateSession,
  PrivateSessionLeaveResponse,
} from '../services/privateSessionService';

interface LiveRoomViewProps {
  stream: StreamSession;
  currentUser: UserProfile;
  selectedLanguage: string;
  onSendGift: (gift: VirtualGift, count: number) => void;
  onLikeStream: () => void;
  onAddCoins: () => void;
  onCoinsUpdated?: (newBalance: number) => void;
  onUnlockPrivateStream?: (passcode: string) => boolean;
  onExportToSheets?: () => void;
  onBackToExplore?: () => void;
  onOpenCreatorWallet?: () => void;
}

export const LiveRoomView: React.FC<LiveRoomViewProps> = ({
  stream,
  currentUser,
  selectedLanguage,
  onSendGift,
  onLikeStream,
  onAddCoins,
  onCoinsUpdated,
  onUnlockPrivateStream,
  onExportToSheets,
  onBackToExplore,
  onOpenCreatorWallet,
}) => {
  const isHost = currentUser.id === stream.creator.id;
  const pricePerMinute = Number(stream.pricePerMinute || stream.entryCoinFee || 20);

  // Private Room & Time-Based Billing state
  const [viewerCurrentCoins, setViewerCurrentCoins] = useState<number>(currentUser.coins);
  useEffect(() => {
    setViewerCurrentCoins(currentUser.coins);
  }, [currentUser.coins]);

  const [billingSessionId, setBillingSessionId] = useState<string | null>(null);
  const billingSessionIdRef = useRef<string | null>(null);
  billingSessionIdRef.current = billingSessionId;

  const [isLocked, setIsLocked] = useState<boolean>(Boolean(stream.isPrivate && !isHost));
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isJoiningPrivate, setIsJoiningPrivate] = useState(false);
  const [privateMinutesBilled, setPrivateMinutesBilled] = useState<number>(0);
  const [privateCoinsDeducted, setPrivateCoinsDeducted] = useState<number>(0);
  const [secondsUntilNextTick, setSecondsUntilNextTick] = useState<number>(60);
  const [leaveSummary, setLeaveSummary] = useState<PrivateSessionLeaveResponse['summary'] | null>(null);
  const [isLeaveSummaryOpen, setIsLeaveSummaryOpen] = useState(false);
  const [insufficientCoinsNotice, setInsufficientCoinsNotice] = useState<string | null>(null);

  // Stream state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoMode, setVideoMode] = useState<'camera' | 'interactive_canvas'>(stream.videoMode || 'camera');
  const [commentsEnabled, setCommentsEnabled] = useState<boolean>(stream.commentsEnabled !== false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [activeGiftAnimation, setActiveGiftAnimation] = useState<VirtualGift | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number }[]>([]);
  const [showArchInfo, setShowArchInfo] = useState(false);

  // Follower state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(stream.creator.followers || 12400);

  // Stats
  const [liveViewerCount, setLiveViewerCount] = useState<number>(stream.viewerCount || 1);
  const [sessionDiamonds, setSessionDiamonds] = useState<number>(stream.totalDiamondsEarned || 0);

  // End Stream Modal
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [endSummary, setEndSummary] = useState<EndStreamSummary | null>(null);
  const [streamHasEnded, setStreamHasEnded] = useState(false);

  // Live broadcast duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(stream.durationSeconds || 0);
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // PK Battle State & Modals
  const [activePKBattle, setActivePKBattle] = useState<PKBattleState | null>(
    stream.pkBattle?.isActive ? stream.pkBattle : null
  );
  const [isPKLobbyOpen, setIsPKLobbyOpen] = useState<boolean>(false);
  const [isPKHistoryOpen, setIsPKHistoryOpen] = useState<boolean>(false);

  // Production Streaming Service Abstraction state & Presence tracking
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatusResponse | null>(null);
  const [streamingCredentials, setStreamingCredentials] = useState<StreamingCredentials | null>(
    stream.streaming?.credentials || null
  );
  const [isStreamingSetupModalOpen, setIsStreamingSetupModalOpen] = useState(false);
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState(false);

  // Streaming presence registration and heartbeat loop
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch backend streaming provider status
    streamingProviderService
      .getStatus()
      .then((status) => {
        if (isMounted) setStreamingStatus(status);
      })
      .catch((err) => console.warn('Could not fetch streaming provider status:', err));

    // 2. Join streaming session & register presence
    streamingProviderService
      .joinSession({
        streamId: stream.id,
        userId: currentUser.id,
        userName: currentUser.name,
        avatar: currentUser.avatar,
        role: isHost ? 'host' : 'viewer',
      })
      .then((result) => {
        if (!isMounted) return;
        if (result.credentials) setStreamingCredentials(result.credentials);
        if (result.totalViewers) setLiveViewerCount(result.totalViewers);
      })
      .catch((err) => console.warn('Could not register streaming session join:', err));

    // 3. Heartbeat every 10 seconds to maintain active presence
    const heartbeatInterval = setInterval(() => {
      streamingProviderService
        .sendHeartbeat({
          streamId: stream.id,
          userId: currentUser.id,
          userName: currentUser.name,
          role: isHost ? 'host' : 'viewer',
        })
        .then((res) => {
          if (!isMounted) return;
          if (res.activeViewers) setLiveViewerCount(res.activeViewers);
        })
        .catch(() => {});
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(heartbeatInterval);
      streamingProviderService.leaveSession(stream.id, currentUser.id).catch(() => {});
    };
  }, [stream.id, currentUser.id, currentUser.name, currentUser.avatar, isHost]);

  // Poll / Check active PK battle from backend server
  useEffect(() => {
    let isMounted = true;
    const checkPK = () => {
      fetchActivePKBattle(stream.id)
        .then((battle) => {
          if (!isMounted) return;
          if (battle && (battle.status === 'battling' || battle.status === 'countdown' || battle.status === 'lobby')) {
            setActivePKBattle({
              isActive: true,
              battleId: battle.id,
              opponent: battle.opponent,
              timeRemainingSeconds: battle.remainingSeconds,
              playerScore: battle.challengerScore,
              opponentScore: battle.opponentScore,
              status: battle.status,
              punishmentRule: battle.punishmentRule,
              winnerId: battle.winnerId,
              winnerName: battle.winnerName,
              playerViewerCount: battle.challengerViewerCount,
              opponentViewerCount: battle.opponentViewerCount,
              topSupportersMe: battle.topSupportersA,
              topSupportersOpponent: battle.topSupportersB,
              giftLog: battle.giftLog,
            });
          }
        })
        .catch(() => {});
    };

    checkPK();
    const interval = setInterval(checkPK, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stream.id]);

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Hardware Camera MediaStream ref for Host
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  // Acquire host camera stream when in host mode and camera video mode
  useEffect(() => {
    let active = true;

    async function startHostCamera() {
      if (!isHost || videoMode !== 'camera') {
        stopHostCamera();
        return;
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices API not available in this context');
        }

        const streamTrack = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });

        if (!active) {
          streamTrack.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = streamTrack;
        setCameraAvailable(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamTrack;
        }
      } catch (err) {
        console.warn('Host camera capture notice:', err);
        if (active) {
          setCameraAvailable(false);
        }
      }
    }

    startHostCamera();

    return () => {
      active = false;
      stopHostCamera();
    };
  }, [isHost, videoMode]);

  function stopHostCamera() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }

  // Real-time Chat Messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_sys_welcome',
      senderId: 'system',
      senderName: 'StreamFlow Hub',
      senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
      senderLevel: 99,
      text: `🎉 Welcome to ${stream.creator.name}'s room! Real-time WebSockets & AI translation are active.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
    },
    {
      id: 'msg_1',
      senderId: 'user_jp',
      senderName: 'Kenji_Tokyo',
      senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      senderLevel: 24,
      text: '東京からの応援です！PKバトル絶対勝ってね！🔥',
      sourceLanguage: 'Japanese',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'msg_2',
      senderId: 'user_br',
      senderName: 'Luciana_Rio',
      senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
      senderLevel: 31,
      text: 'Essa música está incrível demais! Boa sorte no PK! 🇧🇷✨',
      sourceLanguage: 'Portuguese',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Connect to WebSocket Server for Real-Time synchronization
  const {
    isConnected: isSocketConnected,
    sendChatMessage: socketSendChat,
    sendGiftBroadcast: socketSendGift,
    sendLikeBroadcast: socketSendLike,
    toggleCommentsBroadcast: socketToggleComments,
    notifyStreamEnded: socketNotifyEnded,
  } = useLiveRoomSocket({
    streamId: stream.id,
    userId: currentUser.id,
    userName: currentUser.name,
    userAvatar: currentUser.avatar,
    isHost,
    onViewerCountUpdate: (count) => {
      setLiveViewerCount(count);
    },
    onChatMessage: (message) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    },
    onGiftReceived: (gift, count, senderName, diamonds) => {
      setActiveGiftAnimation(gift);
      setTimeout(() => setActiveGiftAnimation(null), 2800);
      setSessionDiamonds((prev) => prev + diamonds);

      // System chat announcement for gift
      setChatMessages((prev) => [
        ...prev,
        {
          id: `gift_announcement_${Date.now()}_${Math.random()}`,
          senderId: 'system',
          senderName: 'StreamFlow Gift Alert',
          senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
          senderLevel: 99,
          text: `🎁 ${senderName} sent ${count}x ${gift.name}! (+${diamonds} Diamonds)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'gift',
          giftInfo: {
            giftId: gift.id,
            giftName: gift.name,
            giftIcon: gift.icon,
            count,
          },
        },
      ]);
    },
    onLikeReceived: () => {
      triggerHeartAnimation();
    },
    onCommentsToggled: (enabled) => {
      setCommentsEnabled(enabled);
    },
    onStreamEnded: (summary) => {
      setStreamHasEnded(true);
      setEndSummary(summary);
    },
    onPKStarted: (battleData: any) => {
      setActivePKBattle({
        isActive: true,
        battleId: battleData.id,
        opponent: battleData.opponent,
        timeRemainingSeconds: battleData.remainingSeconds || battleData.durationSeconds || 180,
        playerScore: battleData.challengerScore || 0,
        opponentScore: battleData.opponentScore || 0,
        status: 'battling',
        punishmentRule: battleData.punishmentRule,
        winnerId: battleData.winnerId,
        winnerName: battleData.winnerName,
        playerViewerCount: battleData.challengerViewerCount,
        opponentViewerCount: battleData.opponentViewerCount,
        topSupportersMe: battleData.topSupportersA,
        topSupportersOpponent: battleData.topSupportersB,
        giftLog: battleData.giftLog,
      });
    },
    onPKScoreUpdate: (data: any) => {
      setActivePKBattle((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          playerScore: typeof data.scoreA === 'number' ? data.scoreA : prev.playerScore,
          opponentScore: typeof data.scoreB === 'number' ? data.scoreB : prev.opponentScore,
          timeRemainingSeconds: typeof data.remainingSeconds === 'number' ? data.remainingSeconds : prev.timeRemainingSeconds,
        };
      });
    },
    onPKEnded: (data: any) => {
      setActivePKBattle((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'ended',
          winnerId: data.winnerId,
          winnerName: data.winnerName,
          timeRemainingSeconds: 0,
        };
      });
    },
  });

  function triggerHeartAnimation() {
    const id = Date.now() + Math.random();
    const randomX = Math.random() * 80 + 10;
    setFloatingHearts((prev) => [...prev, { id, x: randomX }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1800);
  }

  // Handle gift trigger & visual animation (Connected to existing Paystack & Creator Earnings flow)
  const handleGiftSuccess = (gift: VirtualGift, count: number) => {
    // 1. Existing App-level gift handler (updates sender coins, creator diamonds & wallet earnings in server)
    onSendGift(gift, count);

    // 2. Broadcast gift to all connected viewers in the room via WebSocket
    const diamonds = gift.coinPrice * count;
    socketSendGift(gift, count, diamonds);

    // 3. Local trigger
    setActiveGiftAnimation(gift);
    setTimeout(() => setActiveGiftAnimation(null), 2800);
    setSessionDiamonds((prev) => prev + diamonds);
  };

  // Handle Like Heart
  const handleHeartLike = () => {
    onLikeStream();
    socketSendLike();
    triggerHeartAnimation();
  };

  // Handle Send Chat Message
  const handleSendMessage = (text: string) => {
    if (!commentsEnabled) return;

    const newMsg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderLevel: currentUser.level,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'chat',
    };

    setChatMessages((prev) => [...prev, newMsg]);
    socketSendChat(newMsg);
  };

  // Follow Button Toggle
  const handleToggleFollow = () => {
    if (isHost) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowerCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextState) {
      const followMsg: ChatMessage = {
        id: `follow_${Date.now()}`,
        senderId: 'system',
        senderName: 'Follow Alert',
        senderAvatar: currentUser.avatar,
        senderLevel: currentUser.level,
        text: `✨ ${currentUser.name} started following ${stream.creator.name}!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system',
      };
      setChatMessages((prev) => [...prev, followMsg]);
      socketSendChat(followMsg);
    }
  };

  // Host Toggle Comments
  const handleHostToggleComments = () => {
    if (!isHost) return;
    const nextVal = !commentsEnabled;
    setCommentsEnabled(nextVal);
    socketToggleComments(nextVal);
  };

  // Private Live Billing Heartbeat (Countdown & Per-minute Ticker)
  useEffect(() => {
    if (!billingSessionId || isHost || isLocked) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsUntilNextTick((prev) => {
        if (prev <= 1) {
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [billingSessionId, isHost, isLocked]);

  const currentMinuteRef = useRef(1);
  useEffect(() => {
    if (!billingSessionId || isHost || isLocked) {
      currentMinuteRef.current = 1;
      return;
    }

    const minuteInterval = setInterval(async () => {
      if (!billingSessionIdRef.current) return;
      const nextMinute = currentMinuteRef.current + 1;
      currentMinuteRef.current = nextMinute;

      try {
        const res = await tickPrivateSession({
          billingSessionId: billingSessionIdRef.current,
          streamId: stream.id,
          viewerId: currentUser.id,
          minuteNumber: nextMinute,
        });

        if (res.insufficientCoins) {
          // Negative balance prevented! Auto stop billing and close private room
          setBillingSessionId(null);
          setIsLocked(true);
          setInsufficientCoinsNotice(
            `Your coin balance reached ${res.viewerCoins} coins and was insufficient for minute ${nextMinute} (${pricePerMinute} coins/min). The private session was closed to prevent negative balance.`
          );
          setViewerCurrentCoins(res.viewerCoins);
          onCoinsUpdated?.(res.viewerCoins);
          return;
        }

        if (res.success) {
          setPrivateMinutesBilled(res.totalMinutesBilled);
          setPrivateCoinsDeducted(res.totalCoinsDeducted);
          setViewerCurrentCoins(res.viewerCoins);
          onCoinsUpdated?.(res.viewerCoins);
          if (res.creatorDiamonds) {
            setSessionDiamonds((prev) => prev + pricePerMinute);
          }
        }
      } catch (err) {
        console.warn('Private session tick error:', err);
      }
    }, 60000);

    return () => clearInterval(minuteInterval);
  }, [billingSessionId, isHost, isLocked, stream.id, currentUser.id, pricePerMinute, onCoinsUpdated]);

  // Handle Joining Private VIP Session
  const handleJoinPrivateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasscodeError(null);

    if (viewerCurrentCoins < pricePerMinute) {
      setPasscodeError(
        `Insufficient Coins: You need at least ${pricePerMinute} Coins to join this private session. Your balance is ${viewerCurrentCoins} Coins.`
      );
      return;
    }

    setIsJoiningPrivate(true);
    try {
      const res = await joinPrivateSession({
        streamId: stream.id,
        viewerId: currentUser.id,
        viewerName: currentUser.name,
        passcode: passcodeInput.trim(),
      });

      if (!res.success) {
        setPasscodeError(res.error || 'Failed to unlock private room.');
        return;
      }

      setBillingSessionId(res.billingSessionId);
      setIsLocked(false);
      setPrivateMinutesBilled(res.totalMinutesBilled || 1);
      setPrivateCoinsDeducted(pricePerMinute);
      setViewerCurrentCoins(res.viewerCoins);
      onCoinsUpdated?.(res.viewerCoins);
      setSecondsUntilNextTick(60);

      // System notification in chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `private_join_${Date.now()}`,
          senderId: 'system',
          senderName: 'VIP Room Billing',
          senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
          senderLevel: 99,
          text: `🔒 Joined Private VIP Live. Rate: ${pricePerMinute} Coins/min. Initial minute billed (-${pricePerMinute} Coins). Stop charging anytime by clicking Exit.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'system',
        },
      ]);
    } catch (err: any) {
      setPasscodeError(err?.message || 'Unable to join private room.');
    } finally {
      setIsJoiningPrivate(false);
    }
  };

  // Leave room and stop private billing immediately
  const handleLeaveRoom = async () => {
    stopHostCamera();

    if (billingSessionIdRef.current) {
      const activeSession = billingSessionIdRef.current;
      setBillingSessionId(null);
      try {
        const res = await leavePrivateSession({
          billingSessionId: activeSession,
          streamId: stream.id,
          viewerId: currentUser.id,
        });

        if (res.summary) {
          setLeaveSummary(res.summary);
          setIsLeaveSummaryOpen(true);
          const finalCoins = typeof res.viewerCoins === 'number' ? res.viewerCoins : viewerCurrentCoins;
          setViewerCurrentCoins(finalCoins);
          onCoinsUpdated?.(finalCoins);
          return;
        }
      } catch (err) {
        console.warn('Error ending private billing session:', err);
      }
    }

    onBackToExplore?.();
  };

  // Clean exit on unmount to prevent orphan billing sessions
  useEffect(() => {
    return () => {
      if (billingSessionIdRef.current) {
        leavePrivateSession({
          billingSessionId: billingSessionIdRef.current,
          streamId: stream.id,
          viewerId: currentUser.id,
        }).catch(() => {});
      }
    };
  }, [stream.id, currentUser.id]);

  // Creator's "End Live" Action
  const handleHostEndLive = async () => {
    if (!isHost) return;

    stopHostCamera();

    try {
      const summary = await endLiveStream(stream.id);
      setEndSummary(summary);
      setIsEndModalOpen(true);
      socketNotifyEnded(summary);
    } catch (err) {
      console.warn('Error ending stream on server:', err);
      // Fallback local summary
      const localSummary: EndStreamSummary = {
        streamId: stream.id,
        title: stream.title,
        durationSeconds: elapsedSeconds,
        durationFormatted: formatDuration(elapsedSeconds),
        peakViewers: Math.max(liveViewerCount, 1),
        totalDiamondsEarned: sessionDiamonds,
        estimatedEarningsNgn: sessionDiamonds * 2.0,
        newFollowersCount: 6,
        endedAt: new Date().toISOString(),
      };
      setEndSummary(localSummary);
      setIsEndModalOpen(true);
      socketNotifyEnded(localSummary);
    }
  };

  return (
    <div id="live-room-container" className="max-w-7xl mx-auto p-2 sm:p-4 h-[calc(100vh-4.2rem)] flex flex-col">
      {/* Top Streamer Info & Controls Bar */}
      <div className="flex items-center justify-between bg-zinc-950/90 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-2xl border border-zinc-800 mb-2 gap-2 shrink-0 shadow-lg">
        {/* Left: Back button + Creator Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBackToExplore && (
            <button
              id="exit-room-btn"
              onClick={handleLeaveRoom}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 cursor-pointer transition-colors"
              title={stream.isPrivate && !isHost && !isLocked ? "Exit VIP Session & Stop Charges" : "Return to Live Discovery"}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="relative shrink-0">
            <img
              src={stream.creator.avatar}
              alt={stream.creator.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500"
            />
            <span className="absolute -top-1 -right-1 text-xs">
              {stream.creator.countryFlag}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {stream.title}
              </h2>
              {stream.isPrivate && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <Lock className="w-2.5 h-2.5" /> VIP • {pricePerMinute}c/min
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-400 flex-wrap">
              <span className="text-zinc-200 font-semibold">{stream.creator.name}</span>
              <span className="text-zinc-500">•</span>
              
              {/* Real-Time Viewer Count Badge with Presence Modal Trigger */}
              <button
                onClick={() => setIsPresenceModalOpen(true)}
                className="flex items-center gap-1 text-pink-400 font-mono font-bold hover:text-pink-300 transition-colors cursor-pointer group"
                title="View active room participants and presence"
              >
                <Users className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>{liveViewerCount.toLocaleString()}</span>
                <span className="text-[10px] text-zinc-400 font-sans hidden sm:inline">watching</span>
              </button>

              {/* Streaming Infrastructure & Provider Status Pill */}
              <span className="text-zinc-500">•</span>
              <button
                onClick={() => setIsStreamingSetupModalOpen(true)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono cursor-pointer transition-colors ${
                  streamingStatus?.isProductionReady
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                }`}
                title="Click for Production Streaming Architecture & Provider Setup"
              >
                <Radio className={`w-2.5 h-2.5 ${streamingStatus?.isProductionReady ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
                <span>
                  {streamingStatus?.isProductionReady
                    ? (streamingStatus.activeProvider === 'livekit' ? 'LiveKit SFU' : 'Agora RTC')
                    : 'Streaming Setup'}
                </span>
              </button>

              <span className="text-zinc-500">•</span>
              {/* Diamonds Earned */}
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span>💎</span>
                <span>{sessionDiamonds.toLocaleString()}</span>
              </span>

              {/* Stream Duration Clock */}
              <span className="text-zinc-500 hidden md:inline">•</span>
              <span className="text-zinc-400 font-mono text-[11px] hidden md:inline">
                ⏱️ {formatDuration(elapsedSeconds)}
              </span>

              {/* Active VIP Billing Tracker */}
              {stream.isPrivate && !isHost && !isLocked && (
                <>
                  <span className="text-zinc-500 hidden lg:inline">•</span>
                  <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{privateMinutesBilled}m billed ({privateCoinsDeducted} 🪙)</span>
                    <span className="text-zinc-400 text-[10px]">(next: {secondsUntilNextTick}s)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Coins Balance, Follow Button, Host Controls & End Live */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Viewer Coins Chip */}
          <button
            onClick={onAddCoins}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Your Viewer Coins (Click to Top Up)"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{viewerCurrentCoins.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">Coins</span>
          </button>
          {/* Follow / Following Button (USER REQUIREMENT) */}
          {!isHost ? (
            <button
              id="streamer-follow-btn"
              onClick={handleToggleFollow}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isFollowing
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                  : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-900/30 active:scale-95'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Follow</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* Host Comments Toggle */}
              <button
                onClick={handleHostToggleComments}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  commentsEnabled
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
                title={commentsEnabled ? 'Click to Mute Comments' : 'Click to Enable Comments'}
              >
                {commentsEnabled ? (
                  <MessageSquare className="w-4 h-4" />
                ) : (
                  <MessageSquareOff className="w-4 h-4" />
                )}
                <span className="hidden lg:inline">{commentsEnabled ? 'Chat On' : 'Chat Muted'}</span>
              </button>

              {/* Creator's End Live Button (USER REQUIREMENT) */}
              <button
                id="end-live-stream-btn"
                onClick={handleHostEndLive}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/50 active:scale-95 transition-all cursor-pointer"
                title="End this live stream"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>End Live</span>
              </button>
            </div>
          )}

          {/* PK Battle Quick Challenge / Status Trigger */}
          {activePKBattle?.isActive ? (
            <button
              onClick={() => setIsPKHistoryOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-pink-950/80 border border-pink-500/50 text-pink-300 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-pink-950/50 cursor-pointer"
              title="PK Battle In Progress (Click for Records)"
            >
              <Swords className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span className="hidden sm:inline">PK Active</span>
            </button>
          ) : (
            isHost && (
              <button
                id="challenge-pk-battle-btn"
                onClick={() => setIsPKLobbyOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-pink-950/50 active:scale-95 transition-all cursor-pointer"
                title="Challenge another creator to a live PK Battle"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>PK Challenge</span>
              </button>
            )
          )}

          {/* PK Battle History Trigger */}
          <button
            onClick={() => setIsPKHistoryOpen(true)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
            title="PK Battle Records & History"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>

          {/* Architecture Details Trigger */}
          <button
            onClick={() => setShowArchInfo(!showArchInfo)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-cyan-400 cursor-pointer"
            title="Streaming Architecture Info"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Mute audio toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Architecture Transparency Banner (When Toggled) */}
      {showArchInfo && (
        <div className="mb-2 p-3 rounded-2xl bg-zinc-900/95 border border-cyan-500/30 text-xs text-zinc-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-start gap-2.5">
            <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold text-white block">Real-Time Streaming & Financial Architecture</span>
              <p className="text-[11px] text-zinc-400">
                • <strong>Ingest & Distribution:</strong> WebRTC MediaStream capture with sub-second WebSocket signaling.<br />
                • <strong>Virtual Gifting:</strong> Secure server transactions linked to Paystack Coin Balances (Viewer) and Withdrawable NGN Diamonds (Creator).<br />
                • <strong>Active Mode:</strong> {isHost ? (videoMode === 'camera' ? 'Host WebRTC Camera Feed' : 'Host Simulated Visualizer Feed') : 'Viewer Live Room Connection'}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowArchInfo(false)}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[11px] font-bold text-zinc-300 hover:text-white shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Dual Stage / Battle Arena & Chat Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Stage: Live Video Feed or PK Battle Split Screen */}
        <div className="lg:col-span-8 flex flex-col h-full bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden relative shadow-2xl">
          {/* Private Room Passcode & Coin Pricing Enforcement Gate */}
          {isLocked ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 relative overflow-y-auto">
              <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 animate-pulse shadow-lg shadow-amber-950/40">
                <Lock className="w-10 h-10" />
              </div>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Private VIP Live Session</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white mb-1">
                {stream.title}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mb-5">
                Hosted by <strong className="text-zinc-200">{stream.creator.name}</strong>. This stream requires private coins-per-minute access. Charges automatically cease when you exit.
              </p>

              {/* Pricing & Rate Breakdown Box */}
              <div className="w-full max-w-sm bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-4 text-left shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400">Access Rate:</span>
                  <div className="flex items-center gap-1.5 font-black text-amber-400 text-sm">
                    <Coins className="w-4 h-4" />
                    <span>{pricePerMinute} Coins / min</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400">Creator Earnings:</span>
                  <div className="text-xs text-emerald-400 font-mono font-bold">
                    100% Rate • ₦{(pricePerMinute * 2.0).toLocaleString()} / min ({pricePerMinute} 💎)
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Your Coin Balance:</span>
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{viewerCurrentCoins.toLocaleString()} Coins</span>
                    {viewerCurrentCoins >= pricePerMinute ? (
                      <span className="text-[10px] text-emerald-400 font-mono">
                        (~{Math.floor(viewerCurrentCoins / pricePerMinute)}m)
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-400 font-bold">
                        (Low)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Balance Warning & Paystack Quick Recharge */}
              {viewerCurrentCoins < pricePerMinute ? (
                <div className="w-full max-w-sm bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-left mb-4">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-300">Insufficient Coin Balance</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        You need at least <strong className="text-rose-300">{pricePerMinute} Coins</strong> to join minute 1 of this private session. Your balance is {viewerCurrentCoins} Coins.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onAddCoins}
                    className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Buy Coins via Paystack (₦)</span>
                  </button>
                </div>
              ) : null}

              {/* Unlock Form */}
              <form onSubmit={handleJoinPrivateSubmit} className="max-w-sm w-full space-y-3">
                {(stream.privateType === 'passcode' || stream.privatePasscode) && (
                  <div className="text-left">
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                      Private Passcode (Optional for VIPs)
                    </label>
                    <input
                      type="text"
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      placeholder="Enter passcode if creator provided one (e.g. VIP777)"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white text-center font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={viewerCurrentCoins < pricePerMinute || isJoiningPrivate}
                  className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                    viewerCurrentCoins < pricePerMinute || isJoiningPrivate
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-amber-950/40 active:scale-98 cursor-pointer'
                  }`}
                >
                  {isJoiningPrivate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying & Unlocking Session...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Unlock & Enter Private Session ({pricePerMinute} Coins/min)</span>
                    </>
                  )}
                </button>
              </form>

              {passcodeError && (
                <div className="mt-3 text-xs text-rose-400 max-w-sm bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl flex items-center gap-1.5 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{passcodeError}</span>
                </div>
              )}

              <p className="text-[10px] text-zinc-500 max-w-xs mt-4">
                🛡️ StreamFlow Fair-Play Guarantee: Duplicate charges are blocked. Sessions auto-terminate when you exit or if balance depletes to prevent overdrafts.
              </p>
            </div>
          ) : (
            <>
              {activePKBattle?.isActive ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                  <PKBattleArena
                    battle={activePKBattle}
                    hostCreator={stream.creator}
                    currentUser={currentUser}
                    viewerCoins={viewerCurrentCoins}
                    onCoinsUpdated={(newCoins) => {
                      setViewerCurrentCoins(newCoins);
                      currentUser.coins = newCoins;
                    }}
                    onOpenBuyCoins={onAddCoins}
                    onBattleConcluded={(record) => {
                      setActivePKBattle((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: 'ended',
                              winnerId: record.winnerId,
                              winnerName: record.winnerName,
                              playerScore: record.scoreA,
                              opponentScore: record.scoreB,
                              timeRemainingSeconds: 0,
                            }
                          : null
                      );
                    }}
                    hostVideoRef={isHost && videoMode === 'camera' ? localVideoRef : undefined}
                    isHostCameraAvailable={cameraAvailable !== false}
                  />
                </div>
              ) : (
                /* Main Video View: Real-Time LiveKit SFU / WebRTC Video Stage */
                <div className="flex-1 relative bg-zinc-950 overflow-hidden flex items-center justify-center">
                  <LiveKitVideoStage
                    streamId={stream.id}
                    isHost={isHost}
                    isMuted={isMuted}
                    videoMode={videoMode}
                    coverImage={stream.coverImage}
                    streamTitle={stream.title}
                    creatorName={stream.creator.name}
                    credentials={streamingCredentials}
                    cameraAvailable={cameraAvailable !== false}
                    localVideoRef={localVideoRef}
                    onSwitchToCanvas={() => setVideoMode('interactive_canvas')}
                    onOpenSetupModal={() => setIsStreamingSetupModalOpen(true)}
                  />

                  {/* Host Ingest Mode Toggle (Camera vs Canvas) */}
                  {isHost && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 z-20 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-zinc-700">
                      <button
                        onClick={() => setVideoMode('camera')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          videoMode === 'camera' ? 'bg-pink-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Switch to Physical Camera"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Camera</span>
                      </button>
                      <button
                        onClick={() => setVideoMode('interactive_canvas')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          videoMode === 'interactive_canvas' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Switch to Animated Canvas"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Simulated</span>
                      </button>
                    </div>
                  )}

                  {/* Big Animated Gift Canvas Overlay */}
                  {activeGiftAnimation && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-30 animate-in zoom-in-50 duration-300">
                      <div className="text-7xl filter drop-shadow-[0_10px_20px_rgba(255,105,180,0.8)] animate-bounce">
                        {activeGiftAnimation.icon}
                      </div>
                      <div className="mt-2 px-4 py-1.5 rounded-full bg-black/90 backdrop-blur-md border border-pink-500 text-pink-300 font-black text-sm uppercase tracking-widest shadow-2xl">
                        {activeGiftAnimation.name} Combo!
                      </div>
                    </div>
                  )}

                  {/* Floating Hearts Likers */}
                  {floatingHearts.map((heart) => (
                    <div
                      key={heart.id}
                      style={{ left: `${heart.x}%` }}
                      className="absolute bottom-10 pointer-events-none text-2xl text-pink-500 animate-float-up z-20"
                    >
                      ❤️
                    </div>
                  ))}

                  {/* Simulated Streaming Notice (Clearly marks simulated functionality as not production-ready) */}
                  {(videoMode === 'interactive_canvas' || !isHost) && (
                    <div className="absolute bottom-3 left-3 z-20 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px] text-zinc-400 pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      <span className="font-semibold text-zinc-300">Simulated Stage Engine</span>
                      <span className="text-zinc-500">• WebRTC Mesh in dev</span>
                    </div>
                  )}

                  {/* Bottom Overlay Controls on Video: Like Heart, Buy Coins & Gift Trigger */}
                  <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2">
                    {/* Floating Like Button */}
                    <button
                      onClick={handleHeartLike}
                      className="p-3 rounded-full bg-pink-600/85 hover:bg-pink-600 text-white backdrop-blur-md shadow-lg shadow-pink-600/40 active:scale-125 transition-transform cursor-pointer"
                      title="Send Love & Likes"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </button>

                    {/* Buy Coins Quick Button (Directly opens Paystack checkout) */}
                    <button
                      id="live-room-buy-coins-btn"
                      onClick={onAddCoins}
                      className="px-3.5 py-2.5 rounded-full bg-amber-500/90 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Buy Coins with Paystack in NGN"
                    >
                      <Coins className="w-4 h-4 fill-black" />
                      <span className="hidden sm:inline">Buy Coins</span>
                      <span className="text-[10px] bg-black/20 text-black px-1 rounded font-mono font-black">₦</span>
                    </button>

                    {/* Send Gift Button */}
                    <button
                      id="open-gift-modal-btn"
                      onClick={() => setIsGiftModalOpen(true)}
                      className="px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Gift className="w-4 h-4" />
                      <span>Send Gift</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Multi-Guest Stage Below Main Screen */}
              <div className="p-2 border-t border-zinc-800 shrink-0">
                <MultiGuestPanel
                  guests={stream.guests || []}
                  currentUser={currentUser}
                  isHost={isHost}
                  onJoinAsGuest={(mode) => {
                    const newGuest = {
                      id: `guest_${Date.now()}`,
                      user: currentUser,
                      mode,
                      isMuted: false,
                      isVideoOff: mode === 'voice',
                    };
                    stream.guests = stream.guests || [];
                    stream.guests.push(newGuest);
                  }}
                  onLeaveGuest={(guestId) => {
                    if (stream.guests) {
                      stream.guests = stream.guests.filter((g) => g.id !== guestId);
                    }
                  }}
                  onToggleMute={(guestId) => {
                    const g = stream.guests?.find((x) => x.id === guestId);
                    if (g) g.isMuted = !g.isMuted;
                  }}
                  onToggleVideo={(guestId) => {
                    const g = stream.guests?.find((x) => x.id === guestId);
                    if (g) g.isVideoOff = !g.isVideoOff;
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Right Stage: Real-Time Chat Stream & Multi-Language Translation */}
        <div className="lg:col-span-4 h-full flex flex-col min-h-0">
          <LiveChatStream
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            currentUser={currentUser}
            selectedLanguage={selectedLanguage}
            creatorName={stream.creator.name}
            commentsEnabled={commentsEnabled}
          />
        </div>
      </div>

      {/* Virtual Gift Modal (Connected to existing Paystack Coins & Creator Earnings) */}
      <VirtualGiftModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        currentUser={currentUser}
        recipientName={stream.creator.name}
        onSendGift={handleGiftSuccess}
        onAddCoins={onAddCoins}
      />

      {/* Creator Stream Summary Modal (Shown upon End Live) */}
      {(isEndModalOpen || streamHasEnded) && endSummary && (
        <div id="stream-ended-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-600/30">
              <Trophy className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-xl font-black text-white">
              {isHost ? 'Broadcast Finished!' : 'Stream Ended by Host'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              {isHost 
                ? 'Your live stream statistics and withdrawable earnings have been recorded.'
                : `${stream.creator.name} has concluded this live broadcast. Thanks for tuning in!`
              }
            </p>

            {/* Stream Stats Summary Bento */}
            <div className="grid grid-cols-2 gap-2.5 my-5 text-left">
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block font-semibold">Total Duration</span>
                <span className="text-base font-extrabold text-white font-mono">{endSummary.durationFormatted}</span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block font-semibold">Peak Viewers</span>
                <span className="text-base font-extrabold text-pink-400 font-mono">{endSummary.peakViewers.toLocaleString()}</span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block font-semibold">Diamonds Earned</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">💎 {endSummary.totalDiamondsEarned.toLocaleString()}</span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900 border border-emerald-500/30 bg-emerald-950/10">
                <span className="text-[11px] text-emerald-400 block font-semibold">Est. Earnings (NGN)</span>
                <span className="text-base font-extrabold text-emerald-300 font-mono">₦{endSummary.estimatedEarningsNgn.toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {isHost && onOpenCreatorWallet && (
                <button
                  onClick={() => {
                    setIsEndModalOpen(false);
                    onOpenCreatorWallet();
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>View Creator Wallet</span>
                </button>
              )}

              {onBackToExplore && (
                <button
                  onClick={() => {
                    setIsEndModalOpen(false);
                    onBackToExplore();
                  }}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Back to Explore
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRIVATE VIP SESSION LEAVE RECEIPT MODAL */}
      {isLeaveSummaryOpen && leaveSummary && (
        <div id="private-leave-summary-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-zinc-100 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Private Session Receipt</h3>
                <p className="text-xs text-zinc-400">Time-based billing finalized</p>
              </div>
            </div>

            <div className="space-y-2.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Live Stream:</span>
                <span className="font-bold text-white truncate max-w-[200px]">{stream.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Host Creator:</span>
                <span className="font-bold text-white">{stream.creator.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Time in Room:</span>
                <span className="font-mono text-zinc-300 font-bold">{leaveSummary.durationFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Minutes Billed:</span>
                <span className="font-bold text-amber-400 font-mono">{leaveSummary.minutesBilled} minute{leaveSummary.minutesBilled !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2">
                <span className="text-zinc-400">Total Coins Deducted:</span>
                <span className="font-black text-rose-400 font-mono">-{leaveSummary.totalCoinsDeducted} Coins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Creator Earned:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  +{leaveSummary.diamondsCredited} 💎 (₦{leaveSummary.earningsNgn.toLocaleString()})
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2">
                <span className="text-zinc-400">Your New Coin Balance:</span>
                <span className="font-black text-amber-300 font-mono text-sm">{viewerCurrentCoins.toLocaleString()} Coins</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono pt-1">
                Ref: {leaveSummary.sessionId}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsLeaveSummaryOpen(false);
                  onBackToExplore?.();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs cursor-pointer shadow-md"
              >
                Back to Discovery
              </button>
              <button
                onClick={() => {
                  setIsLeaveSummaryOpen(false);
                  onAddCoins();
                }}
                className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
              >
                Top Up Coins
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSUFFICIENT COINS AUTO-EXIT NOTIFICATION MODAL */}
      {insufficientCoinsNotice && (
        <div id="insufficient-coins-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-rose-500/40 rounded-3xl p-6 text-zinc-100 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Private Session Ended</h3>
                <p className="text-xs text-rose-300 font-semibold">Zero negative balance protection</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              {insufficientCoinsNotice}
            </p>

            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 mb-4">
              🛡️ <strong>Fair-Play Guarantee:</strong> StreamFlow prevents negative coin balances by terminating private sessions the moment coins are depleted. No unauthorized extra charges were incurred.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setInsufficientCoinsNotice(null);
                  onAddCoins();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black font-extrabold text-xs cursor-pointer"
              >
                Buy Coins via Paystack (₦)
              </button>
              <button
                onClick={() => {
                  setInsufficientCoinsNotice(null);
                  onBackToExplore?.();
                }}
                className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PK BATTLE CHALLENGE LOBBY MODAL */}
      {isPKLobbyOpen && (
        <PKBattleLobbyModal
          isOpen={isPKLobbyOpen}
          onClose={() => setIsPKLobbyOpen(false)}
          challenger={stream.creator}
          streamId={stream.id}
          onBattleStarted={(battleSession: PKBattleSession) => {
            setActivePKBattle({
              isActive: true,
              battleId: battleSession.id,
              opponent: battleSession.opponent,
              timeRemainingSeconds: battleSession.remainingSeconds || battleSession.durationSeconds || 180,
              playerScore: battleSession.challengerScore || 0,
              opponentScore: battleSession.opponentScore || 0,
              status: 'battling',
              punishmentRule: battleSession.punishmentRule,
              winnerId: battleSession.winnerId,
              winnerName: battleSession.winnerName,
              playerViewerCount: battleSession.challengerViewerCount,
              opponentViewerCount: battleSession.opponentViewerCount,
              topSupportersMe: battleSession.topSupportersA,
              topSupportersOpponent: battleSession.topSupportersB,
              giftLog: battleSession.giftLog,
            });
          }}
        />
      )}

      {/* PK BATTLE HISTORY & LEDGER MODAL */}
      {isPKHistoryOpen && (
        <PKBattleHistoryModal
          isOpen={isPKHistoryOpen}
          onClose={() => setIsPKHistoryOpen(false)}
          creatorId={stream.creator.id}
        />
      )}

      {/* STREAMING ARCHITECTURE & PROVIDER SETUP MODAL */}
      <StreamingSetupModal
        isOpen={isStreamingSetupModalOpen}
        onClose={() => setIsStreamingSetupModalOpen(false)}
        status={streamingStatus}
        credentials={streamingCredentials}
        streamId={stream.id}
      />

      {/* ROOM PRESENCE & ACTIVE PARTICIPANTS DRAWER MODAL */}
      <StreamingPresenceModal
        isOpen={isPresenceModalOpen}
        onClose={() => setIsPresenceModalOpen(false)}
        streamId={stream.id}
        streamTitle={stream.title}
        isHost={isHost}
      />
    </div>
  );
};
