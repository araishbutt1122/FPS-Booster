import React, { useState, useRef, lazy, Suspense } from 'react';
import { 
  Menu, 
  Activity, 
  Shield, 
  Rocket, 
  Settings as SettingsIcon, 
  X, 
  ChevronRight,
  Flame,
  Languages,
  Smartphone,
  Clock,
  KeyRound,
  Zap,
  AlertTriangle,
  Play
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
const AdminPanel = lazy(() => import('./AdminPanel.tsx').then((m) => ({ default: m.AdminPanel })));

export const StatusBar: React.FC = () => {
  // Fake Status Bar completely removed for immersive full-screen mode
  return null;
};

export const TopAppBar: React.FC = () => {
  const { currentScreen, setCurrentScreen, state, masterBoostActive, setLanguage, thermalMonitor, smartSession } = useBooster();
  const isGamingHighTemp =
    thermalMonitor.isHighTempWarning ||
    ((state.isGamingModeOn || state.isBoosting || smartSession.isActive) &&
      (thermalMonitor.severity === 'high' || thermalMonitor.severity === 'critical'));
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
      case 'reward_ad':
        return state.language === 'ur' ? 'Ad Dekhein • Boost Time' : 'Watch Ad • Boost Time';
      case 'privacy_policy':
        return 'Privacy Policy';
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
              haptics.impactLight();
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
              haptics.impactLight();
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
          {isGamingHighTemp && (
            <button
              type="button"
              onClick={() => {
                haptics.warning();
                sound.playClick();
                setCurrentScreen('dashboard');
              }}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-[10px] font-mono font-bold cursor-pointer whitespace-nowrap tabular-nums ${
                thermalMonitor.severity === 'critical'
                  ? 'bg-red-950/95 border-red-500 text-red-200'
                  : 'bg-orange-950/95 border-orange-500 text-orange-200'
              }`}
              title="High device temperature detected during gaming — tap to inspect Dashboard"
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{thermalMonitor.currentTempC.toFixed(0)}°C HOT</span>
            </button>
          )}
          {state.boostTimeRemainingSec > 0 ? (
            <div 
              onClick={() => {
                haptics.impactLight();
                sound.playClick();
                setCurrentScreen('reward_ad');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-mono cursor-pointer transition-all tabular-nums ${
                masterBoostActive
                  ? 'bg-emerald-950/90 border-emerald-400/80 text-emerald-300 hover:border-emerald-300 shadow-md shadow-emerald-950'
                  : 'bg-cyan-950/90 border-cyan-500/70 text-cyan-300 hover:border-cyan-300'
              }`}
              title="Boost Countdown Remaining"
            >
              <Clock className={`w-3.5 h-3.5 ${masterBoostActive ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`} />
              <span className="font-bold">
                {formatTimer(state.boostTimeRemainingSec)} {masterBoostActive ? 'Boost ON' : 'Left'}
              </span>
            </div>
          ) : (
            <div 
              onClick={() => {
                haptics.impactLight();
                sound.playClick();
                setCurrentScreen('reward_ad');
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-amber-500/60 text-amber-300 text-xs font-mono cursor-pointer hover:border-amber-400"
              title="Watch 1 Ad to Start Boost Time"
            >
              <Play className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="font-bold text-amber-300">Watch Ad (+30m)</span>
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
                  title="GLOBAL GAME BOOSTER"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-bold text-sm text-white">GLOBAL GAME BOOSTER</h3>
                    <p className="text-[10px] text-cyan-400 font-mono tracking-wider">ALL-GAMES FREE EDITION</p>
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
                  <span className="text-xs text-slate-300 font-medium">Boost Session Timer</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tabular-nums ${state.boostTimeRemainingSec > 0 ? 'bg-emerald-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                    {state.boostTimeRemainingSec > 0 ? formatTimer(state.boostTimeRemainingSec) : '00:00'}
                  </span>
                </div>
                <p className="text-[11px] text-cyan-300">
                  {state.boostTimeRemainingSec > 0
                    ? `Countdown Active • ${state.totalAdsWatched ?? 0} Ads watched`
                    : 'Watch Ad to Start (30–120 Min Boost)'}
                </p>
              </div>

              {/* Menu items */}
              <div className="mt-5 space-y-1">
                <button
                  onClick={() => {
                    haptics.selection();
                    setCurrentScreen('reward_ad');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-emerald-300 hover:bg-emerald-950/30 transition-all font-medium text-xs border border-emerald-500/25"
                >
                  <div className="flex items-center space-x-2.5">
                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                    <span>Watch Ad • Earn Boost Time</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">+30m</span>
                </button>

                <button
                  onClick={() => {
                    haptics.selection();
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
                    haptics.selection();
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
                    haptics.selection();
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
                  <span className="text-cyan-400 font-bold">{state.isVpnActive ? 'Active' : 'Ready'}</span>
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
                GLOBAL GAME BOOSTER • 100% Free Edition
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
            <p className="text-[11px] text-slate-300">Enter Admin PIN to open Diagnostics &amp; Cloud Portal</p>

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
      {isAdminOpen && (
        <Suspense fallback={null}>
          <AdminPanel onClose={() => setIsAdminOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export const BottomNavBar: React.FC = () => {
  const { currentScreen, setCurrentScreen, thermalMonitor, state, smartSession } = useBooster();
  const hasHighTempAlert =
    thermalMonitor.isHighTempWarning ||
    ((state.isGamingModeOn || state.isBoosting || smartSession.isActive) &&
      (thermalMonitor.severity === 'high' || thermalMonitor.severity === 'critical'));
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
      <div className="relative z-30 px-2 pb-2 pt-1 shrink-0">
        <div className="bg-[#070e24]/95 backdrop-blur-xl border border-cyan-900/60 rounded-2xl p-1.5 flex items-center justify-between shadow-xl shadow-black/90 gap-0.5">
          {/* 1. Monitor */}
          <button
            onClick={() => {
              haptics.selection();
              sound.playClick();
              setCurrentScreen('dashboard');
            }}
            className={`relative flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'dashboard' 
                ? hasHighTempAlert
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/60'
                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 drop-shadow-[0_0_8px_rgba(0,191,255,0.7)]' 
                : hasHighTempAlert
                ? 'text-orange-300 hover:text-orange-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {hasHighTempAlert && (
              <AlertTriangle
                aria-label="High temperature warning"
                className={`w-3 h-3 absolute top-1 right-1.5 ${
                  thermalMonitor.severity === 'critical' ? 'text-red-400' : 'text-orange-400'
                }`}
              />
            )}
            <Activity className="w-5 h-5 mb-0.5 shrink-0" />
            <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">Monitor</span>
          </button>

          {/* 2. Block Apps */}
          <button
            onClick={() => {
              haptics.selection();
              sound.playClick();
              setCurrentScreen('block_apps');
            }}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'block_apps' 
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 drop-shadow-[0_0_8px_rgba(0,191,255,0.7)]' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5 mb-0.5 shrink-0" />
            <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">Block Apps</span>
          </button>

          {/* 3. Boost */}
          <button
            onClick={() => {
              haptics.impactMedium();
              sound.playBoost();
              setCurrentScreen('home');
            }}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'home'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 drop-shadow-[0_0_8px_rgba(0,191,255,0.75)]'
                : 'text-cyan-400 hover:text-cyan-200'
            }`}
          >
            <Rocket className="w-5 h-5 mb-0.5 shrink-0" />
            <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">Boost</span>
          </button>

          {/* 4. Ad Time */}
          <button
            onClick={() => {
              haptics.selection();
              sound.playClick();
              setCurrentScreen('reward_ad');
            }}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'reward_ad' 
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/50 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' 
                : 'text-emerald-400/80 hover:text-emerald-300'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5 shrink-0" />
            <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">Ad Time</span>
          </button>

          {/* 5. Settings */}
          <button
            onClick={() => {
              haptics.selection();
              sound.playClick();
              setCurrentScreen('settings');
            }}
            onMouseDown={handleSettingsMouseDown}
            onMouseUp={handleSettingsMouseUp}
            onTouchStart={handleSettingsMouseDown}
            onTouchEnd={handleSettingsMouseUp}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
              currentScreen === 'settings' 
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 drop-shadow-[0_0_8px_rgba(0,191,255,0.7)]' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5 mb-0.5 shrink-0" />
            <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">Settings</span>
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
            <p className="text-[11px] text-slate-300">Enter Admin PIN to open Diagnostics &amp; Cloud Portal</p>

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
      {isAdminOpen && (
        <Suspense fallback={null}>
          <AdminPanel onClose={() => setIsAdminOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
