import React from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Mail, 
  Lock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';

export const PrivacyPolicyScreen: React.FC = () => {
  const { setCurrentScreen } = useBooster();

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-20 pt-2 space-y-4 text-slate-200">
      {/* Header with back button */}
      <div className="flex items-center space-x-2.5 pb-2 border-b border-cyan-900/60">
        <button
          onClick={() => {
            sound.playClick();
            setCurrentScreen('settings');
          }}
          className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all"
          title="Back to Settings"
        >
          <ArrowLeft className="w-5 h-5 text-cyan-400" />
        </button>
        <div>
          <h2 className="font-orbitron font-extrabold text-sm text-white flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Privacy Policy - FPS Booster</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-mono">
            Last Updated: 9 Nov 2026 • v2.4 PRO
          </p>
        </div>
      </div>

      {/* Main Policy Content Card */}
      <div className="p-4 rounded-2xl bg-[#071333] border border-cyan-900/70 shadow-xl space-y-3.5 leading-relaxed text-xs">
        
        {/* Intro */}
        <div className="p-3 rounded-xl bg-[#040e26] border border-cyan-800/40 text-slate-300">
          <p className="text-[12px] font-medium text-cyan-200">
            FPS Booster respects your privacy. This app does not collect your personal photos, contacts, or messages.
          </p>
        </div>

        {/* Section 1: What We Collect */}
        <div className="space-y-1.5">
          <h3 className="font-orbitron font-bold text-xs text-emerald-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>What We Collect:</span>
          </h3>
          <ul className="space-y-1.5 pl-2 font-medium text-slate-300 text-[11px]">
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">1.</span>
              <span><strong>Name &amp; Payment TID</strong> - Only to verify your PRO payment.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">2.</span>
              <span><strong>Payment Screenshot</strong> - Only to confirm your JazzCash / Easypaisa / Binance payment.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">3.</span>
              <span><strong>Device Info</strong> - Only to improve FPS Boost performance.</span>
            </li>
          </ul>
        </div>

        {/* Section 2: What We DON'T Collect */}
        <div className="space-y-1.5 pt-2 border-t border-cyan-950">
          <h3 className="font-orbitron font-bold text-xs text-red-400 flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span>What We DON'T Collect:</span>
          </h3>
          <p className="text-[11px] text-slate-300 pl-2">
            We do <strong>NOT</strong> collect your Bank Details, Passwords, or JazzCash PIN.
          </p>
        </div>

        {/* Section 3: Payments */}
        <div className="space-y-1.5 pt-2 border-t border-cyan-950">
          <h3 className="font-orbitron font-bold text-xs text-amber-400 flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Payments:</span>
          </h3>
          <p className="text-[11px] text-slate-300 pl-2">
            All payments are done via JazzCash, Easypaisa, Binance Pay. We do not store your account passwords.
          </p>
        </div>

        {/* Section 4: Contact Us */}
        <div className="space-y-1.5 pt-2 border-t border-cyan-950">
          <h3 className="font-orbitron font-bold text-xs text-cyan-300 flex items-center space-x-1.5">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span>Contact Us:</span>
          </h3>
          <p className="text-[11px] text-slate-300 pl-2">
            If you have any question, contact us at:{' '}
            <a 
              href="mailto:araishbutt1122@gmail.com" 
              className="text-cyan-400 underline font-mono font-bold hover:text-cyan-300"
            >
              araishbutt1122@gmail.com
            </a>
          </p>
        </div>

        {/* Owner */}
        <div className="pt-2 border-t border-cyan-950 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Owner: <strong className="text-white">FPS Booster Team</strong></span>
          <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
            Verified
          </span>
        </div>
      </div>

      {/* Return Button */}
      <button
        onClick={() => {
          sound.playClick();
          setCurrentScreen('settings');
        }}
        className="w-full py-3 rounded-2xl bg-slate-900 border border-cyan-900 text-slate-200 hover:text-white hover:border-cyan-500 font-orbitron font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
      >
        <span>Back to Settings</span>
      </button>
    </div>
  );
};
