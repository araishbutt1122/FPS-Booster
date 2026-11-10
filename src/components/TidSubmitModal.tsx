import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  Crown,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Coins,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { ProPackage, PaymentMethodType } from '../types.ts';
import { useBooster, JAZZCASH_NUMBER, EASYPAISA_NUMBER, BINANCE_PAY_ID } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { JazzCashLogo, EasypaisaLogo, BinanceLogo } from './PaymentLogos.tsx';

interface TidSubmitModalProps {
  pkg: ProPackage;
  onClose: () => void;
}

export const TidSubmitModal: React.FC<TidSubmitModalProps> = ({ pkg, onClose }) => {
  const { submitTransaction, state } = useBooster();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('jazzcash');
  const [tid, setTid] = useState('');
  const [senderName, setSenderName] = useState('');
  const [phone, setPhone] = useState('');
  const [screenshotName, setScreenshotName] = useState<string | undefined>();
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<'form' | 'checking' | 'approved' | 'rejected'>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState(120);

  // If user becomes PRO while waiting, transition to approved
  useEffect(() => {
    if (state.isPro && submissionState === 'checking') {
      setSubmissionState('approved');
    }
  }, [state.isPro, submissionState]);

  // 2-minute auto check countdown
  useEffect(() => {
    if (submissionState !== 'checking') return;

    const timer = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submissionState]);

  const handleCopy = (text: string, key: string) => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeepLink = () => {
    sound.playBoost();
    if (selectedMethod === 'jazzcash') {
      window.location.href = `jazzcash://transfer?number=${JAZZCASH_NUMBER}&amount=${pkg.pricePkr}`;
    } else if (selectedMethod === 'easypaisa') {
      window.location.href = `easypaisa://transfer?number=${EASYPAISA_NUMBER}&amount=${pkg.pricePkr}`;
    } else if (selectedMethod === 'binance') {
      window.open(`https://app.binance.com/qr/dop${BINANCE_PAY_ID}`, '_blank');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setScreenshotPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      sound.playClick();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTid = tid.trim();
    if (!trimmedTid || trimmedTid.length < 5) {
      setErrorMessage('Invalid TID: Please enter valid transaction ID');
      return;
    }

    setIsSubmitting(true);
    const res = await submitTransaction({
      packageId: pkg.id,
      packageName: pkg.name,
      amount: pkg.pricePkr,
      method: selectedMethod,
      tid: trimmedTid,
      senderName: senderName || 'Verified Gamer',
      phone: phone.trim() || 'User Account',
      screenshotUrl: screenshotPreview || undefined,
      screenshotName,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setSubmissionState('checking');
  };

  const formatSec = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#071333] border-2 border-amber-500/80 rounded-3xl p-5 shadow-2xl shadow-cyan-900/80 relative text-slate-200 max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-900/70 border border-slate-700 cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {submissionState === 'form' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {/* Package Summary Header */}
            <div className="text-center pb-2 border-b border-cyan-950">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-300 text-xs font-bold mb-1">
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>{pkg.name} • Rs. {pkg.pricePkr}</span>
              </div>
              <h3 className="font-orbitron font-extrabold text-base text-white">
                Payment Verification
              </h3>
              {/* Mandatory Prompt Requirement */}
              <div className="mt-1 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-bold">
                ⚠️ Payment ke baad Screenshot Upload karo aur TID likho
              </div>
            </div>

            {/* STRICTLY 3 PAYMENT METHOD BUTTONS WITH REAL OFFICIAL LOGOS */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* 1. JazzCash */}
              <button
                type="button"
                onClick={() => { sound.playClick(); setSelectedMethod('jazzcash'); }}
                className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 cursor-pointer relative overflow-hidden ${
                  selectedMethod === 'jazzcash'
                    ? 'bg-gradient-to-b from-[#2a0608] to-[#120203] border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-1 ring-red-400'
                    : 'bg-[#040e24] border-slate-800 hover:border-red-900/60'
                }`}
              >
                <div className="w-full h-9 flex items-center justify-center p-1 bg-white/10 rounded-xl mb-1 border border-white/10">
                  <JazzCashLogo size="sm" />
                </div>
                <span className="text-[11px] font-bold font-orbitron text-white mt-0.5">JazzCash</span>
                <span className="text-[9px] text-red-400/90 font-mono">Send Money</span>
              </button>

              {/* 2. Easypaisa */}
              <button
                type="button"
                onClick={() => { sound.playClick(); setSelectedMethod('easypaisa'); }}
                className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 cursor-pointer relative overflow-hidden ${
                  selectedMethod === 'easypaisa'
                    ? 'bg-gradient-to-b from-[#022115] to-[#01110a] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400'
                    : 'bg-[#040e24] border-slate-800 hover:border-emerald-900/60'
                }`}
              >
                <div className="w-full h-9 flex items-center justify-center p-1 bg-white/10 rounded-xl mb-1 border border-white/10">
                  <EasypaisaLogo size="sm" />
                </div>
                <span className="text-[11px] font-bold font-orbitron text-white mt-0.5">Easypaisa</span>
                <span className="text-[9px] text-emerald-400/90 font-mono">Send Money</span>
              </button>

              {/* 3. Binance Pay */}
              <button
                type="button"
                onClick={() => { sound.playClick(); setSelectedMethod('binance'); }}
                className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 cursor-pointer relative overflow-hidden ${
                  selectedMethod === 'binance'
                    ? 'bg-gradient-to-b from-[#2a2205] to-[#120e01] border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] ring-1 ring-yellow-400'
                    : 'bg-[#040e24] border-slate-800 hover:border-yellow-900/60'
                }`}
              >
                <div className="w-full h-9 flex items-center justify-center p-1 bg-white/10 rounded-xl mb-1 border border-white/10">
                  <BinanceLogo size="sm" />
                </div>
                <span className="text-[11px] font-bold font-orbitron text-white mt-0.5">Binance Pay</span>
                <span className="text-[9px] text-yellow-400/90 font-mono">Pay ID</span>
              </button>
            </div>

            {/* METHOD-SPECIFIC FLOW BOX WITH EXACT ACCOUNTS & COPY BUTTONS */}
            <div className="p-3.5 rounded-2xl bg-[#040c1f] border border-cyan-900/60 space-y-2.5">
              {/* JazzCash Flow */}
              {selectedMethod === 'jazzcash' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-bold text-red-400 font-mono">
                        Method: Send Money via JazzCash App
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeepLink}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold font-mono flex items-center space-x-1 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Open App</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">JazzCash Number:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white text-sm select-all tracking-wider font-mono">
                          {JAZZCASH_NUMBER}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(JAZZCASH_NUMBER, 'jc_num')}
                          className="px-2 py-0.5 rounded bg-red-950/80 border border-red-600/60 text-red-300 hover:bg-red-900 text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                          title="Copy JazzCash Number"
                        >
                          {copiedKey === 'jc_num' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Number</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Amount to Send:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-amber-400 text-sm">Rs. {pkg.pricePkr}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`${pkg.pricePkr}`, 'jc_amt')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                        >
                          {copiedKey === 'jc_amt' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Amount</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Easypaisa Flow */}
              {selectedMethod === 'easypaisa' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        Method: Send Money via Easypaisa App
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeepLink}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold font-mono flex items-center space-x-1 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Open App</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Easypaisa Number:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white text-sm select-all tracking-wider font-mono">
                          {EASYPAISA_NUMBER}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(EASYPAISA_NUMBER, 'ep_num')}
                          className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 hover:bg-emerald-900 text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                          title="Copy Easypaisa Number"
                        >
                          {copiedKey === 'ep_num' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Number</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Amount to Send:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-amber-400 text-sm">Rs. {pkg.pricePkr}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`${pkg.pricePkr}`, 'ep_amt')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                        >
                          {copiedKey === 'ep_amt' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Amount</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Binance Pay Flow */}
              {selectedMethod === 'binance' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="text-xs font-bold text-yellow-400 font-mono">
                        Method: Send via Binance Pay
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeepLink}
                      className="px-2.5 py-1 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-black text-[11px] font-bold font-mono flex items-center space-x-1 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Open Binance</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Binance Pay ID:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-yellow-300 text-sm select-all tracking-wider font-mono">
                          {BINANCE_PAY_ID}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(BINANCE_PAY_ID, 'bin_id')}
                          className="px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-600/60 text-yellow-300 hover:bg-yellow-900 text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                          title="Copy Binance Pay ID"
                        >
                          {copiedKey === 'bin_id' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy ID</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Approx Amount:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-amber-400 text-sm">
                          ${(pkg.pricePkr / 280).toFixed(2)} USDT <span className="text-[10px] text-slate-400">(Rs. {pkg.pricePkr})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`${(pkg.pricePkr / 280).toFixed(2)}`, 'bin_amt')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                        >
                          {copiedKey === 'bin_amt' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Amount</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ERROR ALERT */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-bold flex items-center space-x-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TID SUBMISSION FORM */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
                  Transaction ID (TID) / TxHash *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 94827103841"
                  value={tid}
                  onChange={(e) => setTid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-900 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
                    Sender Phone / Account *
                  </label>
                  <input
                    type="text"
                    placeholder="03009876543"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-900 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Gamer Name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Upload screenshot */}
              <div>
                <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
                  Payment Screenshot (Required for Instant Verification)
                </label>
                <label className="w-full border border-dashed border-cyan-700 hover:border-cyan-400 rounded-xl p-2.5 flex items-center justify-center space-x-2 cursor-pointer bg-slate-900/60 text-xs text-slate-300">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="truncate max-w-[200px] text-[11px] font-medium">
                    {screenshotName || 'Tap to Upload Screenshot'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {screenshotPreview && (
                  <div className="mt-1.5 flex items-center space-x-2 p-1.5 rounded-lg bg-slate-900 border border-cyan-950">
                    <img 
                      src={screenshotPreview} 
                      alt="Receipt Preview" 
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div className="text-[10px] text-slate-300">
                      <span className="text-emerald-400 font-bold block">✓ Screenshot Attached</span>
                      <span className="text-slate-500">{screenshotName}</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-400/30 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50"
              >
                <span>Submit &amp; Activate PRO</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* 3. USER SIDE PAYMENT: CHECKING SCREEN */}
        {submissionState === 'checking' && (
          <div className="text-center py-6 space-y-4 my-auto animate-fade-in">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-400/20 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/50">
                <Clock className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="font-orbitron font-black text-lg text-white">
                Payment Submitted
              </h3>
              <p className="text-xs text-amber-300 font-mono font-bold mt-1">
                Auto Checking... 2 Min Wait Karein
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                System is validating TID <span className="text-cyan-300 font-mono font-bold">{tid}</span> against gateway ledger.
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#030e24] border border-cyan-500 text-cyan-300 font-mono text-sm font-bold shadow-lg">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Verifying ({formatSec(countdownSec)})</span>
            </div>

            <div className="p-3 bg-[#030919] rounded-2xl border border-cyan-950 text-left text-xs space-y-1 font-mono max-w-xs mx-auto">
              <div className="flex justify-between text-slate-300">
                <span>Package:</span>
                <span className="text-amber-400 font-bold">{pkg.name}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Method:</span>
                <span className="text-white font-bold uppercase">{selectedMethod}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Status:</span>
                <span className="text-amber-300 font-bold animate-pulse">PENDING - Auto Checking...</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-slate-700 cursor-pointer"
            >
              Close &amp; Wait in Background
            </button>
          </div>
        )}

        {/* 3. USER SIDE PAYMENT: APPROVED SCREEN */}
        {submissionState === 'approved' && (
          <div className="text-center py-6 space-y-4 my-auto animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-2xl shadow-emerald-500/50 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <h3 className="font-orbitron font-black text-xl text-white">
                Payment Verified!
              </h3>
              <p className="text-sm text-emerald-400 font-bold mt-1">
                PRO Activated!
              </p>
              <p className="text-xs text-slate-300 mt-1">
                120 FPS Extreme &amp; VIP Perks unlocked permanently for your device.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-400/40 cursor-pointer"
            >
              Enjoy 120 FPS Gaming Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

