import React, { useState } from 'react';
import {
  Shield,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { RealAppIcon } from './AppIcons.tsx';

export const BlockAppsScreen: React.FC = () => {
  const {
    appsList,
    toggleAppBlock,
    toggleAllAppsBlock,
    applyVpnFirewall,
  } = useBooster();

  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep Blocked apps grouped cleanly at top, then Allowed apps
  const sortedApps = [...appsList].sort((a, b) => {
    if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
    return b.blockedDataMb - a.blockedDataMb;
  });

  // Filter by search query
  const filteredApps = sortedApps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const blockedCount = appsList.filter((a) => a.isBlocked).length;

  const handleImmediateToggle = (appId: string) => {
    toggleAppBlock(appId);
    applyVpnFirewall();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-1 space-y-3.5">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-cyan-900 border border-cyan-400 text-white px-5 py-2 rounded-full text-xs font-bold shadow-2xl shadow-cyan-950 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Firewall Updated • {blockedCount}/{appsList.length} Blocked</span>
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
            Block Background Internet for Selected Apps During Gaming
          </p>
        </div>

        {/* Local VPN Firewall Status Badge */}
        <div className="mt-2 flex items-center flex-wrap justify-center gap-2 text-xs bg-[#071333] border border-cyan-900/60 px-3.5 py-1.5 rounded-full">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-mono text-[11px]">VPN Firewall:</span>
            <span className="text-emerald-400 font-bold font-mono text-[11px]">ACTIVE</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-cyan-400 font-mono text-[11px]">
            Data Saved: Estimated
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-cyan-400" />
        </div>
        <input
          type="text"
          placeholder="Search Apps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#071129]/95 border border-cyan-900/80 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Select All Controls & Dynamic Counts */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-orbitron font-semibold text-slate-200">
          Installed Apps ({blockedCount}/{appsList.length} Blocked)
        </span>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              toggleAllAppsBlock(true);
              applyVpnFirewall();
            }}
            className="px-2.5 py-1 rounded-lg bg-red-950/70 border border-red-500/50 text-red-300 hover:bg-red-900/80 font-mono text-[11px] font-bold cursor-pointer"
          >
            Block All
          </button>
          <button
            type="button"
            onClick={() => {
              toggleAllAppsBlock(false);
              applyVpnFirewall();
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80 font-mono text-[11px] font-bold cursor-pointer"
          >
            Allow All
          </button>
        </div>
      </div>

      {/* All 25 Apps Scrollable List */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-2 shadow-xl divide-y divide-cyan-950/70 max-h-[380px] overflow-y-auto">
        {filteredApps.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs font-mono">
            No matching apps found for &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredApps.map((app) => {
            const isAllowed = !app.isBlocked;

            return (
              <div
                key={app.id}
                className="py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-cyan-950/20 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <RealAppIcon
                    name={app.name}
                    packageName={app.packageName}
                    iconName={app.iconName}
                    size={48}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <h4 className="text-xs font-bold text-slate-100">
                        {app.name}
                      </h4>
                      {isAllowed ? (
                        <span className="text-[9px] bg-emerald-950/90 text-emerald-400 border border-emerald-500/50 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                          ALLOWED
                        </span>
                      ) : (
                        <span className="text-[9px] bg-red-950/90 text-red-400 border border-red-500/60 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-cyan-300/80 font-mono mt-0.5">
                      Background Data: {app.isBlocked ? 'Restricted (Estimated)' : 'Normal Access'}
                    </p>
                  </div>
                </div>

                {/* Unified Toggle Logic: ON = Green (ALLOWED), OFF = Red/Grey (BLOCKED) */}
                <button
                  type="button"
                  onClick={() => handleImmediateToggle(app.id)}
                  aria-label={`${app.name} ${isAllowed ? 'Allowed' : 'Blocked'}`}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                    isAllowed
                      ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                      : 'bg-red-600/80 border border-red-400/50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                      isAllowed ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
