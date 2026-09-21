import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Radio,
  Clock,
  Shield,
  RefreshCw,
  Crown,
  Eye,
  Swords,
  Sparkles,
} from 'lucide-react';
import { StreamingPresenceInfo, StreamingPresenceParticipant } from '../types';
import { streamingProviderService } from '../services/streamingProviderService';

interface StreamingPresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  streamTitle: string;
  isHost: boolean;
}

export const StreamingPresenceModal: React.FC<StreamingPresenceModalProps> = ({
  isOpen,
  onClose,
  streamId,
  streamTitle,
  isHost,
}) => {
  const [presence, setPresence] = useState<StreamingPresenceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPresence = async () => {
    setIsLoading(true);
    try {
      const data = await streamingProviderService.getPresence(streamId);
      setPresence(data);
    } catch (err) {
      console.error('Error fetching presence:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchPresence();
    const interval = setInterval(fetchPresence, 5000);
    return () => clearInterval(interval);
  }, [isOpen, streamId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Room Presence & Viewers</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                  {presence?.totalViewers || 0} Online
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{streamTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchPresence}
              disabled={isLoading}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Refresh presence"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-pink-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Presence Summary Stats */}
        <div className="grid grid-cols-2 gap-2 p-4 bg-zinc-900/30 border-b border-zinc-800/60 text-xs">
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-850">
            <span className="text-[10px] text-zinc-500 block">Current Active Viewers</span>
            <span className="text-base font-black text-white font-mono">{presence?.totalViewers || 1}</span>
          </div>
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-850">
            <span className="text-[10px] text-zinc-500 block">Peak Room Viewers</span>
            <span className="text-base font-black text-amber-400 font-mono">{presence?.peakViewers || 1}</span>
          </div>
        </div>

        {/* Participant List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {presence?.participants && presence.participants.length > 0 ? (
            presence.participants.map((p: StreamingPresenceParticipant) => (
              <div
                key={p.userId}
                className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={
                        p.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                      }
                      alt={p.userName}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                    />
                    {p.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white">{p.userName}</span>
                      {p.role === 'host' && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-wider border border-rose-500/30 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" />
                          <span>Host</span>
                        </span>
                      )}
                      {p.role === 'cohost' && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider border border-indigo-500/30 flex items-center gap-0.5">
                          <Swords className="w-2.5 h-2.5" />
                          <span>Co-Host</span>
                        </span>
                      )}
                      {p.role === 'viewer' && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" />
                          <span>Viewer</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>Joined {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      p.isOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'
                      }`}
                    />
                    <span>{p.isOnline ? 'Active' : 'Offline'}</span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-zinc-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>No other active participants recorded yet</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Heartbeats synchronized every 10s via server presence</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
