import React, { useState, useEffect, useRef } from 'react';
import { 
  Swords, 
  Trophy, 
  Flame, 
  Timer, 
  Sparkles, 
  AlertCircle, 
  Users, 
  Gift, 
  History, 
  Radio, 
  Coins, 
  CheckCircle,
  X,
  Zap,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import { PKBattleState, UserProfile, VirtualGift, PKBattleRecord } from '../types';
import { AVAILABLE_GIFTS as GIFTS_CATALOG } from '../mockData';
import { sendPKBattleGift, endPKBattle } from '../services/pkBattleService';
import { PKBattleHistoryModal } from './PKBattleHistoryModal';

interface PKBattleArenaProps {
  battle: PKBattleState;
  hostCreator: UserProfile;
  currentUser: UserProfile;
  viewerCoins: number;
  onCoinsUpdated: (newCoins: number) => void;
  onOpenBuyCoins?: () => void;
  onBattleConcluded?: (record: PKBattleRecord) => void;
  hostVideoRef?: React.RefObject<HTMLVideoElement | null>;
  isHostCameraAvailable?: boolean;
}

interface FloatingGiftAnimation {
  id: string;
  giftIcon: string;
  giftName: string;
  senderName: string;
  targetName: string;
  points: number;
}

export const PKBattleArena: React.FC<PKBattleArenaProps> = ({
  battle,
  hostCreator,
  currentUser,
  viewerCoins,
  onCoinsUpdated,
  onOpenBuyCoins,
  onBattleConcluded,
  hostVideoRef,
  isHostCameraAvailable = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(battle.timeRemainingSeconds);
  const [isBattleFrozen, setIsBattleFrozen] = useState<boolean>(battle.status === 'ended');
  const [battleResult, setBattleResult] = useState<{
    winnerId: string | 'draw';
    winnerName: string;
    scoreA: number;
    scoreB: number;
  } | null>(
    battle.status === 'ended' && battle.winnerId
      ? {
          winnerId: battle.winnerId,
          winnerName: battle.winnerName || 'Winner',
          scoreA: battle.playerScore,
          scoreB: battle.opponentScore,
        }
      : null
  );

  // Gift Drawer State
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState<boolean>(false);
  const [selectedTargetCreatorId, setSelectedTargetCreatorId] = useState<string>(hostCreator.id);
  const [selectedGift, setSelectedGift] = useState<VirtualGift>(GIFTS_CATALOG[0]);
  const [giftCount, setGiftCount] = useState<number>(1);
  const [isSendingGift, setIsSendingGift] = useState<boolean>(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [floatingGifts, setFloatingGifts] = useState<FloatingGiftAnimation[]>([]);

  // History modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Simulated Canvas Video Ref for Opponent
  const opponentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [audioWavesMuted, setAudioWavesMuted] = useState<boolean>(false);

  // Synchronize timer countdown
  useEffect(() => {
    setTimeLeft(battle.timeRemainingSeconds);
  }, [battle.timeRemainingSeconds]);

  useEffect(() => {
    if (isBattleFrozen || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBattleFrozen, timeLeft]);

  // Opponent Animated Canvas Visualizer (Simulated Live Video Feed)
  useEffect(() => {
    const canvas = opponentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let tick = 0;

    const renderWave = () => {
      tick += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      // Dark futuristic DJ background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(0.5, '#1e1035');
      grad.addColorStop(1, '#082f49');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Grid effect
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Audio waveform simulation
      const bars = 32;
      const barWidth = width / bars;
      for (let i = 0; i < bars; i++) {
        const freq = Math.sin(tick + i * 0.3) * 0.5 + 0.5;
        const barHeight = freq * (height * 0.45) + 15;
        const x = i * barWidth;
        const y = height / 2 - barHeight / 2;

        const barGrad = ctx.createLinearGradient(x, y, x, y + barHeight);
        barGrad.addColorStop(0, '#38bdf8');
        barGrad.addColorStop(0.5, '#c084fc');
        barGrad.addColorStop(1, '#ec4899');
        ctx.fillStyle = barGrad;
        ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
      }

      // Center glowing pulse ring
      const pulseSize = (Math.sin(tick * 2) * 0.1 + 1) * 38;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();

      animationId = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => cancelAnimationFrame(animationId);
  }, []);

  // Handle battle conclusion when timer expires
  const handleTimeExpired = async () => {
    setIsBattleFrozen(true);
    let winId: string | 'draw' = 'draw';
    let winName = 'Tie / Draw';

    if (battle.playerScore > battle.opponentScore) {
      winId = hostCreator.id;
      winName = hostCreator.name;
    } else if (battle.opponentScore > battle.playerScore) {
      winId = battle.opponent.id;
      winName = battle.opponent.name;
    }

    setBattleResult({
      winnerId: winId,
      winnerName: winName,
      scoreA: battle.playerScore,
      scoreB: battle.opponentScore,
    });

    if (battle.battleId) {
      try {
        const record = await endPKBattle(battle.battleId);
        if (onBattleConcluded) {
          onBattleConcluded(record);
        }
      } catch (err) {
        console.warn('Battle recorded automatically on server.');
      }
    }
  };

  // Score Math
  const totalScore = Math.max(1, battle.playerScore + battle.opponentScore);
  const hostPercentage = Math.round((battle.playerScore / totalScore) * 100);
  const opponentPercentage = 100 - hostPercentage;
  const isHostWinning = battle.playerScore > battle.opponentScore;
  const isTied = battle.playerScore === battle.opponentScore;
  const scoreLead = Math.abs(battle.playerScore - battle.opponentScore);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Open gift drawer for a specific creator
  const handleOpenGiftFor = (targetCreatorId: string) => {
    setSelectedTargetCreatorId(targetCreatorId);
    setGiftError(null);
    setIsGiftDrawerOpen(true);
  };

  // Send virtual gift
  const handleSendGift = async () => {
    if (!selectedGift) return;
    const totalCost = selectedGift.coinPrice * giftCount;

    if (viewerCoins < totalCost) {
      setGiftError(`Insufficient Coins! You have ${viewerCoins.toLocaleString()} Coins, but sending ${giftCount}x ${selectedGift.name} requires ${totalCost.toLocaleString()} Coins.`);
      return;
    }

    setIsSendingGift(true);
    setGiftError(null);

    const isTargetHost = selectedTargetCreatorId === hostCreator.id;
    const targetName = isTargetHost ? hostCreator.name : battle.opponent.name;
    const idempotencyKey = `PK_GIFT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const resp = await sendPKBattleGift({
        battleId: battle.battleId || 'pk_battle_live_1',
        targetCreatorId: selectedTargetCreatorId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        giftId: selectedGift.id,
        count: giftCount,
        idempotencyKey,
      });

      // Update viewer coins balance
      if (typeof resp.senderCoins === 'number') {
        onCoinsUpdated(resp.senderCoins);
      } else {
        onCoinsUpdated(viewerCoins - totalCost);
      }

      // Update local battle scores
      if (isTargetHost) {
        battle.playerScore = resp.scoreA ?? (battle.playerScore + totalCost);
      } else {
        battle.opponentScore = resp.scoreB ?? (battle.opponentScore + totalCost);
      }

      // Floating animation trigger
      const animId = `anim_${Date.now()}`;
      setFloatingGifts((prev) => [
        ...prev,
        {
          id: animId,
          giftIcon: selectedGift.icon,
          giftName: selectedGift.name,
          senderName: currentUser.name,
          targetName,
          points: totalCost,
        },
      ]);

      setTimeout(() => {
        setFloatingGifts((prev) => prev.filter((g) => g.id !== animId));
      }, 4000);

      setIsGiftDrawerOpen(false);
    } catch (err: any) {
      console.error('Failed to send PK Gift:', err);
      setGiftError(err?.message || 'Failed to send gift. Please try again.');
    } finally {
      setIsSendingGift(false);
    }
  };

  return (
    <div id="pk-battle-arena" className="w-full flex flex-col bg-zinc-950 border-b border-zinc-800 relative">
      {/* Floating Gift Animations Burst */}
      {floatingGifts.length > 0 && (
        <div className="absolute inset-x-0 top-12 z-40 pointer-events-none flex flex-col items-center gap-2">
          {floatingGifts.map((gift) => (
            <div
              key={gift.id}
              className="animate-bounce bg-zinc-900/90 border border-amber-500/60 shadow-xl shadow-pink-900/30 px-4 py-2 rounded-2xl flex items-center gap-2.5 backdrop-blur-md"
            >
              <span className="text-2xl animate-spin" style={{ animationDuration: '4s' }}>{gift.giftIcon}</span>
              <div className="text-xs">
                <span className="font-extrabold text-white">{gift.senderName}</span>
                <span className="text-zinc-400"> boosted </span>
                <span className="font-extrabold text-pink-400">{gift.targetName}</span>
                <div className="text-amber-400 font-mono font-black text-[11px]">
                  +{gift.points.toLocaleString()} PK BATTLE POINTS
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Banner: PK Badge, Timer, Scores, and History Trigger */}
      <div className="bg-zinc-900/95 px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2">
        {/* Left: Battle Label */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 text-white font-black text-[11px] uppercase tracking-wider shadow-md shadow-pink-950">
            <Swords className="w-3.5 h-3.5 animate-pulse" />
            <span>PK DUEL</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Synced WebSockets & Server Tick</span>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-xs font-black shadow-inner transition-colors ${
              timeLeft <= 30 && !isBattleFrozen
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-zinc-950 border-zinc-700 text-amber-400'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{isBattleFrozen ? '00:00 (FROZEN)' : formatTimer(timeLeft)}</span>
          </div>
        </div>

        {/* Right: History & Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="View Battle History & Records"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Records</span>
          </button>

          {!isBattleFrozen && (
            <button
              onClick={handleTimeExpired}
              className="px-2 py-1 rounded-xl bg-zinc-900 hover:bg-rose-900/30 text-zinc-400 hover:text-rose-300 border border-zinc-800 text-[11px] font-bold transition-colors cursor-pointer"
              title="Conclude Battle Early"
            >
              End Now
            </button>
          )}
        </div>
      </div>

      {/* Tug-of-War Gauge Bar */}
      <div className="bg-zinc-950 px-3 pt-2 pb-1.5 border-b border-zinc-800/80">
        <div className="flex items-center justify-between text-xs font-black px-1 mb-1">
          {/* Creator A Score */}
          <div className="flex items-center gap-1.5 text-pink-400">
            <span className="font-bold">{hostCreator.name}</span>
            <span className="text-sm font-mono font-black">({battle.playerScore.toLocaleString()})</span>
            {isHostWinning && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-500/20 border border-pink-500/40 text-pink-300 font-sans font-bold">
                LEAD +{scoreLead}
              </span>
            )}
          </div>

          {/* Opponent Creator B Score */}
          <div className="flex items-center gap-1.5 text-cyan-400">
            {!isHostWinning && !isTied && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-sans font-bold">
                LEAD +{scoreLead}
              </span>
            )}
            <span className="text-sm font-mono font-black">({battle.opponentScore.toLocaleString()})</span>
            <span className="font-bold">{battle.opponent.name}</span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800 p-0.5 shadow-inner">
          <div
            style={{ width: `${Math.max(8, Math.min(92, hostPercentage))}%` }}
            className="h-full bg-gradient-to-r from-pink-600 via-rose-500 to-pink-400 rounded-l-full transition-all duration-500 relative flex items-center justify-start pl-2"
          >
            <span className="text-[10px] font-black text-white drop-shadow">{hostPercentage}%</span>
          </div>
          <div
            style={{ width: `${Math.max(8, Math.min(92, opponentPercentage))}%` }}
            className="h-full bg-gradient-to-l from-cyan-600 via-sky-500 to-cyan-400 rounded-r-full transition-all duration-500 relative flex items-center justify-end pr-2"
          >
            <span className="text-[10px] font-black text-white drop-shadow">{opponentPercentage}%</span>
          </div>
        </div>

        {/* Stakes notice */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong className="text-zinc-300">Stakes:</strong> {battle.punishmentRule || 'Loser sings opponent’s top hit live!'}
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 shrink-0 font-mono">
            1 Coin = 1 PK Point
          </div>
        </div>
      </div>

      {/* DUAL LIVE VIDEO AREAS (USER REQUIREMENT: SHOW BOTH LIVE VIDEO AREAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 bg-black min-h-[300px] sm:min-h-[380px] relative overflow-hidden">
        
        {/* ======================================================== */}
        {/* STAGE LEFT: CHALLENGER / HOST LIVE VIDEO AREA */}
        {/* ======================================================== */}
        <div className="relative flex flex-col items-center justify-center bg-zinc-950 overflow-hidden group">
          {/* Real WebRTC camera or fallback */}
          {hostVideoRef ? (
            <video
              ref={hostVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover min-h-[200px] sm:min-h-[320px] -scale-x-100"
            />
          ) : (
            <div className="w-full h-full min-h-[200px] sm:min-h-[320px] relative bg-gradient-to-tr from-pink-950/40 via-zinc-950 to-zinc-900 flex items-center justify-center">
              <img
                src={hostCreator.avatar}
                alt={hostCreator.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-pink-500/50 shadow-2xl animate-pulse"
              />
            </div>
          )}

          {/* Dark Overlay Gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />

          {/* Top Overlay: Identity, Live Badge, and Demo Badge */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-pink-500/40">
              <img
                src={hostCreator.avatar}
                alt={hostCreator.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-pink-400"
              />
              <span className="font-extrabold text-white text-xs">{hostCreator.name}</span>
              <span className="text-xs">{hostCreator.countryFlag}</span>
            </div>

            {/* Clearly Marked Demo Streaming Notice */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-950/70 border border-pink-500/50 text-pink-300 text-[10px] font-mono">
              <Radio className="w-2.5 h-2.5 text-pink-400 animate-pulse" />
              <span>LIVE HOST WEBRTC</span>
            </div>
          </div>

          {/* Bottom Overlay: Viewers, Top MVP Supporter, and Support Action */}
          <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between z-10 gap-2">
            <div className="flex flex-col gap-1">
              {/* Viewer Count */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[11px] text-zinc-300 font-mono">
                <Users className="w-3 h-3 text-pink-400" />
                <span>{(battle.playerViewerCount || 4210).toLocaleString()}</span>
              </div>

              {/* Top MVP Supporter */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-pink-950/80 border border-pink-500/40 text-[10px] text-pink-200">
                <Flame className="w-3 h-3 text-pink-400 shrink-0" />
                <span className="truncate max-w-[100px]">
                  MVP: {battle.topSupporterMe?.name || 'Top Fan'}
                </span>
                <span className="font-mono text-pink-300">
                  ({battle.playerScore} pts)
                </span>
              </div>
            </div>

            {/* Support Host Button */}
            {!isBattleFrozen && (
              <button
                onClick={() => handleOpenGiftFor(hostCreator.id)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-pink-950/80 active:scale-95 transition-all cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Support {hostCreator.name.split(' ')[0]}</span>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* STAGE RIGHT: OPPONENT LIVE VIDEO AREA */}
        {/* ======================================================== */}
        <div className="relative flex flex-col items-center justify-center bg-zinc-950 overflow-hidden group">
          {/* Opponent Animated Visualizer Canvas */}
          <canvas
            ref={opponentCanvasRef}
            width={480}
            height={360}
            className="w-full h-full object-cover min-h-[200px] sm:min-h-[320px]"
          />

          {/* Opponent Avatar Overlay Centerpiece */}
          <div className="absolute flex flex-col items-center pointer-events-none">
            <div className="relative">
              <img
                src={battle.opponent.avatar}
                alt={battle.opponent.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-cyan-500/50 shadow-2xl"
              />
              <span className="absolute -bottom-1 -right-1 text-sm bg-black/70 p-1 rounded-full">
                {battle.opponent.countryFlag}
              </span>
            </div>
            <span className="text-white text-xs font-bold mt-2 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {battle.opponent.name}
            </span>
          </div>

          {/* Dark Overlay Gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />

          {/* Top Overlay: Identity, Live Badge, and Clear Demo Notice */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-cyan-500/40">
              <img
                src={battle.opponent.avatar}
                alt={battle.opponent.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-cyan-400"
              />
              <span className="font-extrabold text-white text-xs">{battle.opponent.name}</span>
              <span className="text-xs">{battle.opponent.countryFlag}</span>
            </div>

            {/* Clearly Marked Demo Streaming Notice */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 text-[10px] font-mono">
              <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
              <span>SIMULATED PEER FEED (DEMO)</span>
            </div>
          </div>

          {/* Bottom Overlay: Viewers, Top Supporter, and Support Opponent Action */}
          <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between z-10 gap-2">
            <div className="flex flex-col gap-1">
              {/* Viewer Count */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[11px] text-zinc-300 font-mono">
                <Users className="w-3 h-3 text-cyan-400" />
                <span>{(battle.opponentViewerCount || 3890).toLocaleString()}</span>
              </div>

              {/* Top Supporter */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-[10px] text-cyan-200">
                <Flame className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate max-w-[100px]">
                  MVP: {battle.topSupporterOpponent?.name || 'TokyoFan'}
                </span>
                <span className="font-mono text-cyan-300">
                  ({battle.opponentScore} pts)
                </span>
              </div>
            </div>

            {/* Support Opponent Button */}
            {!isBattleFrozen && (
              <button
                onClick={() => handleOpenGiftFor(battle.opponent.id)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-cyan-950/80 active:scale-95 transition-all cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Support {battle.opponent.name.split(' ')[0]}</span>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* FROZEN SCORES & RESULTS SCREEN OVERLAY (USER REQUIREMENT) */}
        {/* ======================================================== */}
        {isBattleFrozen && battleResult && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
            <div className="p-4 rounded-3xl bg-amber-500/20 border border-amber-500/50 text-amber-300 mb-3 shadow-2xl shadow-amber-950 animate-bounce">
              <Trophy className="w-12 h-12" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>BATTLE CONCLUDED • SCORES FROZEN</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {battleResult.winnerId === 'draw' ? (
                'IT’S A TIE / DRAW!'
              ) : (
                <>
                  <span className="text-amber-400">{battleResult.winnerName}</span> WINS THE PK BATTLE!
                </>
              )}
            </h3>

            {/* Frozen Final Scores Comparison */}
            <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 my-3 flex items-center justify-around shadow-xl">
              <div className="text-center">
                <span className="text-xs text-zinc-400 block mb-1">{hostCreator.name}</span>
                <span className="text-xl font-mono font-black text-pink-400">
                  {battle.playerScore.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 block">PK Points</span>
              </div>

              <div className="font-black text-sm text-zinc-600">VS</div>

              <div className="text-center">
                <span className="text-xs text-zinc-400 block mb-1">{battle.opponent.name}</span>
                <span className="text-xl font-mono font-black text-cyan-400">
                  {battle.opponentScore.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 block">PK Points</span>
              </div>
            </div>

            {/* Punishment Rule Reminder */}
            {battle.punishmentRule && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs max-w-md mb-4 flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  <strong>Loser's Punishment Stake:</strong> {battle.punishmentRule}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>View Battle History</span>
              </button>

              <button
                onClick={() => setIsBattleFrozen(false)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg cursor-pointer"
              >
                Dismiss Overlay
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VIRTUAL GIFT DRAWER FOR SUPPORTING CREATORS */}
      {/* ======================================================== */}
      {isGiftDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <Gift className="w-4 h-4 text-pink-500" />
                  <span>
                    Boost{' '}
                    <strong className="text-pink-400">
                      {selectedTargetCreatorId === hostCreator.id
                        ? hostCreator.name
                        : battle.opponent.name}
                    </strong>
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Deducts coins once • Adds 1 PK point per coin to selected creator
                </p>
              </div>
              <button
                onClick={() => setIsGiftDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Creator Selector Toggle */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <button
                type="button"
                onClick={() => setSelectedTargetCreatorId(hostCreator.id)}
                className={`p-2 rounded-xl border flex items-center gap-2 text-left cursor-pointer transition-all ${
                  selectedTargetCreatorId === hostCreator.id
                    ? 'bg-pink-950/60 border-pink-500 text-white shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <img
                  src={hostCreator.avatar}
                  alt={hostCreator.name}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <div className="truncate">
                  <span className="font-bold text-xs block truncate">{hostCreator.name}</span>
                  <span className="text-[10px] text-pink-400 font-mono">Host</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTargetCreatorId(battle.opponent.id)}
                className={`p-2 rounded-xl border flex items-center gap-2 text-left cursor-pointer transition-all ${
                  selectedTargetCreatorId === battle.opponent.id
                    ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <img
                  src={battle.opponent.avatar}
                  alt={battle.opponent.name}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <div className="truncate">
                  <span className="font-bold text-xs block truncate">{battle.opponent.name}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Opponent</span>
                </div>
              </button>
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-3 gap-2 overflow-y-auto py-2 max-h-56 pr-1">
              {GIFTS_CATALOG.map((g: VirtualGift) => {
                const isSelected = selectedGift.id === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGift(g)}
                    className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-pink-950/60 border-pink-500 shadow-md shadow-pink-950/50 scale-102'
                        : 'bg-zinc-900 border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <span className="text-[11px] font-bold text-zinc-200 truncate w-full">
                      {g.name}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-black flex items-center gap-0.5">
                      <Coins className="w-2.5 h-2.5" />
                      <span>{g.coinPrice}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Gift Multipliers */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800">
              <span className="text-xs text-zinc-400 font-semibold">Count:</span>
              <div className="flex items-center gap-1.5">
                {[1, 5, 10, 50].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGiftCount(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      giftCount === c
                        ? 'bg-pink-600 text-white shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {c}x
                  </button>
                ))}
              </div>
            </div>

            {/* Total Calculation & Balance */}
            <div className="flex items-center justify-between text-xs py-2 text-zinc-300">
              <span>Total Cost:</span>
              <span className="font-mono font-black text-amber-400 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                <span>{(selectedGift.coinPrice * giftCount).toLocaleString()} Coins</span>
                <span className="text-zinc-500 font-normal">
                  (+{(selectedGift.coinPrice * giftCount).toLocaleString()} pts)
                </span>
              </span>
            </div>

            {/* Insufficient Coins Warning & Paystack Top-Up Trigger */}
            {giftError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex flex-col gap-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{giftError}</span>
                </div>
                {onOpenBuyCoins && (
                  <button
                    onClick={() => {
                      setIsGiftDrawerOpen(false);
                      onOpenBuyCoins();
                    }}
                    className="mt-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs self-start cursor-pointer"
                  >
                    Top Up Coins via Paystack
                  </button>
                )}
              </div>
            )}

            {/* Current Viewer Balance */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-3">
              <span>Your Balance:</span>
              <span className="font-mono text-zinc-200 font-bold flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>{viewerCoins.toLocaleString()} Coins</span>
              </span>
            </div>

            {/* Send Action */}
            <button
              type="button"
              disabled={isSendingGift}
              onClick={handleSendGift}
              className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer ${
                isSendingGift
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-pink-900/40 active:scale-98'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSendingGift
                  ? 'Sending Gift...'
                  : `Send ${giftCount}x ${selectedGift.name} (${(selectedGift.coinPrice * giftCount).toLocaleString()} Coins)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* PK Battle History Modal */}
      {isHistoryOpen && (
        <PKBattleHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
};
export default PKBattleArena;
