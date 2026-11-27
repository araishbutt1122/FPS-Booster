import React, { useState, useMemo } from 'react';
import {
  Shield,
  Search,
  CheckCircle2,
  X,
  Gamepad2,
  RotateCcw,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { RealAppIcon } from './AppIcons.tsx';
import { ESSENTIAL_SYSTEM_PACKAGES, formatBytesCompact } from '../utils/gamingEngine.ts';

const APP_CATEGORIES = ['All', 'Games', 'Social', 'Browsers', 'Entertainment', 'Tools', 'System'] as const;

export const BlockAppsScreen: React.FC = () => {
  const {
    state,
    appsList,
    gamesList,
    toggleAppBlock,
    toggleAllAppsBlock,
    resetAppBlockRules,
    refreshInstalledPackages,
    isRefreshingPackages,
    catalogSource,
    firewallState,
    toggleDnsFilter,
    toggleBlockAllNonSelected,
    requestFirewallVpnPermission,
    setProtectedGame,
    applyFirewallPreset,
    restorePreviousFirewallRules,
    setCurrentScreen,
  } = useBooster();

  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'blocked' | 'allowed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<(typeof APP_CATEGORIES)[number]>('All');
  const [sortBy, setSortBy] = useState<'blocked' | 'name' | 'category'>('blocked');

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = appsList.filter((app) => {
      if (filterTab === 'blocked' && !app.isBlocked) return false;
      if (filterTab === 'allowed' && app.isBlocked) return false;
      if (categoryFilter !== 'All' && app.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.packageName.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') {
        const cmp = a.category.localeCompare(b.category);
        return cmp !== 0 ? cmp : a.name.localeCompare(b.name);
      }
      if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
      return b.blockedDataMb - a.blockedDataMb;
    });
  }, [appsList, filterTab, categoryFilter, searchQuery, sortBy]);

  const blockedCount = appsList.filter((a) => a.isBlocked).length;
  const allowedCount = appsList.length - blockedCount;

  const handleImmediateToggle = (appId: string) => {
    toggleAppBlock(appId);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 space-y-3.5">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-cyan-900 border border-cyan-400 text-white px-5 py-2 rounded-full text-xs font-bold shadow-2xl shadow-cyan-950 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Blocking Rules Saved • {blockedCount}/{appsList.length} Restricted</span>
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
            Rule Settings · Activated Automatically by Master BOOST ON/OFF
          </p>
        </div>

        {/* Read-Only Firewall Integration Status & Rule Controls */}
        <div className="mt-2 w-full bg-[#071333] border border-cyan-800/70 rounded-2xl p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  state.isBoosting && firewallState.enabled
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <div className="min-w-0">
                <span className="text-xs font-orbitron font-bold text-white block leading-tight">
                  {firewallState.isNativeAndroid
                    ? state.isBoosting && firewallState.enabled
                      ? `Android VpnService ACTIVE · L#${firewallState.vpnLayer || 1}/1000`
                      : 'Android VpnService READY · 1000 Layers'
                    : state.isBoosting
                    ? `Local Filter Engine ACTIVE · L#${firewallState.vpnLayer || 1}/1000`
                    : 'Local Filter Rules READY · 1000 Layers'}
                </span>
                <span className="text-[10px] text-cyan-300/80 font-mono block truncate">
                  {firewallState.isNativeAndroid
                    ? firewallState.hasVpnPermission
                      ? `FW L#${firewallState.firewallLayer || 1}/1000 · Blocked: ${formatBytesCompact(firewallState.blockedBytesTotal)} · Calls/Game Safe`
                      : 'Tap VPN Permit to grant Android VpnService permission'
                    : 'Local App Filter & DNS Rules • Android VpnService ready on APK'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentScreen('home')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border shrink-0 cursor-pointer ${
                state.isBoosting
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                  : 'bg-cyan-950/90 border-cyan-600/60 text-cyan-300'
              }`}
            >
              {state.isBoosting ? 'BOOST ON' : 'Use Boost'}
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

          {/* Auto Gaming Firewall Presets + DNS Filtering */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => applyFirewallPreset('esports_strict')}
              className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                firewallState.preset === 'esports_strict'
                  ? 'bg-red-950/80 border-red-400 text-red-200'
                  : 'bg-[#040d21] border-slate-800 text-slate-300 hover:border-cyan-700'
              }`}
            >
              Esports Strict
            </button>
            <button
              type="button"
              onClick={() => applyFirewallPreset('social_keep')}
              className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                firewallState.preset === 'social_keep'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                  : 'bg-[#040d21] border-slate-800 text-slate-300 hover:border-cyan-700'
              }`}
            >
              Keep Chat
            </button>
            <button
              type="button"
              onClick={toggleDnsFilter}
              className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                firewallState.dnsFilterEnabled
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                  : 'bg-[#040d21] border-slate-800 text-slate-400 hover:border-cyan-700'
              }`}
            >
              DNS: {firewallState.dnsFilterEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Strict Mode Toggle: Block all non-selected apps except chosen game & allowed apps */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-cyan-950/70">
            <div className="min-w-0">
              <span className="text-[10px] font-orbitron font-bold text-slate-200 block">
                Block All Non-Selected Apps
              </span>
              <span className="text-[9px] font-mono text-slate-400 block truncate">
                {firewallState.blockAllNonSelected !== false
                  ? 'Every non-whitelisted app blocked · Protected game bypasses VPN'
                  : 'Selective list only · Only toggled-blocked apps enter TUN'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleBlockAllNonSelected}
              className={`px-2.5 py-1 rounded-lg border text-[9px] font-mono font-bold shrink-0 cursor-pointer ${
                firewallState.blockAllNonSelected !== false
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300'
                  : 'bg-[#040d21] border-slate-700 text-slate-300'
              }`}
            >
              {firewallState.blockAllNonSelected !== false ? 'STRICT ON' : 'SELECTIVE'}
            </button>
          </div>

          {/* Protocol & Conflict Diagnostic Line */}
          <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-slate-400 pt-1 border-t border-cyan-950/70 tabular-nums">
            <span>
              {firewallState.conflictDetected
                ? '⚠ External VPN active (conflict)'
                : `Tunnel: ${firewallState.connectionState} (${firewallState.activeTransport})`}
            </span>
            <span className="text-cyan-300">
              TCP {firewallState.blockedTcpPackets} · UDP {firewallState.blockedUdpPackets} · DNS {firewallState.blockedDnsQueries}
            </span>
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

      {/* Category Filter Pills + Source Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-mono text-cyan-300">
            Source: {catalogSource === 'android_packagemanager' ? 'Android PackageManager' : 'Catalog (Web Preview)'}
          </span>
          <div className="flex items-center space-x-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'blocked' | 'name' | 'category')}
              aria-label="Sort apps"
              className="bg-[#040c1f] border border-cyan-900/70 text-[10px] font-mono text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="blocked">Sort: Blocked First</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="category">Sort: Category</option>
            </select>
            <button
              type="button"
              onClick={() => refreshInstalledPackages()}
              disabled={isRefreshingPackages}
              className="px-2 py-1 rounded-lg bg-[#040c1f] border border-cyan-800/70 text-cyan-300 text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingPackages ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5">
          {APP_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold whitespace-nowrap cursor-pointer shrink-0 ${
                categoryFilter === cat
                  ? 'bg-cyan-500 text-black border-cyan-300'
                  : 'bg-[#040b1d] text-slate-300 border-slate-800 hover:border-cyan-700'
              }`}
            >
              {cat === 'All' ? 'All Apps' : cat}
            </button>
          ))}
        </div>
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

      {/* Select All / Reset Controls & Dynamic Counts */}
      <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
        <span className="text-xs font-orbitron font-semibold text-slate-200">
          App Rules ({blockedCount}/{appsList.length} Blocked)
        </span>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              toggleAllAppsBlock(true);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 1800);
            }}
            className="px-2 py-1 rounded-lg bg-red-950/70 border border-red-500/50 text-red-300 hover:bg-red-900/80 font-mono text-[10px] font-bold cursor-pointer"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => {
              toggleAllAppsBlock(false);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 1800);
            }}
            className="px-2 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80 font-mono text-[10px] font-bold cursor-pointer"
          >
            Deselect All
          </button>
          <button
            type="button"
            onClick={() => {
              resetAppBlockRules();
              setShowToast(true);
              setTimeout(() => setShowToast(false), 1800);
            }}
            className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 font-mono text-[10px] font-bold cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scrollable Apps List */}
      <div className="bg-[#071129]/90 border border-cyan-900/50 rounded-2xl p-2 shadow-xl divide-y divide-cyan-950/70 max-h-[380px] overflow-y-auto">
        {filteredApps.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs font-mono">
            No matching apps found for &quot;{searchQuery || categoryFilter}&quot;
          </div>
        ) : (
          filteredApps.map((app) => {
            const isProtectedGame = app.packageName === firewallState.protectedGamePkg;
            const isEssentialSystem = ESSENTIAL_SYSTEM_PACKAGES.has(app.packageName);
            const isNonBlockable = isProtectedGame || isEssentialSystem;
            const isAllowed = isNonBlockable || !app.isBlocked;

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
                    iconDataUrl={app.iconDataUrl}
                    size={44}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <h4 className="text-xs font-bold text-slate-100 truncate">
                        {app.name}
                      </h4>
                      {isProtectedGame ? (
                        <span className="text-[9px] bg-cyan-950/90 text-cyan-300 border border-cyan-400/60 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                          AUTO-EXCLUDED (GAME)
                        </span>
                      ) : isEssentialSystem ? (
                        <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-600 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                          SYSTEM SAFE
                        </span>
                      ) : isAllowed ? (
                        <span className="text-[9px] bg-emerald-950/90 text-emerald-400 border border-emerald-500/50 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                          ALLOWED
                        </span>
                      ) : (
                        <span className="text-[9px] bg-red-950/90 text-red-400 border border-red-500/60 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-cyan-300/80 font-mono mt-0.5 truncate">
                      {app.category} · {app.source === 'android_installed' ? 'Installed' : 'Catalog'} ·{' '}
                      {isNonBlockable
                        ? 'Always Whitelisted'
                        : app.isBlocked
                        ? 'Restricted'
                        : 'Normal Access'}
                    </p>
                  </div>
                </div>

                {/* Unified Toggle Logic: ON = Green (ALLOWED), OFF = Red (BLOCKED) */}
                <button
                  type="button"
                  disabled={isNonBlockable}
                  onClick={() => handleImmediateToggle(app.id)}
                  aria-label={`${app.name} ${isAllowed ? 'Allowed' : 'Blocked'}`}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    isNonBlockable
                      ? 'bg-cyan-600/60 cursor-not-allowed opacity-70'
                      : isAllowed
                      ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] cursor-pointer'
                      : 'bg-red-600/80 border border-red-400/50 cursor-pointer'
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
