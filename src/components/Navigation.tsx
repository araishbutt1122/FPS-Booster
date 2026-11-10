import React, { useState, useRef } from 'react';
import { 
  Wifi, 
  Battery, 
  Menu, 
  Crown, 
  Activity, 
  Shield, 
  Rocket, 
  Settings as SettingsIcon, 
  X, 
  ChevronRight,
  Flame,
  Volume2,
  VolumeX,
  Languages,
  Smartphone,
  Cpu,
  Clock,
  CheckCircle2,
  Gift,
  Lock,
  KeyRound,
  Zap
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { AdminPanel } from './AdminPanel.tsx';

export const StatusBar: React.FC = () => {
  // Fake Status Bar completely removed for immersive full-screen mode
  return null;
};

export const TopAppBar: React.FC = () => {
  const { currentScreen, setCurrentScreen, state, setLanguage } = useBooster();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Hidden 5-tap logo admin trigger
  const logoTapRef = useRef({ count: 0, lastTime: 0 });
  const handleLogoTap = () => {
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
      setShowAdminPinModal(true);
    }
  };

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'fps_graphics':
        return state.language === 'ur' ? 'FPS Aur Graphics' : 'FPS & Graphics';
      case 'block_apps':
        return state.language === 'ur' ? 'Background Data Blocker' : 'Background Data Blocker';
      case 'dashboard':
        return state.language === 'ur' ? 'Gaming Dashboard' : 'Gaming Dashboard';
      case 'settings':
        return state.language === 'ur' ? 'Settings' : 'Settings';
      case 'premium':
        return state.language === 'ur' ? 'Upgrade To PRO' : 'Premium Package';
      case 'reward_ad':
        return state.language === 'ur' ? 'Ad Rewards' : 'Watch Ad & Get Rewards';
      default:
        return '';
    }
  };

  const isInnerScreen = currentScreen !== 'home';
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '7890') {
      sound.playSuccess();
      setShowAdminPinModal(false);
      setAdminPin('');
      setPinError(false);
      setIsAdminOpen(true);
    } else {
      sound.playClick();
      setPinError(true);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 z-20 relative">
        {isInnerScreen ? (
          <button 
            onClick={() => {
              sound.playClick();
              setCurrentScreen('home');
            }}
            className="p-1 -ml-1 text-slate-300 hover:text-cyan-400 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
            <span className="font-semibold text-sm text-slate-200">{getScreenTitle()}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              sound.playClick();
              setIsDrawerOpen(true);
            }}
            className="p-1.5 -ml-1 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        {/* Top Header Timer Chip: [⏰ 30:00 Boost Left] / [⚡ Ready to Boost] */}
        {/* NO TOP PRO BUTTON - PRO IS ONLY IN BOTTOM NAV */}
        <div className="flex items-center space-x-2">
          {state.isBoosting && state.boostTimeRemainingSec > 0 ? (
            <div 
              onClick={() => {
                sound.playClick();
                setCurrentScreen('reward_ad');
              }}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/80 text-cyan-300 text-xs font-mono cursor-pointer hover:border-cyan-300 hover:bg-cyan-900/60 transition-all shadow-md shadow-cyan-950"
              title="Boost Time Remaining"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="font-bold">{formatTimer(state.boostTimeRemainingSec)} Boost Left</span>
            </div>
          ) : (
            <div 
              onClick={() => {
                sound.playClick();
                setCurrentScreen('home');
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-xs font-mono cursor-pointer hover:border-cyan-500"
              title="Tap to Boost"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-amber-300">{state.isPro ? 'PRO VIP 120' : 'Tap to Boost'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Side Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="relative w-72 max-w-[80vw] h-full bg-[#070e24] border-r border-cyan-900/40 p-5 flex flex-col justify-between z-10 shadow-2xl shadow-cyan-950">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-cyan-950">
                <div 
                  onClick={handleLogoTap}
                  className="flex items-center space-x-2 cursor-pointer select-none"
                  title="FPS BOOSTER"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-bold text-sm text-white">FPS BOOSTER</h3>
                    <p className="text-[10px] text-cyan-400 font-mono tracking-wider">PRO 120 EDITION</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-800/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 font-medium">Subscription</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${state.isPro ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                    {state.isPro ? `${state.proTier.toUpperCase()} VIP` : 'FREE VERSION'}
                  </span>
                </div>
                <p className="text-[11px] text-cyan-300">
                  {state.isPro ? 'All 120 FPS configs & VPN active' : '120 FPS locked • Ad rewards available'}
                </p>
              </div>

              {/* Menu items */}
              <div className="mt-5 space-y-1">
                <button
                  onClick={() => {
                    setCurrentScreen('premium');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-amber-300 hover:bg-amber-950/30 transition-all font-medium text-xs border border-amber-500/20"
                >
                  <div className="flex items-center space-x-2.5">
                    <Crown className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                    <span>Upgrade to PRO VIP</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => {
                    setCurrentScreen('reward_ad');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-200 hover:bg-cyan-950/40 transition-all font-medium text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <Gift className="w-4 h-4 text-pink-400" />
                    <span>Watch Ads &amp; Free Boost</span>
                  </div>
                  <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded">Free</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentScreen('fps_graphics');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-200 hover:bg-cyan-950/40 transition-all font-medium text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>FPS &amp; Graphics Engine</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setCurrentScreen('block_apps');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-200 hover:bg-cyan-950/40 transition-all font-medium text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>Background Data Blocker</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setCurrentScreen('dashboard');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-200 hover:bg-cyan-950/40 transition-all font-medium text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Real-time Gaming HUD</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Hardware diagnostics */}
              <div className="mt-5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1.5">
                <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-1 flex items-center space-x-1">
                  <Smartphone className="w-3 h-3 text-cyan-400" />
                  <span>Hardware Vsync</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Display Max Hz:</span>
                  <span className="text-cyan-400 font-bold">{state.maxHardwareHz} Hz</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Rendering Pipeline:</span>
                  <span className="text-emerald-400 font-bold">Vulkan 1.3</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Block VPN Firewall:</span>
                  <span className="text-cyan-400 font-bold">{state.isVpnActive ? 'Active' : 'Standby'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pt-4 border-t border-cyan-950 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Languages className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Language</span>
                </span>
                <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${state.language === 'en' ? 'bg-cyan-500 text-black' : 'text-slate-400'}`}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => setLanguage('ur')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${state.language === 'ur' ? 'bg-cyan-500 text-black' : 'text-slate-400'}`}
                  >
                    UR
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-center text-slate-500 font-mono pt-1">
                FPS BOOSTER PRO 120 • v2.4 PRO
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Dialog Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#071333] border border-amber-500/60 rounded-3xl p-5 shadow-2xl shadow-amber-950 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-white">Admin Security Access</h3>
            <p className="text-[11px] text-slate-300">Enter Admin PIN to open Order Approvals &amp; Wallet</p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="Enter PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white focus:outline-none focus:border-amber-400"
              />
              {pinError && (
                <p className="text-red-400 text-[10px] font-mono">Incorrect PIN!</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
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

      {/* Hidden Admin Portal */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
    </>
  );
};

export const BottomNavBar: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useBooster();
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Long press timer for Settings tab (Admin login)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSettingsMouseDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      sound.playBoost();
      setShowAdminPinModal(true);
    }, 4500); // ~5 sec long press trigger
  };

  const handleSettingsMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '7890') {
      sound.playSuccess();
      setShowAdminPinModal(false);
      setAdminPin('');
      setPinError(false);
      setIsAdminOpen(true);
    } else {
      sound.playClick();
      setPinError(true);
    }
  };

  return (
    <>
      <div className="relative z-30 px-3 pb-2 pt-1">
        <div className="bg-[#070e24]/95 backdrop-blur-xl border border-cyan-900/60 rounded-2xl p-1.5 flex items-center justify-between shadow-xl shadow-black/90">
          {/* 1. Monitor (Real-time HUD & Ping Monitor) */}
          <button
            onClick={() => {
              sound.playClick();
              setCurrentScreen('dashboard');
            }}
            className={`flex-1 flex flex-col items-center py-1 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'dashboard' 
                ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,191,255,0.7)]' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Monitor</span>
          </button>

          {/* 2. Block Apps (Shield) */}
          <button
            onClick={() => {
              sound.playClick();
              setCurrentScreen('block_apps');
            }}
            className={`flex-1 flex flex-col items-center py-1 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'block_apps' 
                ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,191,255,0.7)]' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Block Apps</span>
          </button>

          {/* 3. Boost (Home Screen with Tap to Boost button + Anime character) */}
          <button
            onClick={() => {
              sound.playBoost();
              setCurrentScreen('home');
            }}
            className="flex flex-col items-center -my-3 px-2 z-10 transition-all cursor-pointer group"
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,191,255,0.85)] border-2 ${
              currentScreen === 'home' ? 'border-cyan-200 ring-2 ring-cyan-400 scale-105' : 'border-cyan-300'
            } group-hover:scale-105 transition-transform`}>
              <Rocket className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
            <span className={`text-[10px] font-orbitron font-bold tracking-wider mt-1 drop-shadow-[0_0_6px_rgba(0,191,255,0.8)] ${
              currentScreen === 'home' ? 'text-cyan-200' : 'text-cyan-400'
            }`}>
              Boost
            </span>
          </button>

          {/* 4. PRO (Crown - Golden Yellow #FFC107) */}
          <button
            onClick={() => {
              sound.playClick();
              setCurrentScreen('premium');
            }}
            className={`flex-1 flex flex-col items-center py-1 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'premium' 
                ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(255,193,7,0.8)]' 
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <Crown className="w-5 h-5 mb-0.5 text-[#FFC107] fill-[#FFC107]/20" />
            <span className="text-[10px] font-bold text-[#FFC107] tracking-tight">PRO</span>
          </button>

          {/* 5. Settings */}
          <button
            onClick={() => {
              sound.playClick();
              setCurrentScreen('settings');
            }}
            onMouseDown={handleSettingsMouseDown}
            onMouseUp={handleSettingsMouseUp}
            onTouchStart={handleSettingsMouseDown}
            onTouchEnd={handleSettingsMouseUp}
            className={`flex-1 flex flex-col items-center py-1 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'settings' 
                ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,191,255,0.7)]' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Settings</span>
          </button>
        </div>
      </div>

      {/* Admin PIN Dialog Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#071333] border border-amber-500/60 rounded-3xl p-5 shadow-2xl shadow-amber-950 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-white">Admin Security Access</h3>
            <p className="text-[11px] text-slate-300">Enter Admin PIN to open Order Approvals &amp; Wallet</p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="Enter PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-mono py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white focus:outline-none focus:border-amber-400"
              />
              {pinError && (
                <p className="text-red-400 text-[10px] font-mono">Incorrect PIN!</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
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

      {/* Hidden Admin Portal */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
    </>
  );
};
