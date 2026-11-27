import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  ToggleLeft,
  ToggleRight,
  Cloud,
  Activity,
  AlertTriangle,
  Cpu,
  Smartphone,
} from 'lucide-react';
import { useBooster } from '../context/BoosterContext.tsx';
import { sound } from '../utils/audio.ts';

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    transactions,
    approveTransaction,
    rejectTransaction,
    autoApproveEnabled,
    setAutoApproveEnabled,
    cloudBackend,
    performanceReports,
    crashDiagnostics,
    deviceCapabilities,
    displayInfo,
    state,
    syncCloudBackend,
  } = useBooster();

  const [activeTab, setActiveTab] = useState<'diagnostics' | 'records'>('diagnostics');
  const pendingRecords = transactions.filter((t) => t.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#071126] border-2 border-cyan-500/70 rounded-3xl p-5 shadow-2xl shadow-cyan-950/80 max-h-[92vh] flex flex-col relative text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-950/80">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-400 text-black flex items-center justify-center font-bold shadow-lg shadow-cyan-400/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-orbitron font-extrabold text-sm text-white flex items-center space-x-1.5">
                <span>ADMIN &amp; DIAGNOSTICS</span>
                <span className="text-[9px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.2 rounded font-mono font-bold">
                  CLOUD PORTAL
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Global Game Booster • Telemetry &amp; Firestore Health
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Review Switch */}
        <div className="my-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#03152e] via-[#041c3d] to-[#03152e] border border-cyan-500/50 flex items-center justify-between shadow-lg">
          <div className="max-w-[75%]">
            <div className="flex items-center space-x-1.5">
              <span className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                CLOUD DIAGNOSTIC AUTO-SYNC
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  autoApproveEnabled
                    ? 'bg-emerald-400 text-black'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {autoApproveEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
              {autoApproveEnabled
                ? 'Automatically syncs session telemetry and cloud records.'
                : 'Manual review mode active for Firestore log entries.'}
            </p>
          </div>

          <button
            onClick={() => {
              sound.playToggle(!autoApproveEnabled);
              setAutoApproveEnabled(!autoApproveEnabled);
            }}
            className="cursor-pointer text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Toggle Auto-Sync Mode"
          >
            {autoApproveEnabled ? (
              <ToggleRight className="w-10 h-10 text-emerald-400 fill-emerald-400/20" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-slate-500" />
            )}
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#030919] p-1 rounded-xl mb-3 border border-cyan-950">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('diagnostics');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud Diagnostics</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('records');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'records'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Cloud Records ({pendingRecords.length})</span>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activeTab === 'diagnostics' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-3 rounded-2xl bg-[#040e24] border border-cyan-900/60">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[10px]">
                    <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                    <span>FIRESTORE</span>
                  </div>
                  <div className="font-orbitron font-bold text-sm text-white mt-1">
                    {cloudBackend.status === 'connected'
                      ? `Online (${cloudBackend.rttMs ?? '--'}ms)`
                      : cloudBackend.status.toUpperCase()}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#040e24] border border-cyan-900/60">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[10px]">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>DISPLAY &amp; CORES</span>
                  </div>
                  <div className="font-orbitron font-bold text-sm text-emerald-300 mt-1">
                    {displayInfo.maxHz}Hz · {deviceCapabilities.cpuCores}c
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#040e24] border border-cyan-900/60">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[10px]">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PERF REPORTS</span>
                  </div>
                  <div className="font-orbitron font-bold text-sm text-cyan-300 mt-1">
                    {performanceReports.length} Logged
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#040e24] border border-cyan-900/60">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>CRASH DIAGNOSTICS</span>
                  </div>
                  <div className="font-orbitron font-bold text-sm text-amber-300 mt-1">
                    {crashDiagnostics.length} Recorded
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#040e24] border border-cyan-900/60 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center space-x-1.5 text-cyan-300 font-bold uppercase text-[10px]">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Runtime State</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Ad-Supported Edition:</span>
                  <span className="text-emerald-400 font-bold">100% Free</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Ads Watched:</span>
                  <span className="text-white font-bold">{state.totalAdsWatched ?? 0}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Config Version:</span>
                  <span className="text-cyan-300">{cloudBackend.remoteConfig.configVersion}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  syncCloudBackend();
                }}
                className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider cursor-pointer"
              >
                Re-Sync Cloud Telemetry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-cyan-300 font-orbitron uppercase tracking-wider">
                  Firestore Audit Log
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {transactions.length} Total
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#040c1f] border border-cyan-950 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    100% Free Ad-Supported Edition — no pending cloud audit records.
                  </p>
                </div>
              ) : (
                transactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl border bg-[#040e26] border-cyan-900/60 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-2 py-0.5 rounded font-mono font-bold">
                          {t.packageName}
                        </span>
                        <h4 className="font-bold text-xs text-white pt-1">{t.senderName}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(t.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-800">
                        {t.status}
                      </span>
                    </div>

                    {t.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => approveTransaction(t.id)}
                          className="py-2 rounded-xl bg-emerald-500 text-black font-orbitron font-bold text-xs uppercase flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify</span>
                        </button>
                        <button
                          onClick={() => rejectTransaction(t.id, 'Dismissed by admin')}
                          className="py-2 rounded-xl bg-red-950 border border-red-500/60 text-red-300 font-orbitron font-bold text-xs uppercase flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
