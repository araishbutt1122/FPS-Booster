import React, { useState } from 'react';
import {
  Shield,
  Search,
  CheckCircle2,
  X,
  Gamepad2,
  RotateCcw,
  KeyRound,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { RealAppIcon } from './AppIcons.tsx';
import { formatBytesCompact } from '../utils/gamingEngine.ts';

export const BlockAppsScreen: React.FC = () => {
  const {
    appsList,
    gamesList,
    toggleAppBlock,
    toggleAllAppsBlock,
    applyVpnFirewall,
    firewallState,
    toggleFirewallMaster,
    requestFirewallVpnPermission,
    setProtectedGame,
    applyFirewallPreset,
    restorePreviousFirewallRules,
  } = useBooster();

  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'blocked' | 'allowed'>('all');

  // Keep Blocked apps grouped cleanly at top, then Allowed apps
  const sortedApps = [...appsList].sort((a, b) => {
    if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
    return b.blockedDataMb - a.blockedDataMb;
  });

  // Filter by tab + search query
  const filteredApps = sortedApps.filter((app) => {
    if (filterTab === 'blocked' && !app.isBlocked) return false;
    if (filterTab === 'allowed' && app.isBlocked) return false;
    const q = searchQuery.toLowerCase();
    return (
      app.name.toLowerCase().includes(q) ||
      app.packageName.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q)
    );
  });

  const blockedCount = appsList.filter((a) => a.isBlocked).length;
  const allowedCount = appsList.length - blockedCount;

  const handleImmediateToggle = (appId: string) => {
    toggleAppBlock(appId);
    applyVpnFirewall();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 space-y-3.5">
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
            Local Android VPN Firewall • Zero Remote Proxy / Zero Payload Inspection
          </p>
        </div>

        {/* Local VPN Firewall Master Switch & Blocked Data Badge */}
        <div className="mt-2 w-full bg-[#071333] border border-cyan-800/70 rounded-2xl p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${firewallState.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <div>
                <span className="text-xs font-orbitron font-bold text-white block leading-tight">
                  Local VPN Firewall {firewallState.enabled ? (firewallState.isNativeAndroid && !firewallState.hasVpnPermission ? '(Needs Permit)' : 'ON') : 'OFF'}
                </span>
                <span className="text-[10px] text-cyan-300/80 font-mono block">
                  {firewallState.isNativeAndroid
                    ? firewallState.hasVpnPermission
                      ? `Blocked Data: ${formatBytesCompact(firewallState.blockedBytesTotal)} • Calls/Alarms Safe`
                      : 'Tap VPN Permit to enable packet blocking on Android'
                    : 'Preview Rules Saved • Active VPN Packet Blocking Requires Android APK'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleFirewallMaster}
              aria-label="Master Firewall Toggle"
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                firewallState.enabled ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-600'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${firewallState.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Selected Game Protection + VPN Permission + Restore */}
          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-cyan-950/80 flex-wrap">
            <div className="flex items-center space-x-1.5 min-w-0 flex-1">
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                value={firewallState.protectedGamePkg}
                onChange={(e) => {
                  const found = gamesList.find(g => g.packageName === e.target.value);
                  if (found) setProtectedGame(found);
                }}
                aria-label="Protected Game Package"
                className="bg-[#030b1d] border border-emerald-700/60 text-emerald-300 text-[10px] font-mono rounded-lg px-2 py-1 focus:outline-none truncate max-w-[170px]"
              >
                {gamesList.map((g) => (
                  <option key={g.id} value={g.packageName}>
                    Protect: {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {firewallState.isNativeAndroid && !firewallState.hasVpnPermission && (
                <button
                  type="button"
                  onClick={requestFirewallVpnPermission}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 font-mono text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>VPN Permit</span>
                </button>
              )}
              {firewallState.hasPreviousSnapshot && (
                <button
                  type="button"
                  onClick={restorePreviousFirewallRules}
                  className="px-2 py-1 rounded-lg bg-slate-800 border border-cyan-800/60 text-cyan-300 font-mono text-[10px] font-bold flex items-center space-x-1 cursor-pointer hover:bg-slate-700"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
              )}
            </div>
          </div>

          {/* Auto Gaming Firewall Presets */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => applyFirewallPreset('esports_strict')}
              className={`py-1.5 px-2 rounded-xl border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                firewallState.preset === 'esports_strict'
                  ? 'bg-red-950/80 border-red-400 text-red-200'
                  : 'bg-[#040d21] border-slate-800 text-slate-300 hover:border-cyan-700'
              }`}
            >
              Esports Strict (Block All BG)
            </button>
            <button
              type="button"
              onClick={() => applyFirewallPreset('social_keep')}
              className={`py-1.5 px-2 rounded-xl border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                firewallState.preset === 'social_keep'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                  : 'bg-[#040d21] border-slate-800 text-slate-300 hover:border-cyan-700'
              }`}
            >
              Keep Chat • Block Media
            </button>
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

      {/* Allowed / Blocked Filter Tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#040b1d] p-1 rounded-xl border border-cyan-950 text-[10px] font-mono font-bold">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`py-1 rounded-lg cursor-pointer ${filterTab === 'all' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'}`}
        >
          All ({appsList.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('blocked')}
          className={`py-1 rounded-lg cursor-pointer ${filterTab === 'blocked' ? 'bg-red-500 text-white' : 'text-red-300 hover:text-white'}`}
        >
          Blocked ({blockedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('allowed')}
          className={`py-1 rounded-lg cursor-pointer ${filterTab === 'allowed' ? 'bg-emerald-500 text-black' : 'text-emerald-300 hover:text-white'}`}
        >
          Allowed ({allowedCount})
        </button>
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
