import React, { useState, useMemo } from 'react';
import {
  Gamepad2,
  RefreshCw,
  Search,
  Star,
  Play,
  Download,
  Sliders,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';
import { haptics } from '../utils/haptics.ts';
import { FPSMode, GameItem, OptimizationProfileMode } from '../types.ts';
import { resolveNumericFps } from '../utils/gamingEngine.ts';
import { RealAppIcon } from './AppIcons.tsx';

type GameTab = 'all' | 'installed' | 'favorites' | 'recent';

export const GameLibrary: React.FC = () => {
  const {
    state,
    gamesList,
    perGameProfiles,
    updatePerGameProfile,
    refreshInstalledPackages,
    isRefreshingPackages,
    catalogSource,
    favoriteGamePackages,
    recentGamePackages,
    toggleFavoriteGame,
    launchSelectedGame,
    installGameFromStore,
    selectedSuperBoostGamePkg,
    setSelectedSuperBoostGamePkg,
  } = useBooster();

  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [gameFilterTab, setGameFilterTab] = useState<GameTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedGamePkg, setExpandedGamePkg] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['All']);
    for (const g of gamesList) {
      if (g.category && g.category.trim()) {
        cats.add(g.category.trim());
      }
    }
    return Array.from(cats);
  }, [gamesList]);

  const installedCount = useMemo(
    () => gamesList.filter((g) => g.isInstalled).length,
    [gamesList]
  );

  const { installedFiltered, catalogFiltered } = useMemo(() => {
    const q = gameSearchQuery.trim().toLowerCase();
    const matches = gamesList.filter((g) => {
      if (gameFilterTab === 'installed' && !g.isInstalled) return false;
      if (gameFilterTab === 'favorites' && !favoriteGamePackages.includes(g.packageName)) return false;
      if (gameFilterTab === 'recent' && !recentGamePackages.includes(g.packageName)) return false;
      if (
        selectedCategory !== 'All' &&
        (g.category || 'Games').toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.packageName.toLowerCase().includes(q) ||
        (g.genre || '').toLowerCase().includes(q) ||
        (g.category || '').toLowerCase().includes(q)
      );
    });

    const sortList = (arr: GameItem[]) => {
      if (gameFilterTab === 'recent') {
        return [...arr].sort(
          (a, b) =>
            recentGamePackages.indexOf(a.packageName) -
            recentGamePackages.indexOf(b.packageName)
        );
      }
      return [...arr].sort((a, b) => {
        const aFav = favoriteGamePackages.includes(a.packageName) ? 1 : 0;
        const bFav = favoriteGamePackages.includes(b.packageName) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
        return a.name.localeCompare(b.name);
      });
    };

    return {
      installedFiltered: sortList(matches.filter((g) => Boolean(g.isInstalled))),
      catalogFiltered:
        gameFilterTab === 'installed'
          ? []
          : sortList(matches.filter((g) => !g.isInstalled)),
    };
  }, [
    gamesList,
    gameSearchQuery,
    gameFilterTab,
    selectedCategory,
    favoriteGamePackages,
    recentGamePackages,
  ]);

  const selectedGameObj =
    gamesList.find((g) => g.packageName === selectedSuperBoostGamePkg) || gamesList[0];

  const selectedProf = selectedGameObj
    ? perGameProfiles[selectedGameObj.packageName] || {
        gamePackage: selectedGameObj.packageName,
        profileMode: state.activeProfile,
        targetFps: state.activeFps,
        resolutionScale: state.resolutionScale,
        firewallPreset: 'custom',
        updatedAt: Date.now(),
      }
    : null;

  const renderGameRow = (g: GameItem) => {
    const isFav = favoriteGamePackages.includes(g.packageName);
    const isTargeted = selectedSuperBoostGamePkg === g.packageName;
    const isExpanded = expandedGamePkg === g.packageName;
    const gameProf = perGameProfiles[g.packageName] || {
      gamePackage: g.packageName,
      profileMode: state.activeProfile,
      targetFps: state.activeFps,
      resolutionScale: state.resolutionScale,
      firewallPreset: 'custom',
      updatedAt: Date.now(),
    };
    const gameFps = resolveNumericFps(gameProf.targetFps, state.maxHardwareHz);
    const cycleFps: FPSMode =
      gameProf.targetFps === '60' ? '90' : gameProf.targetFps === '90' ? '120' : '60';
    const cycleMode: OptimizationProfileMode =
      gameProf.profileMode === 'SMART_BOOST'
        ? 'PERFORMANCE_MODE'
        : gameProf.profileMode === 'PERFORMANCE_MODE'
        ? 'EXTREME_MODE'
        : gameProf.profileMode === 'EXTREME_MODE'
        ? 'BATTERY_SAVER'
        : 'SMART_BOOST';

    return (
      <div
        key={g.id}
        className={`p-2 rounded-xl bg-[#040c1f] border transition-colors space-y-1.5 ${
          isTargeted
            ? 'border-cyan-400/70 shadow-[0_0_12px_rgba(6,182,212,0.18)]'
            : 'border-cyan-950/90 hover:border-cyan-700/70'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div
            onClick={() => {
              haptics.selection();
              setSelectedSuperBoostGamePkg(g.packageName);
              setExpandedGamePkg(isExpanded ? null : g.packageName);
            }}
            className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer"
          >
            <RealAppIcon
              name={g.name}
              packageName={g.packageName}
              iconName={g.name}
              iconDataUrl={g.iconDataUrl}
              size={38}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="font-orbitron font-bold text-[11px] text-white truncate">
                  {g.name}
                </span>
                <span
                  className={`text-[8px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                    g.isInstalled
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-700/60'
                  }`}
                >
                  {g.isInstalled ? 'Installed' : 'Catalog Preview'}
                </span>
                {isTargeted && (
                  <ShieldCheck
                    className="w-3 h-3 text-cyan-400 shrink-0"
                    aria-label="Protected Game"
                  />
                )}
              </div>
              <div className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                {g.genre} · {gameFps} FPS · {gameProf.profileMode.replace('_MODE', '').replace('_', ' ')}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setExpandedGamePkg(isExpanded ? null : g.packageName);
              }}
              aria-label={`Optimize ${g.name}`}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                isExpanded
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-[#071129] border-slate-800 text-slate-400 hover:border-cyan-600'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                toggleFavoriteGame(g.packageName);
              }}
              aria-label={isFav ? `Unfavorite ${g.name}` : `Favorite ${g.name}`}
              className="p-1.5 rounded-lg bg-[#071129] border border-slate-800 hover:border-amber-400/60 cursor-pointer"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
                }`}
              />
            </button>
            {g.isInstalled ? (
              <button
                type="button"
                onClick={() => {
                  haptics.impactMedium();
                  launchSelectedGame(g);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/70 hover:bg-emerald-500/30 text-emerald-200 font-orbitron font-bold text-[9px] uppercase flex items-center space-x-1 cursor-pointer"
              >
                <Play className="w-2.5 h-2.5 fill-emerald-300 text-emerald-300" />
                <span>Launch</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  installGameFromStore(g);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-500/60 hover:bg-cyan-900/90 text-cyan-200 font-orbitron font-bold text-[9px] uppercase flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-2.5 h-2.5 text-cyan-300" />
                <span>Install</span>
              </button>
            )}
          </div>
        </div>

        {/* Per-Game Targeted Optimization Drawer */}
        {isExpanded && (
          <div className="pt-1.5 border-t border-cyan-950/80 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[9px] font-mono text-cyan-300 truncate max-w-[140px]">
              {g.packageName}
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  updatePerGameProfile(g.packageName, { targetFps: cycleFps });
                }}
                className="px-2 py-1 rounded-lg bg-cyan-950 border border-cyan-700/60 text-cyan-300 text-[9px] font-mono font-bold cursor-pointer"
              >
                Target: {gameProf.targetFps} FPS
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  updatePerGameProfile(g.packageName, { profileMode: cycleMode });
                }}
                className="px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[9px] font-mono font-bold cursor-pointer"
              >
                {gameProf.profileMode.replace('_MODE', '').replace('_', ' ')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pt-1 border-t border-cyan-950/80 space-y-2.5">
      {/* Global Game Library Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-orbitron font-bold text-white uppercase tracking-wider truncate">
            Game Library
          </span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.5 rounded">
            {catalogSource === 'android_packagemanager'
              ? `PackageManager (${installedCount})`
              : 'Catalog Preview'}
          </span>
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              sound.playClick();
              refreshInstalledPackages();
            }}
            disabled={isRefreshingPackages}
            className="px-2 py-0.5 rounded-lg bg-[#040c1f] border border-cyan-700/60 text-cyan-300 hover:border-cyan-400 text-[9px] font-mono font-bold flex items-center space-x-1 cursor-pointer disabled:opacity-60"
            title="Scan device games via PackageManager"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isRefreshingPackages ? 'animate-spin' : ''}`} />
            <span>Scan</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={gameSearchQuery}
          onChange={(e) => setGameSearchQuery(e.target.value)}
          placeholder="Search installed games, genre, or package..."
          className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#040c1f] border border-cyan-900/70 text-[11px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
        {gameSearchQuery && (
          <button
            type="button"
            onClick={() => setGameSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Clear game search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Primary Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-[#040c1f] p-1 rounded-xl border border-cyan-950 text-[9px] font-mono font-bold">
        {(
          [
            { id: 'all', label: `All (${gamesList.length})` },
            { id: 'installed', label: `Installed (${installedCount})` },
            { id: 'favorites', label: `Favs (${favoriteGamePackages.length})` },
            { id: 'recent', label: `Recent (${recentGamePackages.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              haptics.selection();
              setGameFilterTab(tab.id);
            }}
            className={`py-1 px-1 rounded-lg truncate cursor-pointer ${
              gameFilterTab === tab.id ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Genre / Category Filter Row */}
      {availableCategories.length > 2 && (
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                haptics.selection();
                setSelectedCategory(cat);
              }}
              className={`px-2 py-0.5 rounded-lg border text-[9px] font-mono font-bold whitespace-nowrap cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-[#040c1f] border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Separated Scrollable Game Lists: Installed Games ALWAYS first, Catalog Preview separated below */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
        {installedFiltered.length === 0 && catalogFiltered.length === 0 ? (
          <div className="py-5 text-center text-[10px] font-mono text-slate-400 bg-[#040c1f] rounded-xl border border-slate-800">
            {gameFilterTab === 'installed'
              ? 'No installed games detected yet (Web Preview separates Catalog Preview below).'
              : gameFilterTab === 'favorites'
              ? 'Tap the star icon on any game to pin it to Favorites.'
              : gameFilterTab === 'recent'
              ? 'Launch any installed game to track your Recent gaming sessions.'
              : 'No matching games found.'}
          </div>
        ) : (
          <>
            {installedFiltered.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-orbitron font-bold text-emerald-300 uppercase tracking-wider">
                    Installed Games ({installedFiltered.length})
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400/80">
                    Launch Supported
                  </span>
                </div>
                {installedFiltered.map(renderGameRow)}
              </div>
            )}

            {catalogFiltered.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-orbitron font-bold text-cyan-300 uppercase tracking-wider">
                    Catalog Preview ({catalogFiltered.length})
                  </span>
                  <span className="text-[8px] font-mono text-slate-400">
                    Tap Install for Play Store
                  </span>
                </div>
                {catalogFiltered.map(renderGameRow)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Targeted Profile Bar for Currently Protected Game */}
      {selectedGameObj && selectedProf && (
        <div className="bg-[#040c1f] border border-cyan-950/90 rounded-xl p-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedGameObj.packageName}
              onChange={(e) => {
                haptics.selection();
                setSelectedSuperBoostGamePkg(e.target.value);
              }}
              aria-label="Select Protected Game Profile"
              className="bg-[#071129] border border-cyan-900/70 text-[10px] font-mono text-white rounded-lg px-2 py-1 focus:outline-none max-w-[155px] truncate"
            >
              {gamesList.map((g) => (
                <option key={g.id} value={g.packageName}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                const nextFps: FPSMode =
                  selectedProf.targetFps === '60'
                    ? '90'
                    : selectedProf.targetFps === '90'
                    ? '120'
                    : '60';
                updatePerGameProfile(selectedGameObj.packageName, { targetFps: nextFps });
              }}
              className="px-2 py-1 rounded-lg bg-cyan-950 border border-cyan-700/60 text-cyan-300 text-[9px] font-mono font-bold cursor-pointer"
            >
              {selectedProf.targetFps} FPS
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                const nextMode: OptimizationProfileMode =
                  selectedProf.profileMode === 'SMART_BOOST'
                    ? 'PERFORMANCE_MODE'
                    : selectedProf.profileMode === 'PERFORMANCE_MODE'
                    ? 'BATTERY_SAVER'
                    : 'SMART_BOOST';
                updatePerGameProfile(selectedGameObj.packageName, { profileMode: nextMode });
              }}
              className="px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[9px] font-mono font-bold cursor-pointer"
            >
              {selectedProf.profileMode.replace('_MODE', '').replace('_', ' ')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
