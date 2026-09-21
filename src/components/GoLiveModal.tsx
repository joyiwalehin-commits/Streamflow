import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Lock, 
  Key, 
  Coins, 
  Camera, 
  Mic, 
  Tag, 
  Swords, 
  X, 
  Sparkles,
  Layers,
  MessageSquare,
  MessageSquareOff,
  Video,
  MonitorPlay,
  Info,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, StreamSession } from '../types';
import { OPPONENT_CREATORS } from '../mockData';

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onStartLive: (newStream: Partial<StreamSession>) => void;
}

const TITLE_SUGGESTIONS = [
  '🎧 Live DJ Synth Showcase & PK Battle',
  '☕ Late Night Chat, Chill & AMA',
  '🎮 High-Ranked Battle Royale Grind',
  '🥐 Parisian Culinary Secrets Live',
  '⚡ K-Pop Freestyle Dance Marathon',
];

export const GoLiveModal: React.FC<GoLiveModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStartLive,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Gaming' | 'Music & Dance' | 'ChitChat' | 'Cooking' | 'Fitness' | 'Cosplay'>('Music & Dance');
  const [commentsEnabled, setCommentsEnabled] = useState<boolean>(true);
  const [videoMode, setVideoMode] = useState<'camera' | 'interactive_canvas'>('camera');
  const [isPrivate, setIsPrivate] = useState(false);
  const [privateAccessMode, setPrivateAccessMode] = useState<'pay_per_minute' | 'invite_only' | 'passcode'>('pay_per_minute');
  const [pricePerMinute, setPricePerMinute] = useState<number>(20);
  const [allowedUsersInput, setAllowedUsersInput] = useState<string>('@Alex Rivera, @Lucas_Rio, @TokyoDreamer');
  const [allowAnyoneWithCoins, setAllowAnyoneWithCoins] = useState<boolean>(true);
  const [passcode, setPasscode] = useState('');
  const [enablePKBattle, setEnablePKBattle] = useState(true);
  const [tagsInput, setTagsInput] = useState('Global,LivePK,Music');
  
  // Camera state & preview
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Attempt to acquire camera preview when modal opens and camera mode is active
  useEffect(() => {
    let active = true;

    async function initCameraPreview() {
      if (!isOpen || videoMode !== 'camera') {
        stopCamera();
        return;
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices API not supported in this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;
        setHasCameraPermission(true);
        setCameraError(null);

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn('Camera preview notice:', err?.message || err);
        if (active) {
          setHasCameraPermission(false);
          setCameraError(
            err?.name === 'NotAllowedError'
              ? 'Camera permission was denied. You can proceed with Interactive Simulated Video.'
              : 'Hardware camera is busy or unavailable. Interactive Simulated Video is ready.'
          );
        }
      }
    }

    if (isOpen && videoMode === 'camera') {
      initCameraPreview();
    } else {
      stopCamera();
    }

    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, videoMode]);

  function stopCamera() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Stop modal camera preview so live room can take over
    stopCamera();

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    const allowedList = allowAnyoneWithCoins 
      ? ['*'] 
      : allowedUsersInput.split(',').map((t) => t.trim()).filter(Boolean);

    const newStream: Partial<StreamSession> = {
      title: title.trim(),
      creator: currentUser,
      category,
      commentsEnabled,
      videoMode,
      viewerCount: 1,
      likesCount: 0,
      isLive: true,
      isPrivate,
      privateType: isPrivate ? privateAccessMode : undefined,
      pricePerMinute: isPrivate ? pricePerMinute : undefined,
      entryCoinFee: isPrivate ? pricePerMinute : 0,
      allowedUsernames: isPrivate ? allowedList : undefined,
      privatePasscode: isPrivate && (privateAccessMode === 'passcode' || passcode.trim()) ? (passcode.trim() || 'VIP888') : undefined,
      coverImage: currentUser.avatar,
      tags: tags.length > 0 ? tags : ['StreamFlow', 'Live'],
      totalDiamondsEarned: 0,
      durationSeconds: 0,
      guests: [],
      pkBattle: enablePKBattle
        ? {
            isActive: true,
            opponent: OPPONENT_CREATORS[0],
            timeRemainingSeconds: 180,
            playerScore: 0,
            opponentScore: 0,
            status: 'battling',
            punishmentRule: 'Loser does funny accents for 3 minutes!',
          }
        : undefined,
    };

    onStartLive(newStream);
    onClose();
  };

  return (
    <div id="go-live-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-5 text-zinc-100 relative overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Go Live on StreamFlow</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Host Studio
                </span>
              </div>
              <p className="text-xs text-zinc-400">Broadcast with real-time comments, gifts & PK matchmaking</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }} 
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Stream Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-300">Live Stream Title</label>
              <span className="text-[11px] text-zinc-500">{title.length}/70</span>
            </div>
            <input
              type="text"
              required
              maxLength={70}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🎧 Live DJ Synth Showcase & PK Battle"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
            />
            {/* Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto mt-2 pb-1 scrollbar-none">
              {TITLE_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTitle(sug)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-pink-300 whitespace-nowrap cursor-pointer transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="Music & Dance">Music & Dance</option>
                <option value="Gaming">Gaming & Esports</option>
                <option value="ChitChat">ChitChat & Just Talking</option>
                <option value="Cooking">Cooking & Gourmet</option>
                <option value="Fitness">Fitness & Wellness</option>
                <option value="Cosplay">Cosplay & Anime</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Stream Tags (comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Global, LivePK, Music"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Video Input Mode & Live Camera Preview */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-200 block">Video Ingest Source</span>
                <span className="text-[11px] text-zinc-400">Choose physical device or interactive canvas</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setVideoMode('camera')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    videoMode === 'camera'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera (WebRTC)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMode('interactive_canvas')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    videoMode === 'interactive_canvas'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Simulated Stream</span>
                </button>
              </div>
            </div>

            {/* Video Preview Box */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
              {videoMode === 'camera' ? (
                hasCameraPermission ? (
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                ) : (
                  <div className="p-4 text-center">
                    <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-300 font-semibold">Camera Access</p>
                    <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                      {cameraError || 'Requesting camera stream via WebRTC...'}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto mb-2">
                    <MonitorPlay className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-zinc-200 block">Interactive Simulated Stream</span>
                  <span className="text-[11px] text-zinc-400">High-definition animated visualizer & audio spectrum</span>
                </div>
              )}

              {/* Preview Overlay Badges */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Preview Ready
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-zinc-300 text-[10px] font-bold border border-zinc-700">
                  {videoMode === 'camera' ? 'WebRTC Ingest' : 'Canvas Render'}
                </span>
              </div>
            </div>
          </div>

          {/* Comments & Live Chat Toggle (USER REQUIREMENT) */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                commentsEnabled 
                  ? 'bg-pink-500/20 border-pink-500/30 text-pink-400' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}>
                {commentsEnabled ? (
                  <MessageSquare className="w-4 h-4" />
                ) : (
                  <MessageSquareOff className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-200 block">
                  {commentsEnabled ? 'Comments & Live Chat Enabled' : 'Comments & Live Chat Disabled'}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {commentsEnabled 
                    ? 'Viewers can send real-time chat messages and emoji reactions'
                    : 'Chat stream will be muted; viewers can only watch and send gifts'
                  }
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="toggle-comments-checkbox"
                checked={commentsEnabled}
                onChange={(e) => setCommentsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          {/* PK Battle Matchmaking Option */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-200 block">Auto-Pair for Live PK Battle</span>
                <span className="text-[11px] text-zinc-400">Match against international creators for 3-minute gift duel</span>
              </div>
            </div>
            <input
              type="checkbox"
              id="pk-battle-checkbox"
              checked={enablePKBattle}
              onChange={(e) => setEnablePKBattle(e.target.checked)}
              className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
            />
          </div>

          {/* Private Live Session Options */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${
                  isPrivate ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}>
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">Private Live Session</span>
                    {isPrivate && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        VIP Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400">Charge per-minute coin access & choose who can enter</span>
                </div>
              </div>
              <input
                type="checkbox"
                id="private-stream-checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {isPrivate && (
              <div className="pt-3 border-t border-zinc-800/80 space-y-3.5 animate-in fade-in duration-150">
                {/* Access Mode */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1.5">Private Room Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrivateAccessMode('pay_per_minute')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        privateAccessMode === 'pay_per_minute'
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5 mx-auto mb-1" />
                      <span className="text-[11px] block">Pay / Minute</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrivateAccessMode('invite_only');
                        setAllowAnyoneWithCoins(false);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        privateAccessMode === 'invite_only'
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 mx-auto mb-1" />
                      <span className="text-[11px] block">Guest List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivateAccessMode('passcode')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        privateAccessMode === 'passcode'
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5 mx-auto mb-1" />
                      <span className="text-[11px] block">Passcode</span>
                    </button>
                  </div>
                </div>

                {/* Pricing in Coins Per Minute */}
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      Access Price (Coins per minute)
                    </label>
                    <span className="text-xs font-black text-amber-400 font-mono">
                      {pricePerMinute} Coins / min
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {[10, 20, 35, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPricePerMinute(preset)}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          pricePerMinute === preset
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Custom Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="1000"
                      step="5"
                      value={pricePerMinute}
                      onChange={(e) => setPricePerMinute(Math.max(5, Number(e.target.value)))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono"
                      placeholder="Custom Coins/min"
                    />
                  </div>

                  {/* Creator Rate Breakdown */}
                  <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Configured Creator Rate:</span>
                    <span className="text-emerald-400 font-bold">
                      {pricePerMinute} Diamonds = ₦{(pricePerMinute * 2.0).toFixed(2)}/min per viewer
                    </span>
                  </div>
                </div>

                {/* Choose Who Can Enter */}
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-200">
                      Who Can Enter
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAllowAnyoneWithCoins(true)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                          allowAnyoneWithCoins
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        Anyone with coins
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowAnyoneWithCoins(false)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                          !allowAnyoneWithCoins
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        Guest List Only
                      </button>
                    </div>
                  </div>

                  {!allowAnyoneWithCoins ? (
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-1">
                        Enter allowed usernames or user IDs (comma separated):
                      </span>
                      <input
                        type="text"
                        value={allowedUsersInput}
                        onChange={(e) => setAllowedUsersInput(e.target.value)}
                        placeholder="@Alex Rivera, @Lucas_Rio, @TokyoDreamer"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
                      />
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-500 italic">
                      Any viewer with at least {pricePerMinute} Coins can enter and will be billed per minute.
                    </p>
                  )}
                </div>

                {/* Passcode if passcode mode or optional */}
                {(privateAccessMode === 'passcode' || passcode) && (
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">VIP Passcode</label>
                    <input
                      type="text"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="e.g. VIP888"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Architecture & Simulation Transparency Notice */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 space-y-2 text-[11px] text-zinc-400">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-zinc-200 font-bold block">Streaming & Paystack Architecture:</span>
                <span>Real-time WebSocket event layer with sub-second fanout. Paystack Buy Coins and Creator Earnings remain unmodified.</span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
              <span className="text-amber-400 font-medium">🧪 Simulation Notice:</span>
              <span className="text-zinc-400">Interactive Canvas simulates video feed when physical webcam is offline or restricted.</span>
            </div>
          </div>

          {/* Launch Button */}
          <button
            type="submit"
            id="start-broadcast-btn"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-pink-600/30 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Start Live Broadcast Now</span>
          </button>
        </form>
      </div>
    </div>
  );
};
