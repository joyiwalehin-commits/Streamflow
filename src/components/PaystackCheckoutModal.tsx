import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Building2, 
  Smartphone, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ExternalLink,
  Coins,
  Copy,
  Check
} from 'lucide-react';
import { CoinPackage, PaystackTransaction } from '../types';
import { verifyPaystackPayment, simulateTestPayment } from '../services/paystack';

interface PaystackCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  coinPackage: CoinPackage;
  userEmail: string;
  reference: string;
  authorizationUrl?: string | null;
  isTestMode: boolean;
  onPaymentSuccess: (transaction: PaystackTransaction, coinsAdded: number) => void;
}

export const PaystackCheckoutModal: React.FC<PaystackCheckoutModalProps> = ({
  isOpen,
  onClose,
  coinPackage,
  userEmail,
  reference,
  authorizationUrl,
  isTestMode,
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'ussd'>('card');
  const [testCardType, setTestCardType] = useState<'success' | 'decline' | 'custom'>('success');
  const [cardNumber, setCardNumber] = useState('4084 0841 1111 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('408');
  const [cardPin, setCardPin] = useState('1234');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'details' | 'otp' | 'processing' | 'success' | 'failed'>('details');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTxn, setSuccessTxn] = useState<PaystackTransaction | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  if (!isOpen) return null;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCardTypeSelect = (type: 'success' | 'decline' | 'custom') => {
    setTestCardType(type);
    if (type === 'success') {
      setCardNumber('4084 0841 1111 1111');
      setCardExpiry('12/28');
      setCardCvv('408');
    } else if (type === 'decline') {
      setCardNumber('4084 0841 0000 0000');
      setCardExpiry('12/28');
      setCardCvv('000');
    }
  };

  const handleInitiateCardAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStep('otp');
  };

  const handleCancelPayment = async () => {
    try {
      await simulateTestPayment({
        reference,
        channel: 'cancelled',
        outcome: 'cancel',
      });
    } catch (err) {
      // ignore
    }
    setErrorMessage('Payment cancelled by user. No coins were charged or added to your wallet.');
    setStep('failed');
  };

  const handleConfirmOtpAndPay = async () => {
    setStep('processing');
    setErrorMessage(null);

    try {
      if (testCardType === 'decline' || cardNumber.replace(/\s+/g, '').endsWith('0000')) {
        try {
          await simulateTestPayment({
            reference,
            channel: 'card (Paystack Test Mode)',
            outcome: 'decline',
          });
        } catch (err: any) {
          // Expected simulation decline
        }
        setErrorMessage('Test payment declined by bank: Insufficient funds or invalid test card. Zero coins were added to your wallet.');
        setStep('failed');
        return;
      }

      // If official authorization URL was provided and user wants verification
      if (authorizationUrl && !reference.startsWith('SF_TEST_SIM_')) {
        // Attempt verify
        const verifyRes = await verifyPaystackPayment({ reference });
        if (verifyRes.success && verifyRes.transaction) {
          setSuccessTxn(verifyRes.transaction);
          setStep('success');
          onPaymentSuccess(verifyRes.transaction, verifyRes.coinsAdded || coinPackage.totalCoins);
          return;
        } else if (verifyRes.alreadyCredited && verifyRes.transaction) {
          setSuccessTxn(verifyRes.transaction);
          setStep('success');
          return;
        }
      }

      // Test Mode Simulation Authorization
      const simRes = await simulateTestPayment({
        reference,
        channel: paymentMethod === 'card' ? 'Paystack Test Card' : paymentMethod === 'bank' ? 'Bank Transfer (NGN)' : 'USSD *737#',
        outcome: 'success',
      });

      if (simRes.success && simRes.transaction) {
        setSuccessTxn(simRes.transaction);
        setStep('success');
        onPaymentSuccess(simRes.transaction, simRes.coinsAdded || coinPackage.totalCoins);
      } else {
        setErrorMessage(simRes.message || 'Payment simulation failed');
        setStep('failed');
      }
    } catch (err: any) {
      console.error('Payment verification failed:', err);
      setErrorMessage(err.message || 'Failed to verify payment with Paystack.');
      setStep('failed');
    }
  };

  return (
    <div id="paystack-checkout-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paystack Official Brand Header */}
        <div className="bg-[#001C38] px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00C3F7]/10 border border-[#00C3F7]/30 flex items-center justify-center text-[#00C3F7]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span className="text-[#00C3F7]">paystack</span> checkout
                </span>
                {isTestMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    TEST MODE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">StreamFlow Global • {userEmail}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-400 font-medium">Amount to Pay</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              ₦{coinPackage.priceNgn.toLocaleString()}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test Mode Notification Strip */}
        {isTestMode && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Paystack Test Environment • No real money will be charged</span>
            </div>
            <button
              onClick={handleCopyRef}
              className="text-[11px] font-mono flex items-center gap-1 hover:underline text-amber-400"
              title="Click to copy Paystack reference"
            >
              {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{reference.slice(0, 14)}...</span>
            </button>
          </div>
        )}

        {/* Content body based on step */}
        <div className="p-5 overflow-y-auto max-h-[75vh]">
          {/* STEP 1: Details */}
          {step === 'details' && (
            <div>
              {/* Package Summary Box */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Coins className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{coinPackage.name}</h4>
                    <p className="text-xs text-zinc-400">
                      Receiving: <span className="text-amber-400 font-semibold">{coinPackage.totalCoins.toLocaleString()} Coins</span>
                      {coinPackage.bonusCoins > 0 && (
                        <span className="text-pink-400 ml-1.5">(+{coinPackage.bonusCoins} Bonus)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Currency</span>
                  <span className="text-xs font-bold text-zinc-200">NGN (₦)</span>
                </div>
              </div>

              {/* Hosted Checkout Redirect Button (if real paystack authorization URL available) */}
              {authorizationUrl && (
                <div className="mb-4 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-indigo-300">Official Paystack Hosted Page</div>
                      <div className="text-[11px] text-zinc-400">Open Paystack's official popup in a separate window</div>
                    </div>
                    <a
                      href={authorizationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#0BA4DB] hover:bg-[#0092c7] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <span>Pay on Paystack</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Payment Methods Tabs */}
              <div className="flex items-center gap-2 mb-4 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-zinc-800 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#00C3F7]" />
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    paymentMethod === 'bank'
                      ? 'bg-zinc-800 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Bank Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ussd')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    paymentMethod === 'ussd'
                      ? 'bg-zinc-800 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                  USSD (*737#)
                </button>
              </div>

              {/* CARD PAYMENT FORM */}
              {paymentMethod === 'card' && (
                <form onSubmit={handleInitiateCardAuth} className="space-y-3.5">
                  {/* Test Mode Preset Selector */}
                  {isTestMode && (
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs">
                      <div className="text-zinc-400 mb-2 font-medium">Select Paystack Test Card:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleCardTypeSelect('success')}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                            testCardType === 'success'
                              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <span>Mastercard (Success)</span>
                          {testCardType === 'success' && <Check className="w-3 h-3 text-emerald-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCardTypeSelect('decline')}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                            testCardType === 'decline'
                              ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-bold'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <span>Declined Card (Test)</span>
                          {testCardType === 'decline' && <Check className="w-3 h-3 text-rose-400" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4084 0841 1111 1111"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00C3F7] transition-colors"
                        required
                      />
                      <CreditCard className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Expires</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-[#00C3F7]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="408"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-[#00C3F7]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Card PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardPin}
                        onChange={(e) => setCardPin(e.target.value)}
                        placeholder="1234"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-[#00C3F7]"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00C3F7] to-[#0BA4DB] hover:opacity-95 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00C3F7]/20 transition-all cursor-pointer mt-4"
                  >
                    <span>Authorize ₦{coinPackage.priceNgn.toLocaleString()}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    className="w-full py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 text-xs font-semibold hover:bg-rose-950/20 transition-all cursor-pointer mt-2"
                  >
                    Cancel Payment (Abort & Do Not Add Coins)
                  </button>
                </form>
              )}

              {/* BANK TRANSFER VIEW */}
              {paymentMethod === 'bank' && (
                <div className="space-y-3">
                  <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs">
                    <div className="text-zinc-400 mb-1">Paystack Dynamic Virtual Account</div>
                    <div className="font-mono text-lg font-bold text-white mb-2">9928 1748 12</div>
                    <div className="text-zinc-400 flex items-center justify-between">
                      <span>Bank Name:</span>
                      <strong className="text-zinc-200">Titan Trust / Wema Bank</strong>
                    </div>
                    <div className="text-zinc-400 flex items-center justify-between mt-1">
                      <span>Beneficiary:</span>
                      <strong className="text-zinc-200">Paystack / StreamFlow</strong>
                    </div>
                    <div className="text-zinc-400 flex items-center justify-between mt-1">
                      <span>Amount:</span>
                      <strong className="text-emerald-400 font-mono">₦{coinPackage.priceNgn.toLocaleString()}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 text-center">
                    Transfer exactly ₦{coinPackage.priceNgn.toLocaleString()} to the test account above.
                  </p>

                  <button
                    type="button"
                    onClick={handleConfirmOtpAndPay}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>I Have Sent ₦{coinPackage.priceNgn.toLocaleString()}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* USSD VIEW */}
              {paymentMethod === 'ussd' && (
                <div className="space-y-3">
                  <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 mb-2">Dial the test USSD code on your mobile phone:</div>
                    <div className="font-mono text-xl font-black text-pink-400 bg-black/40 py-2.5 rounded-lg border border-zinc-800 mb-2">
                      *737*000*{coinPackage.priceNgn}#
                    </div>
                    <p className="text-[11px] text-zinc-400">Supported on GTBank, Zenith, Access, and First Bank</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmOtpAndPay}
                    className="w-full py-3 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Confirm USSD Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: 3D Secure / OTP Simulation */}
          {step === 'otp' && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#00C3F7]/10 border border-[#00C3F7]/30 text-[#00C3F7] mx-auto flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white">3D Secure Card Verification</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Paystack has sent a test One-Time Password (OTP) to the phone number linked with card <strong className="text-zinc-200">**** {cardNumber.slice(-4)}</strong>.
                </p>
              </div>

              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-center">
                <span className="text-xs text-zinc-400 block mb-1">Paystack Test Mode OTP:</span>
                <span className="font-mono font-bold text-sm text-emerald-400 bg-zinc-950 px-3 py-1 rounded border border-zinc-700">
                  12345
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Enter OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="12345"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-[#00C3F7]"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOtpAndPay}
                  className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-[#00C3F7] to-[#0BA4DB] text-black font-extrabold text-sm flex items-center justify-center gap-1.5 hover:opacity-95"
                >
                  <span>Verify & Pay ₦{coinPackage.priceNgn.toLocaleString()}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Processing & Backend Verification */}
          {step === 'processing' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 text-[#00C3F7] animate-spin mx-auto" />
              <div>
                <h4 className="font-bold text-base text-white">Communicating with Paystack...</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Verifying transaction amount (₦{coinPackage.priceNgn.toLocaleString()}) and securing transaction reference...
                </p>
              </div>
              <div className="text-[11px] font-mono text-zinc-500">
                Ref: {reference}
              </div>
            </div>
          )}

          {/* STEP 4: Success & Verified Coins Credited */}
          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center animate-in zoom-in-75">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Payment Verified
                </span>
                <h3 className="font-extrabold text-lg text-white mt-1">Coins Successfully Credited!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Paystack transaction has been verified on the server and credited to your wallet.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total Coins Added:</span>
                  <span className="font-extrabold text-amber-400 text-sm flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    +{coinPackage.totalCoins.toLocaleString()} Coins
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Amount Paid (NGN):</span>
                  <span className="font-bold text-white font-mono">₦{coinPackage.priceNgn.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Paystack Reference:</span>
                  <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[180px]">{reference}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Anti-Double Credit:</span>
                  <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Locked & Credited
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95 cursor-pointer"
              >
                Done • Return to StreamFlow
              </button>
            </div>
          )}

          {/* STEP 5: Failed State */}
          {step === 'failed' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500 text-rose-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-bold text-base text-white">Payment Unsuccessful</h3>
                <p className="text-xs text-rose-400 mt-1 max-w-sm mx-auto">
                  {errorMessage || 'Paystack payment could not be completed.'}
                </p>
              </div>

              {/* Wallet Protection Confirmation */}
              <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-900/40 text-left text-xs text-rose-300">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Wallet Protected: 0 Coins Added</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Because this transaction was declined or cancelled, no coins were added to your StreamFlow wallet.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setTestCardType('success');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white"
                >
                  Try Again with Success Card
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="bg-zinc-900/60 px-5 py-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit SSL • PCI-DSS Certified</span>
          </div>
          <span>Powered by Paystack</span>
        </div>
      </div>
    </div>
  );
};
