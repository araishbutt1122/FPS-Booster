import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  X, 
  Copy, 
  Check, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  DollarSign,
  Users,
  Smartphone,
  Building,
  Coins,
  Send,
  ArrowUpRight
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { PaymentMethodType } from '../types.ts';
import { JazzCashLogo, EasypaisaLogo, BinanceLogo } from './PaymentLogos.tsx';

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { 
    transactions, 
    approveTransaction, 
    rejectTransaction, 
    adminStats,
    autoApproveEnabled,
    setAutoApproveEnabled,
    setSnackBarMessage
  } = useBooster();

  const [activeTab, setActiveTab] = useState<'wallet' | 'approvals'>('wallet');
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);
  const [showWithdrawNotice, setShowWithdrawNotice] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const pendingTransactions = transactions.filter(t => t.status === 'pending');

  const handleCopy = (text: string, key: string) => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setSnackBarMessage(`Copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getMethodBadge = (method: PaymentMethodType) => {
    switch (method) {
      case 'jazzcash':
        return <span className="text-[10px] bg-red-950 text-red-300 border border-red-700/60 px-1.5 py-0.5 rounded font-mono font-bold">JazzCash</span>;
      case 'easypaisa':
        return <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-mono font-bold">Easypaisa</span>;
      case 'binance':
        return <span className="text-[10px] bg-yellow-950 text-yellow-300 border border-yellow-700/60 px-1.5 py-0.5 rounded font-mono font-bold">Binance Pay</span>;
      default:
        return <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">Payment</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#071126] border-2 border-amber-500/70 rounded-3xl p-5 shadow-2xl shadow-amber-950/80 max-h-[92vh] flex flex-col relative text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-950/80">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shadow-lg shadow-amber-400/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-orbitron font-extrabold text-sm text-white flex items-center space-x-1.5">
                <span>ADMIN PANEL</span>
                <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-mono font-bold">
                  SECURE PORTAL
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Auto-Approval Engine • Real Earnings Wallet
              </p>
            </div>
          </div>

          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. AUTO-APPROVE TOGGLE BAR */}
        <div className="my-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#03152e] via-[#041c3d] to-[#03152e] border border-cyan-500/50 flex items-center justify-between shadow-lg">
          <div className="max-w-[70%]">
            <div className="flex items-center space-x-1.5">
              <span className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                AUTO-APPROVE SYSTEM
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                autoApproveEnabled 
                  ? 'bg-emerald-400 text-black shadow-sm' 
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {autoApproveEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
              {autoApproveEnabled
                ? 'Valid TIDs are verified and auto-approved within 2 minutes.'
                : 'Admin manually reviews and approves each user TID.'}
            </p>
          </div>

          <button
            onClick={() => {
              sound.playToggle(!autoApproveEnabled);
              setAutoApproveEnabled(!autoApproveEnabled);
            }}
            className="cursor-pointer text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Toggle Auto-Approval Mode"
          >
            {autoApproveEnabled ? (
              <ToggleRight className="w-10 h-10 text-emerald-400 fill-emerald-400/20 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-500" />
            )}
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#030919] p-1 rounded-xl mb-3 border border-cyan-950">
          <button
            onClick={() => { sound.playClick(); setActiveTab('wallet'); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'wallet' 
                ? 'bg-amber-400 text-black shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>💰 MY WALLET - EARNINGS</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('approvals'); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'approvals' 
                ? 'bg-cyan-500 text-black shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Orders ({pendingTransactions.length} Pending)</span>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activeTab === 'wallet' ? (
            /* 2. ADMIN WALLET - PAISA KA HISAB SECTION */
            <div className="space-y-3">
              {/* Top Big Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1a1403] via-[#241a04] to-[#0f0c02] border-2 border-amber-400 shadow-xl shadow-amber-950/60 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-orbitron font-extrabold text-amber-300 uppercase tracking-widest flex items-center space-x-1.5">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    <span>TOTAL EARNINGS</span>
                  </span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/50 px-2 py-0.5 rounded font-mono font-bold">
                    Real Revenue
                  </span>
                </div>

                <div className="mt-1">
                  <h2 className="font-orbitron font-black text-3xl text-white tracking-wide drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]">
                    Rs. {adminStats.totalEarningsPkr.toLocaleString()}
                  </h2>
                </div>

                {/* Sub Stats Row: Today, This Week, This Month */}
                <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-amber-500/30 text-center">
                  <div className="bg-[#0b0802]/80 p-2 rounded-xl border border-amber-500/20">
                    <span className="text-[9px] text-amber-200/70 font-mono block">Today</span>
                    <span className="font-orbitron font-bold text-xs text-amber-300">
                      Rs. {adminStats.todayEarningsPkr.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-[#0b0802]/80 p-2 rounded-xl border border-amber-500/20">
                    <span className="text-[9px] text-amber-200/70 font-mono block">This Week</span>
                    <span className="font-orbitron font-bold text-xs text-amber-300">
                      Rs. {adminStats.weekEarningsPkr.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-[#0b0802]/80 p-2 rounded-xl border border-amber-500/20">
                    <span className="text-[9px] text-amber-200/70 font-mono block">This Month</span>
                    <span className="font-orbitron font-bold text-xs text-amber-300">
                      Rs. {adminStats.monthEarningsPkr.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Total Users PRO Chip */}
                <div className="mt-2.5 flex items-center justify-between text-xs bg-black/40 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  <span className="text-slate-300 flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Total Users PRO:</span>
                  </span>
                  <span className="font-orbitron font-extrabold text-amber-300">
                    {adminStats.totalProUsers} Gamers
                  </span>
                </div>
              </div>

              {/* Method Wise Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-orbitron font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                    <Coins className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Method Wise Breakdown</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">One-Tap Copy</span>
                </div>

                {/* JazzCash */}
                <div className="p-3 rounded-2xl bg-[#040e24] border border-cyan-900/60 flex items-center justify-between hover:border-cyan-500/50 transition-colors">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-12 h-8 rounded-xl bg-white/10 border border-red-700/60 flex items-center justify-center p-1">
                      <JazzCashLogo size="sm" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">JazzCash</h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {adminStats.methodBreakdown.jazzcash.count} Payments • No: 03193191407
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-orbitron font-extrabold text-sm text-red-400">
                      Rs. {adminStats.methodBreakdown.jazzcash.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleCopy(`Rs. ${adminStats.methodBreakdown.jazzcash.amount}`, 'jc')}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Copy Total"
                    >
                      {copiedKey === 'jc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Easypaisa */}
                <div className="p-3 rounded-2xl bg-[#040e24] border border-cyan-900/60 flex items-center justify-between hover:border-cyan-500/50 transition-colors">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-12 h-8 rounded-xl bg-white/10 border border-emerald-700/60 flex items-center justify-center p-1">
                      <EasypaisaLogo size="sm" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Easypaisa</h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {adminStats.methodBreakdown.easypaisa.count} Payments • No: 03193191407
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-orbitron font-extrabold text-sm text-emerald-400">
                      Rs. {adminStats.methodBreakdown.easypaisa.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleCopy(`Rs. ${adminStats.methodBreakdown.easypaisa.amount}`, 'ep')}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Copy Total"
                    >
                      {copiedKey === 'ep' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Binance Pay */}
                <div className="p-3 rounded-2xl bg-[#040e24] border border-cyan-900/60 flex items-center justify-between hover:border-cyan-500/50 transition-colors">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-12 h-8 rounded-xl bg-white/10 border border-yellow-700/60 flex items-center justify-center p-1">
                      <BinanceLogo size="sm" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Binance Pay</h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {adminStats.methodBreakdown.binance.count} Payments • ID: 980641917
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-orbitron font-extrabold text-sm text-yellow-400">
                      ${adminStats.methodBreakdown.binance.amount} USDT
                    </span>
                    <button
                      onClick={() => handleCopy(`$${adminStats.methodBreakdown.binance.amount}`, 'bin')}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Copy Total"
                    >
                      {copiedKey === 'bin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* WITHDRAW BUTTON */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowWithdrawNotice(true);
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black font-orbitron font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/30 hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                <Wallet className="w-4 h-4 fill-black" />
                <span>Withdraw Funds</span>
              </button>
            </div>
          ) : (
            /* APPROVALS & TRANSACTIONS TAB */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 font-orbitron uppercase tracking-wider">
                  Orders &amp; Payment Ledger
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {transactions.length} Total
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#040c1f] border border-cyan-950 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">No transactions recorded yet.</p>
                </div>
              ) : (
                transactions.map(t => (
                  <div 
                    key={t.id} 
                    className={`p-3.5 rounded-2xl border space-y-2.5 ${
                      t.status === 'pending' 
                        ? 'bg-[#040e26] border-amber-500/60 shadow-lg shadow-amber-950/40' 
                        : t.status === 'approved'
                        ? 'bg-[#03151f] border-emerald-500/30'
                        : 'bg-[#15050e] border-red-500/30'
                    }`}
                  >
                    {/* Header: User, Package, Method, Date */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                            {t.packageName}
                          </span>
                          {getMethodBadge(t.method)}
                          {t.status === 'pending' && (
                            <span className="text-[10px] bg-amber-500/30 text-amber-300 border border-amber-400 px-2 py-0.5 rounded font-mono font-black animate-pulse">
                              NEED CHECK
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white pt-0.5">
                          {t.senderName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Date: {new Date(t.submittedAt).toLocaleDateString()} {new Date(t.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {t.phone}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-orbitron font-extrabold text-base text-amber-300">
                          {t.method === 'binance' ? `$${t.amount}` : `Rs. ${t.amount}`}
                        </span>
                        <div className="mt-0.5">
                          <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                            t.status === 'approved' 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-600' 
                              : t.status === 'rejected'
                              ? 'bg-red-950 text-red-400 border border-red-600'
                              : 'bg-amber-950 text-amber-300 border border-amber-500'
                          }`}>
                            {t.note || t.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Both TIDs: User TID + Screenshot (OCR) TID */}
                    <div className="p-2.5 rounded-xl bg-[#020614] border border-cyan-950 font-mono text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">User wali TID:</span>
                        <span className="text-cyan-300 font-bold select-all">{t.tid}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-900">
                        <span className="text-slate-400">Screenshot wali TID (OCR):</span>
                        <span className={`font-bold select-all ${
                          t.ocrTid && t.ocrTid.toLowerCase().includes(t.tid.toLowerCase())
                            ? 'text-emerald-400' 
                            : 'text-amber-400'
                        }`}>
                          {t.ocrTid || 'Not Detected'}
                        </span>
                      </div>
                    </div>

                    {/* Screenshot thumbnail (Click pe bada khule) */}
                    {t.screenshotUrl ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#030a1c] border border-cyan-900/50">
                        <div 
                          onClick={() => setViewScreenshot(t.screenshotUrl || null)}
                          className="flex items-center space-x-2 cursor-pointer group"
                        >
                          <img 
                            src={t.screenshotUrl} 
                            alt="Receipt" 
                            className="w-10 h-10 object-cover rounded-lg border border-cyan-700/60 group-hover:border-cyan-400 transition-all"
                          />
                          <div>
                            <span className="text-xs text-cyan-300 group-hover:underline flex items-center space-x-1 font-medium">
                              <Eye className="w-3 h-3" />
                              <span>Click to View Screenshot</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {t.screenshotName || 'receipt_proof.png'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
                          Firebase
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 font-mono p-1">
                        No screenshot image attached
                      </div>
                    )}

                    {/* Pending Action Buttons */}
                    {t.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => approveTransaction(t.id)}
                          className="py-2.5 rounded-xl bg-emerald-500 text-black font-orbitron font-bold text-xs uppercase hover:bg-emerald-400 transition-colors flex items-center justify-center space-x-1 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>APPROVE</span>
                        </button>

                        <button
                          onClick={() => rejectTransaction(t.id, 'Payment verification failed')}
                          className="py-2.5 rounded-xl bg-red-950 border border-red-500/60 text-red-300 font-orbitron font-bold text-xs uppercase hover:bg-red-900 transition-colors flex items-center justify-center space-x-1 cursor-pointer active:scale-95"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>REJECT</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* WITHDRAW NOTICE MODAL */}
        {showWithdrawNotice && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#040e24] border-2 border-amber-400 rounded-3xl p-5 shadow-2xl text-center space-y-3 relative">
              <button
                onClick={() => setShowWithdrawNotice(false)}
                className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h4 className="font-orbitron font-extrabold text-sm text-white">
                WITHDRAW FUNDS NOTICE
              </h4>

              <div className="p-3 rounded-2xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs font-semibold leading-relaxed">
                Paisa App me nahi hai, Paisa aapke JazzCash / Easypaisa / Binance Account me hai. Wahan se Withdraw karein.
              </div>

              <div className="text-left space-y-1.5 pt-1 text-[11px] font-mono text-slate-300">
                <div className="flex justify-between py-1 border-b border-cyan-950">
                  <span>JazzCash Total (03193191407):</span>
                  <span className="font-bold text-red-400">Rs. {adminStats.methodBreakdown.jazzcash.amount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cyan-950">
                  <span>Easypaisa Total (03193191407):</span>
                  <span className="font-bold text-emerald-400">Rs. {adminStats.methodBreakdown.easypaisa.amount}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Binance Pay Total (980641917):</span>
                  <span className="font-bold text-yellow-400">${adminStats.methodBreakdown.binance.amount} USDT</span>
                </div>
              </div>

              <button
                onClick={() => setShowWithdrawNotice(false)}
                className="w-full py-2.5 rounded-xl bg-amber-400 text-black font-orbitron font-extrabold text-xs uppercase cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        )}

        {/* Screenshot View Modal (Click pe bada khule) */}
        {viewScreenshot && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md">
            <div className="w-full max-w-lg bg-[#071333] border-2 border-cyan-400 rounded-3xl p-4 space-y-3 relative max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-950">
                <span className="text-xs font-bold text-white font-orbitron flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Payment Screenshot Proof</span>
                </span>
                <button 
                  onClick={() => setViewScreenshot(null)} 
                  className="p-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-2xl bg-black border border-cyan-900/60 flex items-center justify-center p-2">
                {viewScreenshot.startsWith('data:') || viewScreenshot.startsWith('http') || viewScreenshot.startsWith('/') ? (
                  <img
                    src={viewScreenshot}
                    alt="Proof Receipt"
                    className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                    <span className="text-xs text-white font-mono">{viewScreenshot}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setViewScreenshot(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-orbitron text-xs font-bold uppercase"
              >
                Close Proof Viewer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
