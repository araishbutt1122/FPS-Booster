import React, { useState, useRef } from 'react';
import { 
  Shield, 
  Rocket, 
  Cpu, 
  Wifi, 
  Lock, 
  Volume2, 
  VolumeX, 
  Tv, 
  Languages, 
  Crown, 
  Info, 
  Smartphone, 
  Trash2, 
  CheckCircle2 
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { AdminPanel } from './AdminPanel.tsx';

export const SettingsScreen: React.FC = () => {
  const { 
    state, 
    updateSetting, 
    setCurrentScreen, 
    setLanguage 
  } = useBooster();

  const [toast, setToast] = useState<string | null>(null);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const logoTapRef = useRef({ count: 0, lastTime: 0 });

  const handleFooterLogoTap = () => {
    const now = Date.now();
    if (now - logoTapRef.current.lastTime < 2500) {
      logoTapRef.current.count += 1;
    } else {
      logoTapRef.current.count = 1;
    }
    logoTapRef.current.lastTime = now;

    if (logoTapRef.current.count >= 5) {
      logoTapRef.current.count = 0;
      sound.playBoost();
      setShowAdminPin(true);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '7890') {
      sound.playSuccess();
      setShowAdminPin(false);
      setAdminPin('');
      setAdminPinError(false);
      setIsAdminOpen(true);
    } else {
      sound.playClick();
      setAdminPinError(true);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-20 pt-1 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-cyan-900 border border-cyan-400 text-white px-5 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* PRO Status Header Card */}
      <div 
        onClick={() => {
          sound.playClick();
          setCurrentScreen('premium');
        }}
        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
          state.isPro 
            ? 'bg-gradient-to-r from-amber-950/60 via-yellow-950/40 to-black border-amber-500/50 shadow-lg shadow-amber-950/50' 
            : 'bg-gradient-to-r from-[#071333] via-[#091b48] to-[#040e24] border-cyan-800/60 shadow-lg'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-black shadow-md shadow-amber-400/40">
            <Crown className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-orbitron font-extrabold text-sm text-white">
                {state.isPro ? 'PRO VIP MEMBER' : 'Upgrade to PRO'}
              </h3>
              <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-mono font-bold">
                {state.isPro ? state.proTier.toUpperCase() : 'VIP'}
              </span>
            </div>
            <p className="text-[11px] text-cyan-200 mt-0.5">
              {state.isPro 
                ? 'All 120 FPS games, zero ping tunnel active' 
                : 'Unlock 120 FPS Extreme & Anti-Lag Engine'}
            </p>
          </div>
        </div>

        <button className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-orbitron font-bold text-xs uppercase shadow-md hover:bg-amber-300">
          {state.isPro ? 'VIEW' : 'UPGRADE'}
        </button>
      </div>

      {/* Main Settings Toggles */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-4 shadow-xl space-y-4">
        <h3 className="font-orbitron font-bold text-xs text-cyan-300 uppercase tracking-wider">
          Booster Automation & Firewall
        </h3>

        {/* VPN Firewall */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 max-w-[78%]">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Block VPN Firewall</h4>
              <p className="text-[10px] text-slate-400">Use Block VPN to restrict background apps during gaming</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !state.isVpnActive;
              updateSetting('isVpnActive', next);
              showToast(next ? 'VPN Firewall Enabled' : 'VPN Firewall Disabled');
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              state.isVpnActive ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${state.isVpnActive ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Auto Boost */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 max-w-[78%]">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Auto Boost</h4>
              <p className="text-[10px] text-slate-400">Boost automatically when game package starts</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !state.autoBoostOnGameLaunch;
              updateSetting('autoBoostOnGameLaunch', next);
              showToast(next ? 'Auto Boost Enabled' : 'Auto Boost Disabled');
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              state.autoBoostOnGameLaunch ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${state.autoBoostOnGameLaunch ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* RAM Cleaner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 max-w-[78%]">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">RAM Cleaner</h4>
              <p className="text-[10px] text-slate-400">Deep clean RAM cache before starting games</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !state.deepRamClean;
              updateSetting('deepRamClean', next);
              showToast(next ? 'Deep RAM Clean Enabled' : 'Deep RAM Clean Disabled');
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              state.deepRamClean ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${state.deepRamClean ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Network Optimizer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 max-w-[78%]">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Network Optimizer</h4>
              <p className="text-[10px] text-slate-400">Prioritize game packets, lower ping & jitter</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !state.networkOptimizer;
              updateSetting('networkOptimizer', next);
              showToast(next ? 'Network Priority Enabled' : 'Network Priority Disabled');
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              state.networkOptimizer ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${state.networkOptimizer ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* App Lock */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 max-w-[78%]">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">App Lock</h4>
              <p className="text-[10px] text-slate-400">Lock booster settings and FPS profile with PIN</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !state.appLock;
              updateSetting('appLock', next);
              showToast(next ? 'App Lock Protected' : 'App Lock Disabled');
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              state.appLock ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${state.appLock ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Hardware & System Information */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-4 shadow-xl space-y-3">
        <h3 className="font-orbitron font-bold text-xs text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span>Device Hardware Status</span>
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#050c1f] p-2.5 rounded-xl border border-cyan-950">
            <span className="text-[10px] text-slate-400 block font-mono">DETECTED REFRESH RATE</span>
            <span className="font-orbitron font-bold text-sm text-cyan-300">
              {state.maxHardwareHz} Hz Max
            </span>
          </div>

          <div className="bg-[#050c1f] p-2.5 rounded-xl border border-cyan-950">
            <span className="text-[10px] text-slate-400 block font-mono">VSYNC SYNC</span>
            <span className="font-orbitron font-bold text-sm text-emerald-400">
              Choreographer
            </span>
          </div>

          <div className="bg-[#050c1f] p-2.5 rounded-xl border border-cyan-950">
            <span className="text-[10px] text-slate-400 block font-mono">GRAPHICS API</span>
            <span className="font-orbitron font-bold text-sm text-cyan-300">
              Vulkan 1.3
            </span>
          </div>

          <div className="bg-[#050c1f] p-2.5 rounded-xl border border-cyan-950">
            <span className="text-[10px] text-slate-400 block font-mono">TOTAL RAM</span>
            <span className="font-orbitron font-bold text-sm text-cyan-300">
              {state.totalRamGb}.0 GB LPDDR5
            </span>
          </div>
        </div>
      </div>

      {/* Language Preferences */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <Languages className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Language / Zaban</h4>
            <p className="text-[10px] text-slate-400">English or Roman Urdu interface</p>
          </div>
        </div>

        <div className="flex bg-slate-900 rounded-xl p-1 border border-cyan-900/40">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-lg text-xs font-bold ${
              state.language === 'en' ? 'bg-cyan-500 text-black' : 'text-slate-400'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('ur')}
            className={`px-3 py-1 rounded-lg text-xs font-bold ${
              state.language === 'ur' ? 'bg-cyan-500 text-black' : 'text-slate-400'
            }`}
          >
            Roman Urdu
          </button>
        </div>
      </div>

      {/* Privacy Policy Option (Task 2) */}
      <div 
        onClick={() => {
          sound.playClick();
          setCurrentScreen('privacy_policy');
        }}
        className="bg-[#071129]/90 border border-cyan-900/50 hover:border-cyan-500/60 rounded-2xl p-4 shadow-xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Privacy Policy</h4>
            <p className="text-[10px] text-slate-400">FPS Booster Data &amp; Payment Privacy Terms</p>
          </div>
        </div>
        <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-800/60">
          Open &gt;
        </span>
      </div>

      {/* Footer Branding (Secret: 5-Tap for Admin) */}
      <div 
        onClick={handleFooterLogoTap}
        className="text-center py-3 cursor-pointer select-none group"
      >
        <p className="font-orbitron font-bold text-xs text-cyan-400 tracking-wider group-hover:text-cyan-300">
          FPS BOOSTER PRO 120
        </p>
        <p className="text-[10px] text-slate-400 font-medium">
          Premium Gaming Edition • Built for Esports
        </p>
        <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
          v2.4 PRO
        </span>
      </div>

      {/* Admin PIN Modal */}
      {showAdminPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#071333] border border-amber-500/60 rounded-3xl p-5 shadow-2xl text-center space-y-3">
            <h3 className="font-orbitron font-bold text-sm text-white">Admin Security Access</h3>
            <p className="text-[11px] text-slate-300">Enter Admin PIN to open Order Approvals &amp; Wallet</p>

            <form onSubmit={handleAdminSubmit} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="Enter PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white focus:outline-none focus:border-amber-400"
              />
              {adminPinError && (
                <p className="text-red-400 text-[10px] font-mono">Incorrect PIN!</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPin(false)}
                  className="py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold font-orbitron"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 rounded-xl bg-amber-400 text-black text-xs font-bold font-orbitron shadow-md shadow-amber-400/30"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
};
