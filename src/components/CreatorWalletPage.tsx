import React, { useState, useEffect } from 'react';
import { 
  Gem, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  History, 
  Gift, 
  RefreshCw, 
  ChevronRight, 
  Lock, 
  DollarSign, 
  Clock, 
  X,
  CreditCard,
  HelpCircle,
  TrendingUp,
  Sparkles,
  User
} from 'lucide-react';
import { UserProfile, CreatorWallet, CreatorWithdrawal, GiftTransaction } from '../types';
import { fetchCreatorWallet, submitWithdrawalRequest, WithdrawalRequestPayload } from '../services/creatorEarnings';

interface CreatorWalletPageProps {
  currentUser: UserProfile;
  onOpenBuyCoins: () => void;
  onGoBackToLive?: () => void;
}

const NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '044', name: 'Access Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
  { code: '999991', name: 'OPay Digital Services' },
  { code: '999992', name: 'PalmPay Limited' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '035', name: 'Wema Bank (ALAT)' },
  { code: '50515', name: 'Moniepoint Microfinance Bank' },
];

export const CreatorWalletPage: React.FC<CreatorWalletPageProps> = ({
  currentUser,
  onOpenBuyCoins,
  onGoBackToLive,
}) => {
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(currentUser.id);
  const [wallet, setWallet] = useState<CreatorWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gifts' | 'withdrawals' | 'private_sessions'>('gifts');

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('5000');
  const [selectedBankCode, setSelectedBankCode] = useState<string>('058');
  const [accountNumber, setAccountNumber] = useState<string>('0123456789');
  const [accountName, setAccountName] = useState<string>(currentUser.name.toUpperCase());
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<CreatorWithdrawal | null>(null);

  // Security Test Tool State: Trying to withdraw viewer coins
  const [isTestingViewerCoins, setIsTestingViewerCoins] = useState(false);
  const [policyRejectionNotice, setPolicyRejectionNotice] = useState<string | null>(null);

  // Load wallet from server
  const loadWallet = async (isManualRefresh = false, creatorIdToFetch = selectedCreatorId) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      setError(null);
      const data = await fetchCreatorWallet(creatorIdToFetch);
      setWallet(data);
      if (data?.creatorName) {
        setAccountName(data.creatorName.toUpperCase());
      }
    } catch (err: any) {
      console.error('Error loading creator wallet:', err);
      setError(err?.message || 'Unable to connect to wallet server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWallet(false, selectedCreatorId);
  }, [selectedCreatorId, currentUser.id]);

  // Handle legitimate withdrawal submission
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < 2000) {
      setWithdrawError('Minimum withdrawal amount is ₦2,000.');
      return;
    }

    if (wallet && amountNum > wallet.availableEarningsNgn) {
      setWithdrawError(`Requested ₦${amountNum.toLocaleString()} exceeds your available withdrawable earnings of ₦${wallet.availableEarningsNgn.toLocaleString()}. (Notice: Your ${wallet.viewerCoins.toLocaleString()} viewer coins are non-withdrawable).`);
      return;
    }

    const selectedBank = NIGERIAN_BANKS.find(b => b.code === selectedBankCode) || NIGERIAN_BANKS[0];

    setIsSubmittingWithdraw(true);
    try {
      const payload: WithdrawalRequestPayload = {
        creatorId: selectedCreatorId,
        amountNgn: amountNum,
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim().toUpperCase(),
        attemptViewerCoins: false,
      };

      const result = await submitWithdrawalRequest(payload);
      setWithdrawSuccess(result.withdrawal);
      // Reload wallet data
      await loadWallet(false, selectedCreatorId);
    } catch (err: any) {
      setWithdrawError(err?.message || 'Withdrawal failed. Please check details.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Test tool: Explicitly test server rejection of viewer coins
  const handleTestViewerCoinsRejection = async () => {
    setIsTestingViewerCoins(true);
    setPolicyRejectionNotice(null);
    try {
      const selectedBank = NIGERIAN_BANKS[0];
      await submitWithdrawalRequest({
        creatorId: selectedCreatorId,
        amountNgn: 3000,
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumber: '0123456789',
        accountName: (wallet?.creatorName || currentUser.name).toUpperCase(),
        attemptViewerCoins: true, // TRIGGER INTENTIONAL VIOLATION
      });
    } catch (err: any) {
      // Expect server rejection
      setPolicyRejectionNotice(err?.message || 'Server correctly blocked viewer coin withdrawal!');
    } finally {
      setIsTestingViewerCoins(false);
    }
  };

  const currentBank = NIGERIAN_BANKS.find(b => b.code === selectedBankCode) || NIGERIAN_BANKS[0];
  const diamondsNeeded = Math.round((parseFloat(withdrawAmount) || 0) / 2.0);

  return (
    <div id="creator-wallet-page" className="max-w-7xl mx-auto px-4 py-6 text-zinc-100 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 p-0.5 shadow-xl shadow-pink-900/30 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Gem className="w-6 h-6 text-pink-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">Creator Wallet</h1>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-bold">
                Earnings Hub
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Direct Paystack Payouts • Live Stream Virtual Gift Earnings in Nigerian Naira (₦)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadWallet(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-pink-400' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Wallet'}</span>
          </button>

          <button
            onClick={onOpenBuyCoins}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Recharge Viewer Coins</span>
          </button>

          {onGoBackToLive && (
            <button
              onClick={onGoBackToLive}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
            >
              Back to Live
            </button>
          )}
        </div>
      </div>

      {/* Creator Profile Switcher Bar */}
      <div className="my-4 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <User className="w-4 h-4 text-pink-400 shrink-0" />
          <span>Active Creator Wallet:</span>
          <span className="text-zinc-500 font-normal">Select account to view earnings & gift receipts</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'user_me', name: 'Alex Rivera (Viewer/Creator)', flag: '🇺🇸' },
            { id: 'creator_tokyo', name: 'Yuki Tanaka (Tokyo Live Host)', flag: '🇯🇵' },
            { id: 'creator_rio', name: 'Camila Santos (Rio Live Host)', flag: '🇧🇷' },
          ].map((c) => (
            <button
              key={c.id}
              id={`switch-creator-${c.id}`}
              onClick={() => setSelectedCreatorId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCreatorId === c.id
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-900/40 ring-1 ring-pink-400/50'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Critical Policy Distinction Banner */}
      <div className="my-5 p-4 rounded-2xl bg-zinc-900/90 border border-pink-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 via-amber-400 to-purple-500"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">StreamFlow Creator Earnings Policy</h3>
                <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Strict Rule
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                <strong>Withdrawable:</strong> Only <em>Creator Earnings</em> received from virtual gifts during live streams can be withdrawn into your Nigerian bank account at <span className="text-pink-300 font-bold">1 Diamond = ₦2.00</span>.
                <br className="hidden sm:inline" />
                <strong>Non-Withdrawable:</strong> <em>Viewer Coins</em> purchased via Paystack are strictly non-withdrawable and reserved for sending gifts and tipping creators.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              id="test-viewer-coins-rejection-btn"
              onClick={handleTestViewerCoinsRejection}
              disabled={isTestingViewerCoins}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5"
              title="Test system rejection: Attempting to withdraw viewer coins"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>{isTestingViewerCoins ? 'Testing Rule...' : 'Verify Coin Protection'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Feedback Banner for Testing Rule */}
        {policyRejectionNotice && (
          <div className="mt-3 p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Security Enforcement Verified:</p>
              <p className="text-zinc-300 text-[11px] mt-0.5">{policyRejectionNotice}</p>
            </div>
            <button onClick={() => setPolicyRejectionNotice(null)} className="text-zinc-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Available Creator Balance (WITHDRAWABLE) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-950/40 via-zinc-900 to-purple-950/30 border border-pink-500/40 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pink-400 flex items-center gap-1">
              <Gem className="w-3.5 h-3.5" /> Available to Withdraw
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
              Ready Payout
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight">
              ₦{loading ? '...' : (wallet?.availableEarningsNgn || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-pink-300 mt-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>{(wallet?.availableDiamonds || 0).toLocaleString()} Diamonds</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 text-[11px]">@ ₦2.00 / 💎</span>
            </div>
          </div>

          <button
            id="open-withdrawal-modal-btn"
            onClick={() => {
              setWithdrawError(null);
              setWithdrawSuccess(null);
              setIsWithdrawModalOpen(true);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-pink-900/40 active:scale-98 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw Earnings (₦)</span>
          </button>
        </div>

        {/* Card 2: Lifetime Creator Earnings */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Lifetime Earned
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">ALL-TIME</span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-zinc-100">
              ₦{loading ? '...' : (wallet?.totalLifetimeEarningsNgn || 0).toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              <Gem className="w-3 h-3 text-pink-400" />
              <span>{(wallet?.totalLifetimeDiamonds || 0).toLocaleString()} Total Diamonds</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
            Received across all live sessions
          </div>
        </div>

        {/* Card 3: Total Withdrawn */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Total Withdrawn
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Successful
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-zinc-100">
              ₦{loading ? '...' : (wallet?.totalWithdrawnNgn || 0).toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Transferred to Nigerian Bank Accounts
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-zinc-400" />
            <span>Direct NUBAN transfers</span>
          </div>
        </div>

        {/* Card 4: Viewer Coins (NON-WITHDRAWABLE) */}
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> Viewer Balance
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
              Non-Withdrawable
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-amber-300 flex items-center gap-1.5">
              <span>{loading ? '...' : (wallet?.viewerCoins || currentUser.coins || 0).toLocaleString()}</span>
              <span className="text-xs font-bold text-amber-400">Coins</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              For tipping streamers & sending virtual gifts
            </div>
          </div>

          <button
            onClick={onOpenBuyCoins}
            className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Recharge Coins via Paystack</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation for Activity */}
      <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('gifts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'gifts'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Gift className="w-4 h-4 text-pink-400" />
              <span>Gift History ({wallet?.giftHistory?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'withdrawals'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <History className="w-4 h-4 text-amber-400" />
              <span>Withdrawal History ({wallet?.withdrawalHistory?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('private_sessions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'private_sessions'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Private Lives ({wallet?.privateSessionHistory?.length || 0})</span>
            </button>
          </div>

          <span className="text-xs text-zinc-500 hidden sm:inline">
            Real-time server logs
          </span>
        </div>

        {/* Tab Content 1: Gift History */}
        {activeTab === 'gifts' && (
          <div className="space-y-3">
            {wallet?.giftHistory && wallet.giftHistory.length > 0 ? (
              <div className="divide-y divide-zinc-800/80">
                {wallet.giftHistory.map((gift) => (
                  <div key={gift.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/20 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl shrink-0">
                        {gift.giftIcon}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">
                            {gift.count}x {gift.giftName}
                          </span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-xs text-zinc-400">
                            from <strong className="text-zinc-200">{gift.senderName}</strong>
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          Stream: {gift.streamTitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-emerald-400 text-sm">
                        +₦{gift.earningsNgn.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-pink-300 font-semibold flex items-center justify-end gap-1">
                        <Gem className="w-3 h-3 text-pink-400" />
                        <span>+{gift.diamondsEarned.toLocaleString()} Diamonds</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(gift.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(gift.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400">
                <Gift className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="font-bold text-sm text-zinc-300">No gift transactions recorded yet</p>
                <p className="text-xs text-zinc-500 mt-1">Start a live stream and receive gifts from your audience to earn diamonds!</p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Withdrawal History */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {wallet?.withdrawalHistory && wallet.withdrawalHistory.length > 0 ? (
              <div className="divide-y divide-zinc-800/80">
                {wallet.withdrawalHistory.map((wd) => (
                  <div key={wd.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/20 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-zinc-300" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">
                            {wd.bankName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {wd.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Account: ••••{wd.accountNumber.slice(-4)} ({wd.accountName})
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Ref: {wd.reference}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-zinc-100 text-sm">
                        -₦{wd.amountNgn.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center justify-end gap-1">
                        <Gem className="w-3 h-3 text-pink-400" />
                        <span>-{wd.diamondsDeducted.toLocaleString()} Diamonds</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(wd.requestedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400">
                <History className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="font-bold text-sm text-zinc-300">No withdrawals made yet</p>
                <p className="text-xs text-zinc-500 mt-1">Once you request a withdrawal, your payout details will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Private Live Sessions History */}
        {activeTab === 'private_sessions' && (
          <div className="space-y-3">
            {wallet?.privateSessionHistory && wallet.privateSessionHistory.length > 0 ? (
              <div className="divide-y divide-zinc-800/80">
                {wallet.privateSessionHistory.map((ps) => (
                  <div key={ps.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/20 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">
                            {ps.streamTitle}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {ps.minutesBilled} mins billed
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Viewer: <strong className="text-zinc-200">{ps.viewerName}</strong> • Rate: {ps.pricePerMinute} Coins/min
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Session Ref: {ps.sessionId}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-emerald-400 text-sm">
                        +₦{ps.earningsNgn.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-zinc-300 flex items-center justify-end gap-1 font-mono">
                        <Gem className="w-3 h-3 text-pink-400" />
                        <span>+{ps.diamondsCredited.toLocaleString()} Diamonds</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(ps.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400">
                <Lock className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="font-bold text-sm text-zinc-300">No Private Live Sessions recorded yet</p>
                <p className="text-xs text-zinc-500 mt-1">Host a private live stream with coins-per-minute access to earn withdrawable diamonds!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECURE WITHDRAWAL MODAL */}
      {isWithdrawModalOpen && (
        <div id="withdrawal-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 text-zinc-100 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600"></div>

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Withdraw Creator Earnings</h3>
                  <p className="text-xs text-zinc-400">Direct Transfer to Nigerian Bank Account (NUBAN)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {withdrawSuccess ? (
              /* Success State */
              <div className="py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-white mb-1">Withdrawal Request Approved!</h4>
                <p className="text-xs text-zinc-300 max-w-xs mx-auto mb-4">
                  ₦{withdrawSuccess.amountNgn.toLocaleString()} has been sent to your {withdrawSuccess.bankName} account ({withdrawSuccess.accountNumber.slice(0, 3)}••••{withdrawSuccess.accountNumber.slice(-3)}).
                </p>

                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-left text-xs mb-5 font-mono">
                  <div className="flex justify-between py-1 border-b border-zinc-800 text-zinc-400">
                    <span>Reference:</span>
                    <span className="text-zinc-200">{withdrawSuccess.reference}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800 text-zinc-400">
                    <span>Diamonds Deducted:</span>
                    <span className="text-pink-300 font-bold">{withdrawSuccess.diamondsDeducted.toLocaleString()} 💎</span>
                  </div>
                  <div className="flex justify-between py-1 text-zinc-400">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-bold uppercase">{withdrawSuccess.status}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setWithdrawSuccess(null);
                    setIsWithdrawModalOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleWithdrawSubmit} className="mt-4 space-y-4">
                {/* Available Balance Reminder */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-pink-950/30 border border-pink-500/30 text-xs">
                  <span className="text-zinc-300 font-medium">Available to Withdraw:</span>
                  <span className="font-extrabold text-pink-300 text-sm">
                    ₦{(wallet?.availableEarningsNgn || 0).toLocaleString()} ({(wallet?.availableDiamonds || 0).toLocaleString()} 💎)
                  </span>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Withdrawal Amount (₦ NGN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-sm">₦</span>
                    <input
                      type="number"
                      min="2000"
                      step="500"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Minimum 2,000"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-pink-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Preset Amount Chips */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[2000, 5000, 10000, 25000].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setWithdrawAmount(amt.toString())}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-zinc-300"
                      >
                        ₦{amt.toLocaleString()}
                      </button>
                    ))}
                    {wallet && wallet.availableEarningsNgn > 0 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(wallet.availableEarningsNgn.toString())}
                        className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-[11px] font-bold text-pink-300"
                      >
                        Max (₦{wallet.availableEarningsNgn.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>

                {/* Bank Selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Select Nigerian Bank
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={(e) => setSelectedBankCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-pink-500 focus:outline-none"
                  >
                    {NIGERIAN_BANKS.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Number & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      10-Digit NUBAN Account
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 0123456789"
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-pink-500 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g. ALEX RIVERA"
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-pink-500 focus:outline-none uppercase"
                      required
                    />
                  </div>
                </div>

                {/* Conversion Preview */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between text-zinc-400">
                  <span>Diamonds Redeemed:</span>
                  <span className="font-extrabold text-pink-300 flex items-center gap-1">
                    <Gem className="w-3.5 h-3.5 text-pink-400" />
                    {diamondsNeeded.toLocaleString()} 💎
                  </span>
                </div>

                {/* Error Banner */}
                {withdrawError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                {/* Non-Withdrawable Coins Guard Note */}
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  🔒 Payout processed via automated Paystack Transfer to your verified Nigerian bank. Coins in your viewer wallet cannot be withdrawn.
                </p>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmittingWithdraw}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-900/40 active:scale-98 transition-all"
                >
                  {isSubmittingWithdraw ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Bank Payout...</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>Confirm Withdrawal of ₦{(parseFloat(withdrawAmount) || 0).toLocaleString()}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
