import React from 'react';
import { Coins, Zap, ShieldCheck, X, Sparkles, ArrowRight, CreditCard, Gem } from 'lucide-react';
import { UserProfile } from '../types';

interface CoinWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onRechargeCoins: (amount: number) => void;
  onOpenBuyCoinsPage?: () => void;
  onOpenCreatorWallet?: () => void;
}

const COIN_TIERS = [
  { coins: 500, priceNgn: '₦1,200', popular: false },
  { coins: 1650, priceNgn: '₦3,500', popular: true, bonus: '+150 Free' },
  { coins: 4600, priceNgn: '₦8,500', popular: false, bonus: '+600 Free' },
  { coins: 12000, priceNgn: '₦20,000', popular: false, bonus: '+2,000 Free' },
  { coins: 31500, priceNgn: '₦50,000', popular: false, bonus: '+6,500 Free' },
  { coins: 78000, priceNgn: '₦120,000', popular: false, bonus: '+18,000 Free' },
];

export const CoinWalletModal: React.FC<CoinWalletModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRechargeCoins,
  onOpenBuyCoinsPage,
  onOpenCreatorWallet,
}) => {
  if (!isOpen) return null;

  return (
    <div id="coin-wallet-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 text-zinc-100 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base text-white">StreamFlow Coin Wallet</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ₦ NGN
                </span>
              </div>
              <p className="text-xs text-zinc-400">Current Balance: <strong className="text-amber-400 font-mono">{currentUser.coins.toLocaleString()} Coins</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Go to Paystack Full Page Banner */}
        {onOpenBuyCoinsPage && (
          <div className="mt-3 p-3 bg-gradient-to-r from-[#001C38] to-zinc-900 border border-[#00C3F7]/30 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#00C3F7]/20 flex items-center justify-center text-[#00C3F7]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>Paystack Coin Store</span>
                  <span className="text-[9px] bg-[#00C3F7]/20 text-[#00C3F7] px-1 rounded font-mono">Test Mode</span>
                </div>
                <div className="text-[10px] text-zinc-400">Official Checkout & Transaction Logs</div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenBuyCoinsPage();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#00C3F7] hover:bg-[#0BA4DB] text-black text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
            >
              <span>Open Store</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 my-3.5">
          {COIN_TIERS.map((tier, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (onOpenBuyCoinsPage) {
                  onClose();
                  onOpenBuyCoinsPage();
                } else {
                  onRechargeCoins(tier.coins);
                  onClose();
                }
              }}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all group relative cursor-pointer ${
                tier.popular
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-900/20'
                  : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-2 right-2.5 text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-black px-1.5 py-0.2 rounded-full shadow">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-base mb-1 font-mono">
                <Coins className="w-4 h-4" />
                <span>{tier.coins.toLocaleString()}</span>
              </div>

              {tier.bonus && (
                <span className="text-[10px] text-pink-400 font-bold mb-1">
                  {tier.bonus}
                </span>
              )}

              <div className="mt-1 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-amber-300 font-mono">{tier.priceNgn}</span>
                <span className="text-[10px] text-zinc-400 group-hover:underline">Paystack</span>
              </div>
            </button>
          ))}
        </div>

        {onOpenCreatorWallet && (
          <div className="mb-3 p-3 bg-zinc-900/90 border border-pink-500/30 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400">
                <Gem className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>Are you a Creator?</span>
                  <span className="text-[9px] bg-pink-500/20 text-pink-400 px-1 rounded font-bold">₦ Payouts</span>
                </div>
                <div className="text-[10px] text-zinc-400">Withdraw gift earnings to Nigerian Bank</div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenCreatorWallet();
              }}
              className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
            >
              <span>Creator Wallet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Pay in Nigerian Naira via Paystack. Automated verification with zero double-crediting risk.</span>
        </div>
      </div>
    </div>
  );
};

