import React, { useState } from 'react';
import { 
  Users, 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  UserPlus, 
  Radio, 
  PhoneOff,
  Shield,
  Sparkles
} from 'lucide-react';
import { StreamGuest, UserProfile } from '../types';

interface MultiGuestPanelProps {
  guests: StreamGuest[];
  currentUser: UserProfile;
  isHost: boolean;
  onJoinAsGuest: (mode: 'video' | 'voice') => void;
  onLeaveGuest: (guestId: string) => void;
  onToggleMute: (guestId: string) => void;
  onToggleVideo: (guestId: string) => void;
}

export const MultiGuestPanel: React.FC<MultiGuestPanelProps> = ({
  guests,
  currentUser,
  isHost,
  onJoinAsGuest,
  onLeaveGuest,
  onToggleMute,
  onToggleVideo,
}) => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const isUserGuest = guests.some(g => g.user.id === currentUser.id);

  return (
    <div id="multi-guest-panel" className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-2.5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-zinc-200">Co-hosts & Guests ({guests.length}/4)</span>
        </div>

        {!isUserGuest && !isHost && guests.length < 4 && (
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold transition-all"
          >
            <UserPlus className="w-3 h-3" />
            <span>Request to Join</span>
          </button>
        )}
      </div>

      {/* Guest Slots Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {guests.map((guest) => {
          const isCurrentUser = guest.user.id === currentUser.id;
          return (
            <div
              key={guest.id}
              className="relative aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center group"
            >
              {guest.isVideoOff || guest.mode === 'voice' ? (
                // Voice mode avatar representation
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <div className="relative">
                    <img
                      src={guest.user.avatar}
                      alt={guest.user.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/50"
                    />
                    {!guest.isMuted && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300 mt-1 line-clamp-1">
                    {guest.user.name}
                  </span>
                  <span className="text-[9px] text-indigo-400 font-medium">Voice Co-host</span>
                </div>
              ) : (
                // Simulated live video stream
                <div className="w-full h-full relative">
                  <img
                    src={guest.user.avatar}
                    alt={guest.user.name}
                    className="w-full h-full object-cover filter brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white drop-shadow">
                    {guest.user.name}
                  </span>
                </div>
              )}

              {/* Status and interactive controls */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                {guest.isMuted && (
                  <span className="p-1 bg-red-950/80 border border-red-500/40 rounded-md text-red-400">
                    <MicOff className="w-3 h-3" />
                  </span>
                )}
                {(isHost || isCurrentUser) && (
                  <button
                    onClick={() => onLeaveGuest(guest.id)}
                    className="p-1 bg-zinc-900/90 hover:bg-red-900/80 text-zinc-400 hover:text-white rounded-md transition-colors"
                    title="Leave or kick guest"
                  >
                    <PhoneOff className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty Guest Slots */}
        {Array.from({ length: Math.max(0, 4 - guests.length) }).map((_, idx) => (
          <div
            key={`empty_${idx}`}
            onClick={() => !isUserGuest && !isHost && setShowJoinModal(true)}
            className={`aspect-video rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-2 transition-all ${
              !isUserGuest && !isHost
                ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-950/10 text-zinc-500 hover:text-indigo-400'
                : 'text-zinc-600'
            }`}
          >
            <UserPlus className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-medium">Guest Seat {guests.length + idx + 1}</span>
            <span className="text-[9px] text-zinc-500">Audio/Video Open</span>
          </div>
        ))}
      </div>

      {/* Modal to pick Audio vs Video join mode */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <h4 className="font-extrabold text-base text-white mb-1">Join Live Stream Stage</h4>
            <p className="text-xs text-zinc-400 mb-4">
              Connect directly with the creator and global audience in real-time.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  onJoinAsGuest('video');
                  setShowJoinModal(false);
                }}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-300 font-bold text-xs gap-2 transition-all"
              >
                <Video className="w-6 h-6 text-indigo-400" />
                <span>Join with Video</span>
              </button>

              <button
                onClick={() => {
                  onJoinAsGuest('voice');
                  setShowJoinModal(false);
                }}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-purple-500/40 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 font-bold text-xs gap-2 transition-all"
              >
                <Mic className="w-6 h-6 text-purple-400" />
                <span>Join Voice Only</span>
              </button>
            </div>

            <button
              onClick={() => setShowJoinModal(false)}
              className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
