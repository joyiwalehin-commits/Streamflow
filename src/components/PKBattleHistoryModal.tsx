import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  History, 
  X, 
  Coins, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Calendar,
  Gift
} from 'lucide-react';
import { PKBattleRecord } from '../types';
import { fetchPKBattleHistory } from '../services/pkBattleService';

interface PKBattleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId?: string;
}

export const PKBattleHistoryModal: React.FC<PKBattleHistoryModalProps> = ({
  isOpen,
  onClose,
  creatorId,
}) => {
  const [history, setHistory] = useState<PKBattleRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchPKBattleHistory(creatorId)
      .then((records) => setHistory(records))
      .catch((err) => console.error('Failed to load PK history:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen, creatorId]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>PK Battle History & Results</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                  {history.length} Recorded
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Official records of finished PK battles, final scores, gifts, and earnings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading battle logs...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <History className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
              <p className="font-bold text-zinc-300">No battle records found yet</p>
              <p className="text-zinc-500 mt-1">
                Completed PK battles will be permanently recorded here with frozen scores and earnings.
              </p>
            </div>
          ) : (
            history.map((record) => {
              const isWinnerA = record.winnerId === record.creatorA.id;
              const isWinnerB = record.winnerId === record.creatorB.id;
              const isDraw = record.winnerId === 'draw';

              return (
                <div
                  key={record.id}
                  className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all shadow-md"
                >
                  {/* Top Bar: Date, Duration, and Total Coins */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3 border-b border-zinc-800/80 pb-2">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{formatDate(record.endedAt)}</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3 h-3" />
                        <span>{record.durationSeconds}s</span>
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Coins className="w-3 h-3" />
                        <span>{record.totalCoinsContributed.toLocaleString()} Coins</span>
                      </span>
                      <span className="flex items-center gap-1 text-pink-400">
                        <Gift className="w-3 h-3" />
                        <span>{record.giftCount} Gifts</span>
                      </span>
                    </div>
                  </div>

                  {/* Duel Centerpiece */}
                  <div className="grid grid-cols-11 items-center gap-2 mb-3">
                    {/* Creator A */}
                    <div
                      className={`col-span-5 p-2.5 rounded-xl border flex items-center gap-2.5 ${
                        isWinnerA
                          ? 'bg-amber-500/10 border-amber-500/40 text-white'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <img
                        src={record.creatorA.avatar}
                        alt={record.creatorA.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-zinc-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs truncate">
                            {record.creatorA.name}
                          </span>
                          {isWinnerA && (
                            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 inline" />
                          )}
                        </div>
                        <div className="text-pink-400 font-extrabold text-sm">
                          {record.scoreA.toLocaleString()} <span className="text-[10px] text-pink-300 font-normal">pts</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          +{record.totalDiamondsEarnedA.toLocaleString()} 💎 (₦{(record.totalDiamondsEarnedA * 2).toLocaleString()})
                        </span>
                      </div>
                    </div>

                    {/* VS Badge */}
                    <div className="col-span-1 text-center font-black text-xs text-zinc-500">
                      VS
                    </div>

                    {/* Creator B */}
                    <div
                      className={`col-span-5 p-2.5 rounded-xl border flex items-center gap-2.5 ${
                        isWinnerB
                          ? 'bg-amber-500/10 border-amber-500/40 text-white'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <img
                        src={record.creatorB.avatar}
                        alt={record.creatorB.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-zinc-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs truncate">
                            {record.creatorB.name}
                          </span>
                          {isWinnerB && (
                            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 inline" />
                          )}
                        </div>
                        <div className="text-cyan-400 font-extrabold text-sm">
                          {record.scoreB.toLocaleString()} <span className="text-[10px] text-cyan-300 font-normal">pts</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          +{record.totalDiamondsEarnedB.toLocaleString()} 💎 (₦{(record.totalDiamondsEarnedB * 2).toLocaleString()})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Outcome Banner & Punishment */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded-xl bg-zinc-950/80 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        <strong>Outcome:</strong>{' '}
                        {isDraw ? (
                          <span className="text-zinc-300 font-bold">Tie / Draw</span>
                        ) : (
                          <span className="text-amber-300 font-black">
                            Winner: {record.winnerName}
                          </span>
                        )}
                      </span>
                    </div>

                    {record.punishmentRule && (
                      <div className="text-[11px] text-zinc-400 truncate max-w-sm">
                        <strong className="text-zinc-300">Stakes:</strong> {record.punishmentRule}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Server Authoritative PK Battle Ledger</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default PKBattleHistoryModal;
