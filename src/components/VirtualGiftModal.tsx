import React, { useState } from 'react';
import { Sparkles, Coins, Gift, Zap, X } from 'lucide-react';
import { VirtualGift, UserProfile } from '../types';
import { AVAILABLE_GIFTS } from '../mockData';

interface VirtualGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  recipientName: string;
  onSendGift: (gift: VirtualGift, count: number) => void;
  onAddCoins: () => void;
}

export const VirtualGiftModal: React.FC<VirtualGiftModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  recipientName,
  onSendGift,
  onAddCoins,
}) => {
  const [selectedGift, setSelectedGift] = useState<VirtualGift>(AVAILABLE_GIFTS[0]);
  const [giftMultiplier, setGiftMultiplier] = useState<number>(1);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const totalCost = selectedGift.coinPrice * giftMultiplier;
  const hasEnoughCoins = currentUser.coins >= totalCost;

  const handleSend = () => {
    if (!hasEnoughCoins) {
      onAddCoins();
      return;
    }
    setIsSending(true);
    onSendGift(selectedGift, giftMultiplier);
    setTimeout(() => {
      setIsSending(false);
      onClose();
    }, 400);
  };

  return (
    <div id="virtual-gift-modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 text-zinc-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Send Virtual Gift</h3>
              <p className="text-[11px] text-zinc-400">Supporting <strong className="text-zinc-200">{recipientName}</strong></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Coin Balance */}
            <div 
              onClick={onAddCoins}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer hover:bg-amber-500/20 transition-colors"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentUser.coins.toLocaleString()}</span>
              <span className="text-[10px] text-amber-400 bg-amber-400/20 px-1 rounded font-normal">+Recharge</span>
            </div>

            <button 
              onClick={onClose}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gift Grid */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          {AVAILABLE_GIFTS.map((gift) => {
            const isSelected = selectedGift.id === gift.id;
            return (
              <button
                key={gift.id}
                onClick={() => setSelectedGift(gift)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center group ${
                  isSelected
                    ? 'bg-gradient-to-b from-pink-950/60 to-purple-950/40 border-pink-500 shadow-lg shadow-pink-900/40 scale-102 ring-1 ring-pink-500/50'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <span className="text-3xl mb-1 filter drop-shadow group-hover:scale-110 transition-transform">
                  {gift.icon}
                </span>
                <span className="font-bold text-xs text-zinc-200 line-clamp-1">{gift.name}</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 mt-1">
                  <Coins className="w-3 h-3" />
                  {gift.coinPrice}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multiplier Presets */}
        <div className="flex items-center justify-between gap-1.5 p-2 bg-zinc-900/80 border border-zinc-800 rounded-xl mb-4">
          <span className="text-[11px] font-semibold text-zinc-400 ml-1">Combo Count:</span>
          <div className="flex items-center gap-1">
            {[1, 5, 10, 66, 99].map((count) => (
              <button
                key={count}
                onClick={() => setGiftMultiplier(count)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  giftMultiplier === count
                    ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                x{count}
              </button>
            ))}
          </div>
        </div>

        {/* Send Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs">
            <span className="text-zinc-400">Total: </span>
            <span className="font-extrabold text-amber-300 text-sm">{totalCost.toLocaleString()} Coins</span>
          </div>

          <button
            onClick={handleSend}
            disabled={isSending}
            className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all ${
              hasEnoughCoins
                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white shadow-pink-600/30 active:scale-95'
                : 'bg-amber-600 hover:bg-amber-500 text-black shadow-amber-600/20'
            }`}
          >
            {hasEnoughCoins ? (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>{isSending ? 'Sending Effect...' : `Send Gift x${giftMultiplier}`}</span>
              </>
            ) : (
              <>
                <Coins className="w-4 h-4" />
                <span>Recharge Coins</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
