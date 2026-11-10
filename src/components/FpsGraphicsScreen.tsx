import React, { useState } from 'react';
import { 
  Flame, 
  Info, 
  Crown, 
  Check, 
  Sparkles, 
  Zap, 
  Sliders, 
  Layers, 
  Cpu, 
  CheckCircle2 
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { FPSMode } from '../types.ts';

export const FpsGraphicsScreen: React.FC = () => {
  const { 
    state, 
    setFpsMode, 
    applyGraphicsSettings, 
    setCurrentScreen 
  } = useBooster();

  const [selectedFps, setSelectedFps] = useState<FPSMode>(state.activeFps);
  const [graphicsOpt, setGraphicsOpt] = useState(state.graphicsOptimized);
  const [perfMode, setPerfMode] = useState(state.performanceMode);
  const [reduceLag, setReduceLag] = useState(state.reduceLag);
  const [improveRendering, setImproveRendering] = useState(state.improveRendering);
  const [antiAliasing, setAntiAliasing] = useState(state.antiAliasing);
  const [appliedToast, setAppliedToast] = useState(false);

  const handleSelectFps = (mode: FPSMode) => {
    sound.playClick();
    if (mode === '120' && !state.isPro && !state.isBoosting) {
      setCurrentScreen('premium');
      return;
    }
    setSelectedFps(mode);
  };

  const handleApply = () => {
    sound.playBoost();
    setFpsMode(selectedFps);
    applyGraphicsSettings({
      graphicsOptimized: graphicsOpt,
      performanceMode: perfMode,
      reduceLag: reduceLag,
      improveRendering: improveRendering,
      antiAliasing: antiAliasing,
    });
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-20 pt-1 space-y-4">
      {/* Toast Notification */}
      {appliedToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-cyan-900 border border-cyan-400 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl shadow-cyan-950 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Graphics & {selectedFps} FPS Applied Successfully!</span>
        </div>
      )}

      {/* Top Banner Card: Full Graphics Ultra Performance */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-800/60 shadow-xl shadow-cyan-950/40 bg-gradient-to-r from-[#071330] via-[#0b1f48] to-[#040e24]">
        <div className="p-4 flex items-center justify-between relative z-10">
          <div className="max-w-[65%]">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Full Graphics</span>
            </div>
            <h2 className="font-orbitron font-extrabold text-lg text-white leading-tight">
              Ultra Performance
            </h2>
            <p className="text-[11px] text-cyan-200/80 mt-1">
              Unlock maximum shader processing and eliminate frame stutter.
            </p>
          </div>

          {/* Tactical Soldier Illustration / Cropped Reference Asset */}
          <div className="w-24 h-20 rounded-xl overflow-hidden relative shadow-lg shadow-black/80 border border-cyan-500/40">
            <img 
              src="/assets/soldier_banner.png" 
              alt="Ultra Performance Soldier" 
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/anime_hero.png';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* FPS Mode Selection Section */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-950">
          <div>
            <h3 className="font-orbitron font-bold text-sm text-white">FPS Mode</h3>
            <p className="text-[11px] text-slate-400">Choose your FPS mode</p>
          </div>
          <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Info className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Radio List */}
        <div className="space-y-2.5">
          {/* 60 FPS - Smooth */}
          <div
            onClick={() => handleSelectFps('60')}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              selectedFps === '60'
                ? 'bg-cyan-950/40 border-emerald-400/80 shadow-md shadow-emerald-950/40'
                : 'bg-[#050c1f] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedFps === '60' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
              }`}>
                {selectedFps === '60' && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
              </div>
              <span className="font-orbitron font-bold text-xs text-slate-200">
                60 FPS - Smooth
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
              Low Battery Drain
            </span>
          </div>

          {/* 90 FPS - Ultra */}
          <div
            onClick={() => handleSelectFps('90')}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              selectedFps === '90'
                ? 'bg-cyan-950/40 border-cyan-400/80 shadow-md shadow-cyan-950/40'
                : 'bg-[#050c1f] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedFps === '90' ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
              }`}>
                {selectedFps === '90' && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
              </div>
              <span className="font-orbitron font-bold text-xs text-slate-200">
                90 FPS - Ultra
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
              Competitive
            </span>
          </div>

          {/* 120 FPS - Extreme */}
          <div
            onClick={() => handleSelectFps('120')}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all relative ${
              selectedFps === '120'
                ? 'bg-[#1e0724] border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                : 'bg-[#050c1f] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedFps === '120' ? 'border-pink-400 bg-pink-500' : 'border-slate-600'
              }`}>
                {selectedFps === '120' && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="font-orbitron font-bold text-xs text-slate-100">
                  120 FPS - Extreme
                </span>
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-mono text-pink-300 bg-pink-950/80 px-2 py-0.5 rounded border border-pink-800/40 font-bold">
                Max Hz
              </span>
              {!state.isPro && !state.isBoosting && (
                <span className="text-[9px] bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-bold px-1.5 py-0.5 rounded font-mono">
                  VIP
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Graphics Toggles List */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-4 shadow-xl space-y-3.5">
        <h3 className="font-orbitron font-bold text-xs text-cyan-300 uppercase tracking-wider">
          Rendering & Performance Toggles
        </h3>

        {/* Graphics Optimization */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Graphics Optimization</h4>
              <p className="text-[10px] text-slate-400">Enable full graphics shaders</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playToggle(!graphicsOpt);
              setGraphicsOpt(!graphicsOpt);
            }}
            className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
              graphicsOpt ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${graphicsOpt ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Performance Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Performance Mode</h4>
              <p className="text-[10px] text-slate-400">Max CPU & GPU clock performance</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playToggle(!perfMode);
              setPerfMode(!perfMode);
            }}
            className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
              perfMode ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${perfMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Reduce Lag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Reduce Lag</h4>
              <p className="text-[10px] text-slate-400">Smooth frame pacing & touch latency</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playToggle(!reduceLag);
              setReduceLag(!reduceLag);
            }}
            className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
              reduceLag ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${reduceLag ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Improve Rendering */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Improve Rendering</h4>
              <p className="text-[10px] text-slate-400">Vulkan API shader cache compilation</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playToggle(!improveRendering);
              setImproveRendering(!improveRendering);
            }}
            className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
              improveRendering ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${improveRendering ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Promo Red Banner: Play Smooth No Lag No Delay */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-center shadow-lg shadow-red-950/60 flex items-center justify-center space-x-2">
        <Flame className="w-5 h-5 fill-white text-white animate-pulse" />
        <div>
          <span className="font-orbitron font-black text-sm text-white tracking-wide block">
            Play Smooth
          </span>
          <span className="text-[11px] font-bold text-amber-200 uppercase tracking-widest block -mt-0.5">
            No Lag • No Delay
          </span>
        </div>
      </div>

      {/* Button: Apply Settings */}
      <button
        onClick={handleApply}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 text-white font-orbitron font-extrabold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(0,191,255,0.7)] hover:shadow-[0_0_35px_rgba(0,191,255,0.9)] transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
      >
        <span>Apply Settings</span>
        <Zap className="w-4 h-4 fill-white" />
      </button>
    </div>
  );
};
