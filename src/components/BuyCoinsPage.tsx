import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  ShieldCheck, 
  Lock, 
  Zap, 
  Sparkles, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  CreditCard, 
  Copy, 
  Check, 
  Flame, 
  Gift, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { UserProfile, CoinPackage, PaystackTransaction } from '../types';
import { 
  fetchPaystackConfig, 
  initializePaystackPayment, 
  verifyPaystackPayment, 
  fetchUserTransactions 
} from '../services/paystack';
import { PaystackCheckoutModal } from './PaystackCheckoutModal';

interface BuyCoinsPageProps {
  currentUser: UserProfile;
  onCoinsCredited: (amount: number) => void;
  onGoBackToLive?: () => void;
}

export const BuyCoinsPage: React.FC<BuyCoinsPageProps> = ({
  currentUser,
  onCoinsCredited,
  onGoBackToLive,
}) => {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [userEmail, setUserEmail] = useState<string>(currentUser.email || 'joyiwalehin@gmail.com');
  const [isTestMode, setIsTestMode] = useState<boolean>(true);
  const [isPaystackConfigured, setIsPaystackConfigured] = useState<boolean>(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [checkoutReference, setCheckoutReference] = useState<string>('');
  const [checkoutAuthUrl, setCheckoutAuthUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  // Transactions state
  const [transactions, setTransactions] = useState<PaystackTransaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);

  // Load config & initial transactions
  useEffect(() => {
    async function loadData() {
      setIsLoadingConfig(true);
      try {
        const config = await fetchPaystackConfig();
        setPackages(config.packages);
        setIsTestMode(config.testMode);
        setIsPaystackConfigured(config.isConfigured);
        if (config.packages.length > 1) {
          // Default select the popular package (index 1)
          setSelectedPackage(config.packages[1]);
        }
      } catch (err) {
        console.error('Failed to load Paystack config:', err);
      } finally {
        setIsLoadingConfig(false);
      }

      // Fetch user transaction history
      try {
        const txns = await fetchUserTransactions(currentUser.id);
        setTransactions(txns);
      } catch (err) {
        console.error('Failed to load transaction history:', err);
      }
    }
    loadData();
  }, [currentUser.id]);

  const refreshHistory = async () => {
    setIsLoadingTxns(true);
    try {
      const txns = await fetchUserTransactions(currentUser.id);
      setTransactions(txns);
    } catch (err) {
      console.error('Failed to refresh transactions:', err);
    } finally {
      setIsLoadingTxns(false);
    }
  };

  const handleCopy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleInitiatePayment = async () => {
    if (!selectedPackage) return;
    if (!userEmail || !userEmail.includes('@')) {
      setAlertBanner({ type: 'error', message: 'Please enter a valid email address to receive your payment receipt.' });
      return;
    }

    setIsInitializing(true);
    setAlertBanner(null);

    try {
      const res = await initializePaystackPayment({
        packageId: selectedPackage.id,
        email: userEmail,
        userId: currentUser.id,
      });

      setCheckoutReference(res.data.reference);
      setCheckoutAuthUrl(res.data.authorization_url || null);
      setIsCheckoutOpen(true);
    } catch (err: any) {
      console.error('Paystack initialization error:', err);
      setAlertBanner({ 
        type: 'error', 
        message: err.message || 'Failed to initialize transaction with Paystack. Please check your network and try again.' 
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePaymentSuccess = (transaction: PaystackTransaction, coinsAdded: number) => {
    onCoinsCredited(coinsAdded);
    setAlertBanner({
      type: 'success',
      message: `🎉 Payment successful! ${coinsAdded.toLocaleString()} Coins were verified by Paystack and credited to your wallet.`,
    });
    refreshHistory();
  };

  // Manual re-verify test to demonstrate double credit prevention!
  const handleManualVerify = async (ref: string) => {
    setVerifyingRef(ref);
    try {
      const res = await verifyPaystackPayment({ reference: ref, userId: currentUser.id });
      if (res.alreadyCredited) {
        setAlertBanner({
          type: 'info',
          message: `🔒 Double Credit Protection: Transaction ${ref} was already verified. No duplicate coins were added.`,
        });
      } else if (res.success && res.coinsAdded) {
        onCoinsCredited(res.coinsAdded);
        setAlertBanner({
          type: 'success',
          message: `Verified! ${res.coinsAdded.toLocaleString()} Coins credited.`,
        });
        refreshHistory();
      } else {
        setAlertBanner({
          type: 'error',
          message: res.error || 'Verification check failed.',
        });
      }
    } catch (err: any) {
      setAlertBanner({
        type: 'error',
        message: err.message || 'Verification failed.',
      });
    } finally {
      setVerifyingRef(null);
    }
  };

  return (
    <div id="buy-coins-page" className="max-w-7xl mx-auto px-4 py-6 text-zinc-100 animate-in fade-in duration-200">
      {/* Top Banner Alert (if any) */}
      {alertBanner && (
        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in slide-in-from-top-2 ${
          alertBanner.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
            : alertBanner.type === 'info'
            ? 'bg-blue-950/40 border-blue-500/50 text-blue-300'
            : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {alertBanner.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {alertBanner.type === 'info' && <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />}
            {alertBanner.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            <span className="text-sm font-medium">{alertBanner.message}</span>
          </div>
          <button 
            onClick={() => setAlertBanner(null)} 
            className="text-xs opacity-70 hover:opacity-100 underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header with Wallet Balance & Paystack Security */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#00C3F7]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                StreamFlow Coin Store
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span>🇳🇬</span>
                <span>NGN (₦)</span>
              </span>
              {isTestMode && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#00C3F7]/20 text-[#00C3F7] border border-[#00C3F7]/30">
                  Paystack Test Mode
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Buy StreamFlow Coins in Nigerian Naira
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
              Power up your live streams with instant coin recharges. Send exclusive gifts like Cosmic Roses and Golden Dragons, boost creators in international PK battles, and unlock VIP chat rooms.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" /> Official Paystack Verification
              </span>
              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                <Lock className="w-4 h-4" /> Server-Side Secret Key Security
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Zap className="w-4 h-4" /> Instant Wallet Crediting
              </span>
            </div>
          </div>

          {/* Current User Wallet Card */}
          <div className="bg-zinc-950/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between min-w-[240px] shadow-lg shrink-0">
            <div className="text-xs text-zinc-400 flex items-center justify-between mb-1">
              <span>Your Coin Balance</span>
              <span className="text-[10px] text-zinc-500 font-mono">Live</span>
            </div>
            <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-amber-400 font-mono my-1">
              <Coins className="w-7 h-7 text-amber-400 animate-spin-slow" />
              <span>{currentUser.coins.toLocaleString()}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between border-t border-zinc-800/80 pt-2">
              <span>Account:</span>
              <strong className="text-zinc-200">{currentUser.name}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Buy Coins vs Transaction History */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'packages'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-900/30'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Coin Packages</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              refreshHistory();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-900/30'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Transaction History</span>
            {transactions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
                {transactions.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'packages' && onGoBackToLive && (
          <button
            onClick={onGoBackToLive}
            className="text-xs text-zinc-400 hover:text-pink-400 flex items-center gap-1 font-medium transition-colors"
          >
            <span>Back to Live Stream</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* TAB 1: COIN PACKAGES VIEW */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Package Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Select a Nigerian Naira (₦) Coin Package</span>
                <span className="text-xs text-zinc-500 font-normal">• 6 Tiered Packages</span>
              </h2>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Best NGN Exchange Rates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    id={`coin-pkg-${pkg.id}`}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/80 shadow-xl shadow-amber-950/30 ring-1 ring-amber-500/50'
                        : pkg.popular
                        ? 'bg-zinc-900/90 border-pink-500/40 hover:border-pink-500/70'
                        : 'bg-zinc-900/60 border-zinc-800/90 hover:border-zinc-700'
                    }`}
                  >
                    {/* Badge */}
                    {pkg.badge && (
                      <span className={`absolute -top-2.5 right-4 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow ${
                        pkg.popular
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                          : pkg.bestValue
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}>
                        {pkg.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-extrabold text-base text-white group-hover:text-amber-300 transition-colors">
                          {pkg.name}
                        </h3>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-700'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Coin Amount Display */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-black text-amber-400 flex items-center gap-1.5 font-mono">
                          <Coins className="w-5 h-5" />
                          {pkg.totalCoins.toLocaleString()}
                        </span>
                        <span className="text-xs text-zinc-400 font-semibold">Coins</span>
                      </div>

                      {pkg.bonusCoins > 0 ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] font-bold mb-3">
                          <Sparkles className="w-3 h-3" />
                          <span>Includes +{pkg.bonusCoins.toLocaleString()} Bonus Free</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-500 mb-3">Standard tier starter rate</div>
                      )}

                      <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Bottom Pricing Row */}
                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-400 block uppercase font-medium">Price in Naira</span>
                        <span className="text-lg font-black text-white font-mono">
                          ₦{pkg.priceNgn.toLocaleString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPackage(pkg);
                          handleInitiatePayment();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-black shadow-md hover:bg-amber-300'
                            : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                        }`}
                      >
                        Select & Pay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Test Cards Information Helper Card */}
            <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/80 text-xs space-y-2">
              <div className="flex items-center gap-2 text-zinc-300 font-bold">
                <Info className="w-4 h-4 text-[#00C3F7]" />
                <span>Paystack Test Mode Helper Credentials:</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                StreamFlow is currently configured in <strong className="text-white">Paystack Test Mode</strong>. You can test successful card payments using test card <span className="font-mono text-emerald-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">4084 0841 1111 1111</span> (Expiry: 12/28, CVV: 408, OTP: 12345). You can also simulate declined transactions to test failure handling.
              </p>
            </div>
          </div>

          {/* Right 1 Col: Checkout Summary & Paystack Pay Button */}
          <div className="space-y-4">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sticky top-20 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#00C3F7]" />
                  Order Summary
                </h3>
                <span className="text-[11px] text-zinc-500 font-mono">Secured</span>
              </div>

              {selectedPackage ? (
                <div className="py-4 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Selected Package:</span>
                    <strong className="text-white font-bold">{selectedPackage.name}</strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Base Coins:</span>
                    <span className="font-mono text-zinc-200">{selectedPackage.coins.toLocaleString()}</span>
                  </div>

                  {selectedPackage.bonusCoins > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pink-400 font-medium">Bonus Free Coins:</span>
                      <span className="font-mono font-bold text-pink-400">+{selectedPackage.bonusCoins.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                    <span className="text-zinc-300 font-semibold">Total Credited Coins:</span>
                    <span className="font-mono font-black text-amber-400 text-sm flex items-center gap-1">
                      <Coins className="w-4 h-4" />
                      {selectedPackage.totalCoins.toLocaleString()}
                    </span>
                  </div>

                  {/* Customer Email Input */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Paystack Receipt Email
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00C3F7] transition-colors"
                      required
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Paystack transaction confirmation & receipt will be sent here.
                    </p>
                  </div>

                  {/* Total to Pay */}
                  <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Amount</span>
                      <span className="text-xs text-zinc-500">Nigerian Naira (NGN)</span>
                    </div>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      ₦{selectedPackage.priceNgn.toLocaleString()}
                    </div>
                  </div>

                  {/* Pay with Paystack CTA */}
                  <button
                    type="button"
                    onClick={handleInitiatePayment}
                    disabled={isInitializing}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00C3F7] via-[#0BA4DB] to-[#0092c7] hover:opacity-95 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00C3F7]/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isInitializing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Initializing Paystack...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay ₦{selectedPackage.priceNgn.toLocaleString()} with Paystack</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Automatic verification & anti-duplicate crediting protection.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Please select a coin package from the list to view order details.
                </div>
              )}
            </div>

            {/* Quick Virtual Gifts Preview */}
            <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 text-xs">
              <div className="font-bold text-zinc-300 mb-2 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-pink-400" />
                <span>What you can do with coins:</span>
              </div>
              <ul className="space-y-1.5 text-zinc-400 text-[11px]">
                <li>• 🌹 <strong>Cosmic Rose</strong> (5 Coins) — Show love in chat</li>
                <li>• 🎆 <strong>Neon Fireworks</strong> (99 Coins) — Light up the stream</li>
                <li>• 🏎️ <strong>Cyber Roadster</strong> (499 Coins) — Drive onto creator's stage</li>
                <li>• 🐉 <strong>Golden Dragon</strong> (2,999 Coins) — Full arena celebration & PK victory boost</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTION HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Paystack Transaction History</span>
                <span className="text-xs text-zinc-500 font-normal">({transactions.length} Records)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                All Paystack payment references, verification timestamps, and wallet credit logs.
              </p>
            </div>

            <button
              onClick={refreshHistory}
              disabled={isLoadingTxns}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTxns ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Anti-Double Credit Guarantee Banner */}
          <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 flex items-start gap-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white mb-0.5">Double-Credit Prevention Active</h4>
              <p className="text-zinc-400 leading-relaxed">
                StreamFlow’s backend verifies each transaction amount with Paystack and permanently locks the reference once credited. Clicking "Check Verification" on an already credited transaction demonstrates that duplicate credits are strictly rejected.
              </p>
            </div>
          </div>

          {/* Transactions Table / List */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No Paystack transactions found for your account yet. Purchase a package to see history here!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Paystack Reference</th>
                      <th className="py-3 px-4">Package</th>
                      <th className="py-3 px-4">Amount (NGN)</th>
                      <th className="py-3 px-4">Coins Credited</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Credited Status</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {transactions.map((txn) => {
                      const isVerifying = verifyingRef === txn.reference;
                      return (
                        <tr key={txn.reference} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-zinc-200">
                            <div className="flex items-center gap-1.5">
                              <span>{txn.reference}</span>
                              <button
                                onClick={() => handleCopy(txn.reference)}
                                className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded transition-colors"
                                title="Copy Reference"
                              >
                                {copiedRef === txn.reference ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-zinc-500 block">
                              Channel: {txn.channel || 'Paystack'} {txn.isTestMode && '• Test'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white block">{txn.packageName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{txn.userEmail}</span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            ₦{txn.amountNgn.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            <span className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" />
                              +{txn.totalCoins.toLocaleString()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              txn.status === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : txn.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {txn.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {txn.credited ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Credited
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Pending Credit
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                            {new Date(txn.paidAt || txn.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleManualVerify(txn.reference)}
                              disabled={isVerifying}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                txn.credited
                                  ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                              }`}
                              title={txn.credited ? 'Verify protection against double credit' : 'Check payment status'}
                            >
                              {isVerifying ? (
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin" /> Verifying...
                                </span>
                              ) : txn.credited ? (
                                'Check Security'
                              ) : (
                                'Verify Now'
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paystack Checkout Modal */}
      {selectedPackage && (
        <PaystackCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          coinPackage={selectedPackage}
          userEmail={userEmail}
          reference={checkoutReference}
          authorizationUrl={checkoutAuthUrl}
          isTestMode={isTestMode}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
