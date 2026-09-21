import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Users, 
  Clock, 
  Flame, 
  X, 
  ShieldAlert, 
  CheckCircle, 
  Sparkles, 
  AlertCircle,
  Radio
} from 'lucide-react';
import { UserProfile, PKBattleSession } from '../types';
import { fetchAvailableOpponents, createPKChallenge } from '../services/pkBattleService';

interface PKBattleLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenger: UserProfile;
  streamId: string;
  onBattleStarted: (battle: PKBattleSession) => void;
}

const PUNISHMENT_PRESETS = [
  "Loser sings opponent's top hit track live on stream",
  "Loser does 20 pushups and speaks in funny robot voice",
  "Loser wears funny sunglasses and goofy face filter for 5 mins",
  "Loser chants winner's channel handle 5 times loudly",
  "Loser tells an embarrassing secret to the entire live chat",
];

const DURATION_OPTIONS = [
  { seconds: 60, label: '1 Min', desc: 'Lightning Blitz' },
  { seconds: 120, label: '2 Mins', desc: 'Fast Duel' },
  { seconds: 180, label: '3 Mins', desc: 'Official Championship' },
  { seconds: 300, label: '5 Mins', desc: 'Endurance Climax' },
];

export const PKBattleLobbyModal: React.FC<PKBattleLobbyModalProps> = ({
  isOpen,
  onClose,
  challenger,
  streamId,
  onBattleStarted,
}) => {
  const [opponents, setOpponents] = useState<UserProfile[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<UserProfile | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number>(180);
  const [punishmentRule, setPunishmentRule] = useState<string>(PUNISHMENT_PRESETS[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChallenging, setIsChallenging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    fetchAvailableOpponents()
      .then((data) => {
        setOpponents(data);
        if (data.length > 0) {
          setSelectedOpponent(data[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load opponents:', err);
        setError('Could not load online creators. Please try again.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartBattle = async () => {
    if (!selectedOpponent) {
      setError('Please select an opponent to challenge.');
      return;
    }

    setIsChallenging(true);
    setError(null);

    try {
      const battle = await createPKChallenge({
        challengerId: challenger.id,
        challengerName: challenger.name,
        challengerAvatar: challenger.avatar,
        challengerStreamId: streamId,
        opponentId: selectedOpponent.id,
        opponentName: selectedOpponent.name,
        opponentAvatar: selectedOpponent.avatar,
        opponentStreamId: streamId,
        durationSeconds,
        punishmentRule,
      });

      onBattleStarted(battle);
      onClose();
    } catch (err: any) {
      console.error('Failed to initiate PK Challenge:', err);
      setError(err?.message || 'Failed to start battle challenge. Please try again.');
    } finally {
      setIsChallenging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 text-white shadow-lg shadow-pink-900/40">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>PK Battle Arena Lobby</span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-mono border border-pink-500/30">
                  LIVE DUEL
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Challenge an active creator, set the stakes, and rally your viewers for battle points!
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

        {/* Demo Notice Banner */}
        <div className="bg-cyan-950/40 border-b border-cyan-500/20 px-4 py-2 flex items-center gap-2 text-[11px] text-cyan-300">
          <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
          <span>
            <strong>Simulation & Demo Notice:</strong> Streams utilize WebRTC camera/audio signaling simulation for peer-to-peer battle demonstration.
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Select Opponent */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-pink-400" />
                <span>1. Select Opponent Creator</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                {opponents.length} Creators Online
              </span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span>Finding active streaming creators...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {opponents.map((opp) => {
                  const isSelected = selectedOpponent?.id === opp.id;
                  return (
                    <button
                      key={opp.id}
                      type="button"
                      onClick={() => setSelectedOpponent(opp)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-pink-950/50 border-pink-500 shadow-md shadow-pink-950/50'
                          : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={opp.avatar}
                          alt={opp.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-zinc-700"
                        />
                        <span className="absolute -top-1 -right-1 text-xs">
                          {opp.countryFlag}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs truncate">
                            {opp.name}
                          </span>
                          {isSelected && (
                            <CheckCircle className="w-3.5 h-3.5 text-pink-400 shrink-0 ml-1" />
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {opp.bio || 'Live Streamer'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400">
                          <span className="text-pink-400 font-semibold">
                            {(opp.followers || 50000).toLocaleString()} followers
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Battle Duration */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Battle Duration</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = durationSeconds === opt.seconds;
                return (
                  <button
                    key={opt.seconds}
                    type="button"
                    onClick={() => setDurationSeconds(opt.seconds)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-950/40'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span className="block font-black text-sm">{opt.label}</span>
                    <span className="block text-[10px] text-zinc-400 mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Punishment Stakes Rule */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Loser's Punishment Rule (Stakes)</span>
              </label>
              <span className="text-[10px] text-zinc-500">Enforced at zero time</span>
            </div>

            <input
              type="text"
              value={punishmentRule}
              onChange={(e) => setPunishmentRule(e.target.value)}
              placeholder="e.g. Loser sings opponent's hit song live..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors mb-2"
            />

            {/* Presets Chips */}
            <div className="flex flex-wrap gap-1.5">
              {PUNISHMENT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPunishmentRule(preset)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    punishmentRule === preset
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {preset.slice(0, 32)}...
                </button>
              ))}
            </div>
          </div>

          {/* Fair-Play Coin & Scoring Guarantee */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-2.5 text-xs text-zinc-400">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-200 block mb-0.5">StreamFlow Fair-Play Guarantee</strong>
              <span>
                • Gifts deduct viewer coins exactly once and add 1 battle point per coin to the chosen creator.<br />
                • 100% of gift coin value is credited as creator diamonds (₦2.00/diamond).<br />
                • Negative coin balances and duplicate submissions are blocked server-side.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isChallenging || !selectedOpponent}
            onClick={handleStartBattle}
            className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
              isChallenging || !selectedOpponent
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-pink-900/40 active:scale-95'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isChallenging
                ? 'Connecting to Lobby...'
                : `Challenge ${selectedOpponent?.name?.split(' ')[0] || 'Creator'} to PK Battle!`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default PKBattleLobbyModal;
