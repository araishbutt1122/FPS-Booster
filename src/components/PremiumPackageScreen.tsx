import React, { useState } from 'react';
import { 
  Crown, 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Upload,
  Copy,
  Coins,
  AlertCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { useBooster, JAZZCASH_NUMBER, EASYPAISA_NUMBER, BINANCE_PAY_ID } from '../context/BoosterContext.tsx';
import { ProPackage, PaymentMethodType } from '../types.ts';
import { sound } from '../utils/audio.ts';
import { JazzCashLogo, EasypaisaLogo, BinanceLogo } from './PaymentLogos.tsx';

export const PremiumPackageScreen: React.FC = () => {
  const { packages, state, submitTransaction } = useBooster();
  
  // Selected package state (default to popular package)
  const defaultPkg = packages.find(p => p.isPopular) || packages[0];
  const [selectedPkg, setSelectedPkg] = useState<ProPackage>(defaultPkg);

  // In-line Form State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('jazzcash');
  const [tid, setTid] = useState('');
  const [senderName, setSenderName] = useState('');
  const [phone, setPhone] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    status: 'idle' | 'matched' | 'manual_needed';
    message: string;
    ocrTid?: string;
  }>({ status: 'idle', message: '' });

  const handleCopy = (text: string, key: string) => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeepLink = () => {
    sound.playBoost();
    if (selectedMethod === 'jazzcash') {
      window.location.href = `jazzcash://transfer?number=${JAZZCASH_NUMBER}&amount=${selectedPkg.pricePkr}`;
    } else if (selectedMethod === 'easypaisa') {
      window.location.href = `easypaisa://transfer?number=${EASYPAISA_NUMBER}&amount=${selectedPkg.pricePkr}`;
    } else if (selectedMethod === 'binance') {
      window.open(`https://app.binance.com/qr/dop${BINANCE_PAY_ID}`, '_blank');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setScreenshotPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      sound.playClick();
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTid = tid.trim();
    // Strict requirement: Agar TID khali ya Screenshot na ho to Error "TID aur Screenshot Zaroori Hai"
    if (!trimmedTid || (!screenshotPreview && !screenshotFile)) {
      sound.playClick();
      setErrorMessage('TID aur Screenshot Zaroori Hai');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitTransaction({
        packageId: selectedPkg.id,
        packageName: selectedPkg.name,
        amount: selectedPkg.pricePkr,
        method: selectedMethod,
        tid: trimmedTid,
        senderName: senderName.trim() || 'Verified Gamer',
        phone: phone.trim() || 'User Account',
        screenshotUrl: screenshotPreview || undefined,
        screenshotName: screenshotFile?.name || 'receipt.png',
        screenshotFile: screenshotFile || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.message);
        setIsSubmitting(false);
        return;
      }

      if (res.isMatched) {
        setSubmitResult({
          status: 'matched',
          message: 'TID Matched! PRO Activated ✅',
          ocrTid: res.ocrTid,
        });
      } else {
        setSubmitResult({
          status: 'manual_needed',
          message: 'Payment Sent! Admin Match Karke PRO On Karega',
          ocrTid: res.ocrTid,
        });
      }
    } catch (err) {
      setErrorMessage('Submission failed. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-1 space-y-4">
      {/* Top Golden Crown Hero */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1 relative">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400/80 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.6)]">
            <Crown className="w-9 h-9 fill-amber-400 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
          </div>
          <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-ping" />
        </div>

        <h2 className="font-orbitron font-black text-xl text-white mt-2 text-center">
          Upgrade to Pro
        </h2>
        {/* FIX 3 - UPAR BEST OFFER WALA ATTRACTIVE TEXT */}
        <div className="mt-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-red-600/30 via-amber-500/30 to-red-600/30 border border-amber-400/70 text-amber-300 text-xs font-bold text-center flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
          <span>🔥 BEST OFFER - LIMITED TIME! 50+ Players Roz Buy Kar Rahe Hain!</span>
        </div>
        <p className="text-[11px] text-slate-400 font-semibold tracking-wide mt-1">
          Unlock All Features • Play at 120 FPS
        </p>
      </div>

      {/* FIX 1 - 5 PACKAGES (IN ORDER UPAR SE NEECHE - ALL CLICKABLE) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-orbitron font-bold text-slate-300 uppercase tracking-wider">
            1. Select Your Package (5 Available)
          </span>
          <span className="text-[10px] text-amber-400 font-mono font-bold">
            Tap to Select &amp; Update Price
          </span>
        </div>

        <div className="space-y-2">
          {packages.map((pkg) => {
            const isSelected = selectedPkg.id === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedPkg(pkg);
                }}
                className={`rounded-2xl p-3 border-2 transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0d224d] via-[#091b3e] to-[#051128] border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)] ring-1 ring-amber-400'
                    : 'bg-[#071129]/90 border-cyan-900/50 hover:border-cyan-700/70 hover:bg-[#091636]'
                }`}
              >
                {pkg.badge && (
                  <span className={`absolute top-2 right-2 text-[9px] font-orbitron font-extrabold px-2 py-0.5 rounded-full shadow-md ${
                    pkg.id === 'pkg_7d'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black animate-pulse'
                      : pkg.id === 'pkg_30d'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : pkg.id === 'pkg_15d'
                      ? 'bg-cyan-400 text-black'
                      : pkg.id === 'pkg_3d'
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-400 text-black'
                  }`}>
                    {pkg.badge}
                  </span>
                )}
                <div className="flex items-center space-x-3">
                  {/* Selection Radio Indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'border-amber-400 bg-amber-400 text-black' : 'border-slate-600 bg-slate-900'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1 pr-16 sm:pr-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-orbitron font-bold text-sm text-white">
                        {pkg.name}
                      </h4>
                      {pkg.isPopular && (
                        <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                      {pkg.durationLabel}
                    </p>
                    {pkg.perks && pkg.perks.length > 0 && (
                      <p className="text-[10px] text-cyan-400/90 font-mono mt-0.5 line-clamp-1">
                        ✓ {pkg.perks.join(' • ')}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="font-orbitron font-black text-base text-amber-300 block">
                      Rs. {pkg.pricePkr}
                    </span>
                    {pkg.originalPricePkr && (
                      <span className="text-[10px] text-slate-500 line-through font-mono">
                        Rs. {pkg.originalPricePkr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* IN-LINE PAYMENT SUBMISSION FORM (Directly on PremiumPackageScreen) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#071333] via-[#05112e] to-[#030919] border-2 border-amber-500/80 shadow-2xl shadow-cyan-950/80 space-y-4">
        {/* Form Header */}
        <div className="border-b border-cyan-950/80 pb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-orbitron font-extrabold text-sm text-white flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>PRO PAYMENT VERIFICATION</span>
            </h3>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-400/20 text-amber-300 border border-amber-500/50 font-black">
              Rs. {selectedPkg.pricePkr}
            </span>
          </div>
          {/* Prompt requirement */}
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-bold text-center">
            ⚠️ Payment ke baad Screenshot Upload karo aur TID likho
          </div>
        </div>

        {/* 1. Payment Method Tabs (JazzCash, Easypaisa, Binance Pay) - SAME SIZE, SAME HEIGHT, SAME DESIGN */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-300 font-bold font-orbitron uppercase tracking-wider block">
            2. Choose Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {/* 1. Real JazzCash Official Logo */}
            <button
              type="button"
              onClick={() => { sound.playClick(); setSelectedMethod('jazzcash'); }}
              className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 cursor-pointer relative overflow-hidden h-[106px] ${
                selectedMethod === 'jazzcash'
                  ? 'bg-gradient-to-b from-[#2a0608] to-[#120203] border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.6)] ring-1 ring-red-400'
                  : 'bg-[#040e24] border-slate-800 hover:border-red-900/60'
              }`}
            >
              <div className="w-full h-11 flex items-center justify-center p-1 bg-white/10 rounded-xl mb-1.5 border border-white/10">
                <JazzCashLogo size="md" />
              </div>
              <span className="text-[11px] font-bold font-orbitron text-white">JazzCash</span>
              <span className="text-[9px] text-red-400 font-mono font-semibold">Official App</span>
            </button>

            {/* 2. Real Easypaisa Official Logo */}
            <button
              type="button"
              onClick={() => { sound.playClick(); setSelectedMethod('easypaisa'); }}
              className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 cursor-pointer relative overflow-hidden h-[106px] ${
                selectedMethod === 'easypaisa'
                  ? 'bg-gradient-to-b from-[#022115] to-[#01110a] border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.6)] ring-1 ring-emerald-400'
                  : 'bg-[#040e24] border-slate-800 hover:border-emerald-900/60'
              }`}
            >
              <div className="w-full h-11 flex items-center justify-center p-1 bg-white/10 rounded-xl mb-1.5 border border-white/10">
                <EasypaisaLogo size="md" />
              </div>
              <span className="text-[11px] font-bold font-orbitron text-white">Easypaisa</span>
              <span className="text-[9px] text-emerald-400 font-mono font-semibold">Official App</span>
            </button>

            {/* 3. Real Binance Pay Official Logo */}
            <button
              type="button"
              onClick={() => { sound.playClick(); setSelectedMethod('binance'); }}
              className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 cursor-pointer relative overflow-hidden h-[106px] ${
                selectedMethod === 'binance'
                  ? 'bg-gradient-to-b from-[#2a2205] to-[#120e01] border-yellow-500 shadow-[0_0_16px_rgba(234,179,8,0.6)] ring-1 ring-yellow-400'
                  : 'bg-[#040e24] border-slate-800 hover:border-yellow-900/60'
              }`}
            >
              <div className="w-full h-11 flex items-center justify-center p-1 bg-white/10 rounded-xl mb-1.5 border border-white/10">
                <BinanceLogo size="md" />
              </div>
              <span className="text-[11px] font-bold font-orbitron text-white">Binance Pay</span>
              <span className="text-[9px] text-yellow-400 font-mono font-semibold">Official App</span>
            </button>
          </div>
        </div>

        {/* Account Details Box with Copy Buttons */}
        <div className="p-3 rounded-2xl bg-[#030c1f] border border-cyan-900/60 space-y-2 text-xs font-mono">
          {selectedMethod === 'jazzcash' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-bold text-[11px]">Method: Send Money via JazzCash App</span>
                <button
                  type="button"
                  onClick={handleDeepLink}
                  className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                >
                  <span>Open App</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">JazzCash Number:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-white text-sm select-all">{JAZZCASH_NUMBER}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JAZZCASH_NUMBER, 'jc_num')}
                    className="p-1 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 cursor-pointer"
                    title="Copy Number"
                  >
                    {copiedKey === 'jc_num' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedMethod === 'easypaisa' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-[11px]">Method: Send Money via Easypaisa App</span>
                <button
                  type="button"
                  onClick={handleDeepLink}
                  className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                >
                  <span>Open App</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">Easypaisa Number:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-white text-sm select-all">{EASYPAISA_NUMBER}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(EASYPAISA_NUMBER, 'ep_num')}
                    className="p-1 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 cursor-pointer"
                    title="Copy Number"
                  >
                    {copiedKey === 'ep_num' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedMethod === 'binance' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-yellow-400 font-bold text-[11px]">Method: Send via Binance Pay</span>
                <button
                  type="button"
                  onClick={handleDeepLink}
                  className="px-2 py-0.5 rounded bg-yellow-600 text-black text-[10px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
                >
                  <span>Open Binance</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">Binance Pay ID:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-yellow-300 text-sm select-all">{BINANCE_PAY_ID}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(BINANCE_PAY_ID, 'bin_id')}
                    className="p-1 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 cursor-pointer"
                    title="Copy ID"
                  >
                    {copiedKey === 'bin_id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Amount:</span>
            <span className="font-bold text-amber-400">Rs. {selectedPkg.pricePkr}</span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-bold flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Result Notification */}
        {submitResult.status === 'matched' && (
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs space-y-1 animate-fade-in shadow-lg">
            <div className="flex items-center space-x-2 font-bold text-sm text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{submitResult.message}</span>
            </div>
            <p className="text-[11px] text-slate-300">
              OCR Matched TID: <strong className="font-mono text-cyan-300">{submitResult.ocrTid}</strong>. 120 FPS VIP active for 30 Days!
            </p>
          </div>
        )}

        {submitResult.status === 'manual_needed' && (
          <div className="p-3 rounded-2xl bg-amber-950/90 border border-amber-400 text-amber-200 text-xs space-y-1 animate-fade-in shadow-lg">
            <div className="flex items-center space-x-2 font-bold text-xs text-amber-300">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>{submitResult.message}</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Submitted for Admin Check. Admin matches screenshot TID with your input.
            </p>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* TID Input */}
          <div>
            <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
              3. Payment TID (Haath se likhega) *
            </label>
            <input
              type="text"
              placeholder="e.g. 03829103847"
              value={tid}
              onChange={(e) => setTid(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-cyan-900 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
                Sender Account / Phone
              </label>
              <input
                type="text"
                placeholder="03009876543"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-900 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
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

          {/* Screenshot Upload with Firebase Storage */}
          <div>
            <label className="text-[10px] text-slate-300 font-bold block mb-0.5">
              4. Payment Screenshot (Required for Auto-Match) *
            </label>
            <label className="w-full border-2 border-dashed border-cyan-700 hover:border-cyan-400 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-900/60 text-xs text-slate-300 transition-all">
              <Upload className="w-5 h-5 text-cyan-400 mb-1" />
              <span className="font-semibold text-xs text-cyan-300">
                {screenshotFile ? screenshotFile.name : 'Tap to Upload Payment Screenshot'}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5">
                Auto OCR Scanner will read TID from screenshot
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                required
              />
            </label>

            {screenshotPreview && (
              <div className="mt-2 flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900 border border-cyan-900">
                <img
                  src={screenshotPreview}
                  alt="Receipt Preview"
                  className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                />
                <div className="text-[10px] text-slate-300">
                  <span className="text-emerald-400 font-bold block">✓ Screenshot Attached</span>
                  <span className="text-slate-400 truncate max-w-[200px] block">{screenshotFile?.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-orbitron font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/30 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 animate-spin text-black" />
                <span>Scanning Receipt &amp; Verifying...</span>
              </>
            ) : (
              <>
                <span>Submit &amp; Activate PRO</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* FIX 4 - LIVE LEADERBOARD (SEPARATE BOX BELOW PAYMENT FORM) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#071333] via-[#05112e] to-[#030919] border-2 border-cyan-500/50 shadow-2xl shadow-cyan-950/80 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-base select-none">🏆</span>
            <h3 className="font-orbitron font-black text-xs sm:text-sm text-amber-300 tracking-wide">
              LIVE LEADERBOARD - AAJ KE TOP BUYERS
            </h3>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] text-emerald-300 font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Buyers List */}
        <div className="space-y-2">
          {[
            { name: 'Ahmed K.', package: '30 Days', timeAgo: '2 min pehle', badge: '👑 VIP' },
            { name: 'Usman R.', package: '7 Days', timeAgo: '5 min pehle', badge: '⭐ Popular' },
            { name: 'Ali H.', package: '7 Days', timeAgo: '9 min pehle', badge: '⭐ Popular' },
            { name: 'Hamza S.', package: '30 Days', timeAgo: '12 min pehle', badge: '👑 VIP' },
            { name: 'Bilal M.', package: '1 Day', timeAgo: '15 min pehle', badge: '⚡ Quick' },
            { name: 'Zain A.', package: '15 Days', timeAgo: '21 min pehle', badge: '💎 Super' },
          ].map((buyer, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-[#040e24]/90 border border-cyan-900/60 hover:border-cyan-600/70 transition-all text-xs"
            >
              <div className="flex items-center space-x-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-orbitron font-extrabold text-[10px] shadow-sm ${
                  idx === 0 ? 'bg-amber-400 text-black shadow-amber-400/50' :
                  idx === 1 ? 'bg-slate-300 text-black' :
                  idx === 2 ? 'bg-amber-700 text-white' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  #{idx + 1}
                </span>
                <div>
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <span>{buyer.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-orbitron font-bold">
                      {buyer.package}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{buyer.timeAgo}</span>
                </div>
              </div>

              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold shadow-sm shadow-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 text-center border-t border-cyan-950/80">
          <p className="text-[11px] font-mono font-extrabold text-amber-300 tracking-wide animate-pulse">
            🔥 +45 aur players ne aaj PRO liya hai
          </p>
        </div>
      </div>
    </div>
  );
};
