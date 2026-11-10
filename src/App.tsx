import React, { useState } from 'react';
import { BoosterProvider, useBooster } from './context/BoosterContext.tsx';
import { TopAppBar, BottomNavBar } from './components/Navigation.tsx';
import { HomeScreen } from './components/HomeScreen.tsx';
import { FpsGraphicsScreen } from './components/FpsGraphicsScreen.tsx';
import { BlockAppsScreen } from './components/BlockAppsScreen.tsx';
import { GamingDashboard } from './components/GamingDashboard.tsx';
import { SettingsScreen } from './components/SettingsScreen.tsx';
import { PremiumPackageScreen } from './components/PremiumPackageScreen.tsx';
import { RewardAdScreen } from './components/RewardAdScreen.tsx';
import { PrivacyPolicyScreen } from './components/PrivacyPolicyScreen.tsx';
import { BannerAd } from './components/BannerAd.tsx';
import { 
  Smartphone, 
  Crown, 
  Zap, 
  Shield, 
  Flame, 
  Maximize2
} from 'lucide-react';
import { sound } from './utils/audio.ts';

const MainAppContent: React.FC = () => {
  const { currentScreen, setCurrentScreen, state } = useBooster();
  const [deviceFrame, setDeviceFrame] = useState(true);

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'fps_graphics':
        return <FpsGraphicsScreen />;
      case 'block_apps':
        return <BlockAppsScreen />;
      case 'dashboard':
        return <GamingDashboard />;
      case 'settings':
        return <SettingsScreen />;
      case 'premium':
        return <PremiumPackageScreen />;
      case 'reward_ad':
        return <RewardAdScreen />;
      case 'privacy_policy':
        return <PrivacyPolicyScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#030611] text-slate-100 flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* Background Cyber Ambient Lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Test Navigation Strip (Quick jump between 7 screens) */}
      <header className="w-full max-w-4xl px-4 py-2 z-40 hidden sm:flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-sm">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-orbitron font-extrabold text-sm tracking-wide text-white">
            FPS BOOSTER PRO 120
          </span>
          <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-mono">
            {state.maxHardwareHz}Hz VSYNC
          </span>
        </div>

        {/* Quick Screen Switcher */}
        <div className="flex items-center space-x-1 bg-slate-900/90 border border-cyan-900/60 p-1 rounded-xl shadow-lg">
          <button
            onClick={() => { sound.playClick(); setCurrentScreen('home'); }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
              currentScreen === 'home' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Home
          </button>
          <button
            onClick={() => { sound.playClick(); setCurrentScreen('fps_graphics'); }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
              currentScreen === 'fps_graphics' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            2. FPS &amp; GFX
          </button>
          <button
            onClick={() => { sound.playClick(); setCurrentScreen('block_apps'); }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
              currentScreen === 'block_apps' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Block Apps
          </button>
          <button
            onClick={() => { sound.playClick(); setCurrentScreen('dashboard'); }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
              currentScreen === 'dashboard' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            4. Dashboard
          </button>
          <button
            onClick={() => { sound.playClick(); setCurrentScreen('settings'); }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
              currentScreen === 'settings' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            5. Settings
          </button>
          <button
            onClick={() => { sound.playClick(); setCurrentScreen('premium'); }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
              currentScreen === 'premium' ? 'bg-amber-400 text-black font-bold' : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            6. Pro VIP
          </button>
          <button
            onClick={() => { sound.playClick(); setCurrentScreen('reward_ad'); }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
              currentScreen === 'reward_ad' ? 'bg-pink-500 text-white font-bold' : 'text-pink-400/80 hover:text-pink-300'
            }`}
          >
            7. Ad Boost
          </button>

          {/* Toggle Device Frame / Fullscreen view */}
          <button
            onClick={() => setDeviceFrame(!deviceFrame)}
            className="p-1.5 text-slate-400 hover:text-cyan-300 ml-1 rounded-lg hover:bg-slate-800"
            title={deviceFrame ? 'Expand to Fullscreen' : 'Show Phone Chassis'}
          >
            {deviceFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Container / Mobile Chassis */}
      <main className={`relative z-10 w-full transition-all duration-300 flex flex-col ${
        deviceFrame 
          ? 'max-w-[420px] h-[100dvh] sm:h-[840px] sm:max-h-[92vh] sm:rounded-[42px] sm:border-[8px] sm:border-[#141b2e] sm:shadow-[0_0_50px_rgba(0,191,255,0.25),0_0_100px_rgba(0,0,0,0.9)] overflow-hidden bg-[#050A1A]' 
          : 'max-w-md h-[100dvh] bg-[#050A1A]'
      }`}>
        {/* Subtle Cyber Corner Accents for Phone Chassis */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-[#141b2e] rounded-b-xl z-50 pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-[#050A1A] mx-auto mt-0.5 border border-slate-700" />
        </div>

        {/* Immersive Top App Bar */}
        <TopAppBar />

        {/* Dynamic Screen View */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {renderActiveScreen()}
        </div>

        {/* Banner Ad fixed at bottom above Bottom Navigation */}
        <BannerAd />

        {/* Bottom Nav Bar (Monitor, Block Apps, Boost, PRO, Settings) */}
        <BottomNavBar />
      </main>

      {/* Footer Feature Pills (Matching Reference Image Bottom Feature Row) */}
      <footer className="w-full max-w-4xl px-4 py-2 hidden sm:flex items-center justify-center space-x-2 text-[10px] text-slate-400 font-mono z-30">
        <span className="flex items-center space-x-1 text-cyan-400">
          <Zap className="w-3 h-3" />
          <span>60/90/120 FPS Support</span>
        </span>
        <span>•</span>
        <span className="flex items-center space-x-1 text-emerald-400">
          <Flame className="w-3 h-3" />
          <span>Full Graphics Optimization</span>
        </span>
        <span>•</span>
        <span className="flex items-center space-x-1 text-cyan-400">
          <Shield className="w-3 h-3" />
          <span>VPN Firewall Protection</span>
        </span>
        <span>•</span>
        <span className="flex items-center space-x-1 text-amber-400">
          <Crown className="w-3 h-3" />
          <span>VIP Esports Performance • AdMob Boost</span>
        </span>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <BoosterProvider>
      <MainAppContent />
    </BoosterProvider>
  );
}
