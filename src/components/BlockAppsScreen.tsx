import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Search, 
  Check, 
  Zap, 
  Activity, 
  Sparkles,
  Smartphone,
  CheckCircle2,
  X
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { RealAppIcon } from './AppIcons.tsx';

export const BlockAppsScreen: React.FC = () => {
  const { 
    appsList, 
    toggleAppBlock, 
    toggleAllAppsBlock, 
    applyVpnFirewall 
  } = useBooster();

  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort by Most Data Usage First
  const sortedApps = [...appsList].sort((a, b) => b.blockedDataMb - a.blockedDataMb);

  // Filter by search query
  const filteredApps = sortedApps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const blockedCount = appsList.filter(a => a.isBlocked).length;
  const totalBlockedData = appsList
    .filter(a => a.isBlocked)
    .reduce((sum, a) => sum + a.blockedDataMb, 0)
    .toFixed(1);

  const handleApplyFirewall = () => {
    applyVpnFirewall();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-20 pt-1 space-y-3.5">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-cyan-900 border border-cyan-400 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl shadow-cyan-950 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Block VPN Firewall Active! {blockedCount} Apps Blocked</span>
        </div>
      )}

      {/* Top Graphic: Glowing Blue Shield */}
      <div className="flex flex-col items-center justify-center pt-1 pb-1 relative">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-2xl animate-pulse" />
          
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-cyan-500/20 to-blue-900/40 border border-cyan-400/50 flex items-center justify-center relative shadow-2xl shadow-cyan-900/60 overflow-hidden">
            <img 
              src="/assets/shield_glow.png" 
              alt="VPN Shield" 
              className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(0,191,255,0.9)]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Shield className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,229,255,0.8)]" />
          </div>
        </div>

        <div className="text-center mt-2">
          <h2 className="font-orbitron font-extrabold text-base text-white">
            Background Data Blocker
          </h2>
          <p className="text-[11px] text-cyan-300/80 max-w-xs mt-0.5">
            Block Internet for Selected Apps During Gaming
          </p>
        </div>

        {/* Local VPN Firewall Status Badge */}
        <div className="mt-2 flex items-center space-x-3 text-xs bg-[#071333] border border-cyan-900/60 px-3.5 py-1 rounded-full">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-mono text-[11px]">VPN Firewall:</span>
            <span className="text-emerald-400 font-bold font-mono text-[11px]">ACTIVE</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-cyan-400 font-mono text-[11px]">
            {totalBlockedData} MB Saved
          </div>
        </div>
      </div>

      {/* CRITICAL FIX 5: SEARCH BAR ON TOP */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-cyan-400" />
        </div>
        <input
          type="text"
          placeholder="Search Apps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#071129]/95 border border-cyan-900/80 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Select All Controls & Counts */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-orbitron font-semibold text-slate-300">
          Installed Apps ({blockedCount}/{appsList.length} Blocked)
        </span>
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => toggleAllAppsBlock(true)}
            className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] font-bold underline"
          >
            Block All
          </button>
          <span className="text-slate-600">•</span>
          <button
            onClick={() => toggleAllAppsBlock(false)}
            className="text-slate-400 hover:text-slate-200 font-mono text-[11px] font-bold underline"
          >
            Allow All
          </button>
        </div>
      </div>

      {/* CRITICAL FIX 1: REAL 48x48 ROUNDED SQUARE APP ICONS (NEVER TEXT LETTERS) */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-2 shadow-xl divide-y divide-cyan-950/70 max-h-[380px] overflow-y-auto">
        {filteredApps.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs font-mono">
            No matching apps found for &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredApps.map(app => (
            <div 
              key={app.id} 
              className="py-2 px-2 flex items-center justify-between hover:bg-cyan-950/20 rounded-xl transition-colors"
            >
              <div className="flex items-center space-x-3">
                {/* Real App Icon: 48x48 rounded square */}
                <RealAppIcon 
                  name={app.name} 
                  packageName={app.packageName} 
                  iconName={app.iconName} 
                  size={48} 
                />

                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <span>{app.name}</span>
                    {app.isBlocked && (
                      <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-800/40 px-1 rounded font-mono font-bold">
                        BLOCKED
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-cyan-300/80 font-mono">
                    Saved ~{app.blockedDataMb} MB
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleAppBlock(app.id)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                  app.isBlocked ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-slate-700'
                }`}
              >
                <div 
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    app.isBlocked ? 'translate-x-5' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Button: Block Selected Apps */}
      <button
        onClick={handleApplyFirewall}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 text-white font-orbitron font-extrabold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(0,191,255,0.7)] hover:shadow-[0_0_35px_rgba(0,191,255,0.9)] transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
      >
        <Shield className="w-4 h-4 text-white fill-white/20" />
        <span>Block Selected Apps</span>
      </button>
    </div>
  );
};
