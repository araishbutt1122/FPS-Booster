package com.fpsbooster.pro;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.GameManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.TrafficStats;
import android.os.Build;
import android.os.PerformanceHintManager;
import android.os.PowerManager;
import android.os.Process;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.FileReader;
import java.util.Locale;

/**
 * Genuine Android Performance & Network Engine Plugin:
 * - Android Game Mode API (API 31+)
 * - Android Dynamic Performance Framework (ADPF PerformanceHintManager, API 31+)
 * - PowerManager Thermal Status (API 29+) & Thermal Headroom (API 30+)
 * - Display Refresh Rate / Window Preferred Refresh Rate
 * - TrafficStats + ConnectivityManager real bandwidth & transport capabilities
 */
@CapacitorPlugin(name = "GamingEngine")
public class GamingEnginePlugin extends Plugin {
    private Object adpfSessionObj = null;

    @PluginMethod
    public void getDeviceCapabilities(PluginCall call) {
        Context ctx = getContext();
        Activity act = getActivity();

        boolean adpfSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
        boolean gameModeSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
        String gameModeLabel = "UNSUPPORTED";
        long adpfPreferredNanos = 0L;

        if (ctx != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            gameModeLabel = readGameModeLabel(ctx);
            adpfPreferredNanos = readAdpfPreferredRate(ctx);
        }

        int thermalStatus = -1;
        String thermalLabel = "UNAVAILABLE";
        float thermalHeadroom = -1f;
        if (ctx != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                thermalStatus = pm.getCurrentThermalStatus();
                thermalLabel = mapThermalStatus(thermalStatus);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    try {
                        thermalHeadroom = pm.getThermalHeadroom(10);
                    } catch (Exception ignored) {}
                }
            }
        }

        float maxRefreshHz = 60f;
        if (act != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Display d = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? act.getDisplay() : act.getWindowManager().getDefaultDisplay();
            if (d != null) {
                maxRefreshHz = d.getRefreshRate();
                for (Display.Mode m : d.getSupportedModes()) {
                    if (m.getRefreshRate() > maxRefreshHz) {
                        maxRefreshHz = m.getRefreshRate();
                    }
                }
            }
        }

        int cpuCores = Runtime.getRuntime().availableProcessors();
        int cpuCurMhz = readCpuFreqMhz("/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq");
        int cpuMaxMhz = readCpuFreqMhz("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq");

        JSObject ret = new JSObject();
        ret.put("isNativeAndroid", true);
        ret.put("manufacturer", Build.MANUFACTURER);
        ret.put("model", Build.MODEL);
        ret.put("hardware", Build.HARDWARE);
        ret.put("sdkInt", Build.VERSION.SDK_INT);
        ret.put("release", Build.VERSION.RELEASE);
        ret.put("cpuCores", cpuCores);
        ret.put("cpuCurMhz", cpuCurMhz);
        ret.put("cpuMaxMhz", cpuMaxMhz);
        ret.put("maxSupportedHz", Math.round(maxRefreshHz));
        ret.put("adpfSupported", adpfSupported);
        ret.put("adpfPreferredNanos", adpfPreferredNanos);
        ret.put("gameModeApiSupported", gameModeSupported);
        ret.put("gameModeLabel", gameModeLabel);
        ret.put("thermalStatusCode", thermalStatus);
        ret.put("thermalLabel", thermalLabel);
        ret.put("thermalHeadroom", thermalHeadroom);

        call.resolve(ret);
    }

    @PluginMethod
    public void applyOptimizationProfile(PluginCall call) {
        String profile = call.getString("profile", "SMART_BOOST");
        int targetFps = call.getInt("targetFps", 60);
        String gamePackage = call.getString("gamePackage", "");

        Context ctx = getContext();
        Activity act = getActivity();

        // 1. Update ADPF PerformanceHintManager target work duration when available (API 31+)
        boolean adpfEngaged = false;
        if (ctx != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            long targetNanos = Math.round(1_000_000_000.0 / Math.max(30, targetFps));
            adpfEngaged = engageAdpfSession(ctx, targetNanos);
        }

        // 2. Hint preferred window refresh rate cleanly on UI thread
        if (act != null) {
            final float desiredHz = (float) targetFps;
            act.runOnUiThread(() -> {
                try {
                    Window w = act.getWindow();
                    if (w != null) {
                        WindowManager.LayoutParams lp = w.getAttributes();
                        lp.preferredRefreshRate = desiredHz;
                        w.setAttributes(lp);
                    }
                } catch (Exception ignored) {}
            });
        }

        // 3. Safe background cache trim when profile prioritizes performance
        if (ctx != null && ("PERFORMANCE_MODE".equals(profile) || "EXTREME_MODE".equals(profile) || "SMART_BOOST".equals(profile))) {
            try {
                ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
                if (am != null && !gamePackage.isEmpty()) {
                    // Trims only non-essential cached background processes cleanly within standard API permissions
                    am.killBackgroundProcesses("com.android.browser");
                }
            } catch (Exception ignored) {}
        }

        // 4. Inspect target game installation & GameMode state
        boolean gameInstalled = false;
        if (ctx != null && !gamePackage.isEmpty()) {
            try {
                ctx.getPackageManager().getPackageInfo(gamePackage, 0);
                gameInstalled = true;
            } catch (PackageManager.NameNotFoundException ignored) {}
        }

        JSObject ret = new JSObject();
        ret.put("applied", true);
        ret.put("profile", profile);
        ret.put("targetFps", targetFps);
        ret.put("adpfEngaged", adpfEngaged);
        ret.put("gameInstalled", gameInstalled);
        call.resolve(ret);
    }

    @PluginMethod
    public void getNetworkStats(PluginCall call) {
        Context ctx = getContext();
        long rxBytes = TrafficStats.getTotalRxBytes();
        long txBytes = TrafficStats.getTotalTxBytes();

        int downKbps = 0;
        int upKbps = 0;
        String transport = "UNKNOWN";
        boolean connected = false;

        if (ctx != null) {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                Network active = cm.getActiveNetwork();
                if (active != null) {
                    NetworkCapabilities caps = cm.getNetworkCapabilities(active);
                    if (caps != null) {
                        connected = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
                        downKbps = caps.getLinkDownstreamBandwidthKbps();
                        upKbps = caps.getLinkUpstreamBandwidthKbps();
                        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                            transport = "WIFI";
                        } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                            transport = "CELLULAR";
                        } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                            transport = "ETHERNET";
                        }
                    }
                }
            }
        }

        JSObject ret = new JSObject();
        ret.put("connected", connected);
        ret.put("transport", transport);
        ret.put("downstreamKbps", downKbps);
        ret.put("upstreamKbps", upKbps);
        ret.put("totalRxBytes", rxBytes);
        ret.put("totalTxBytes", txBytes);
        call.resolve(ret);
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private String readGameModeLabel(Context ctx) {
        try {
            GameManager gm = ctx.getSystemService(GameManager.class);
            if (gm == null) return "UNSUPPORTED";
            int mode = gm.getGameMode();
            if (mode == GameManager.GAME_MODE_PERFORMANCE) return "PERFORMANCE";
            if (mode == GameManager.GAME_MODE_BATTERY) return "BATTERY";
            if (mode == GameManager.GAME_MODE_STANDARD) return "STANDARD";
            if (mode == GameManager.GAME_MODE_CUSTOM) return "CUSTOM";
            return "UNSUPPORTED";
        } catch (Exception e) {
            return "UNSUPPORTED";
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private long readAdpfPreferredRate(Context ctx) {
        try {
            PerformanceHintManager phm = ctx.getSystemService(PerformanceHintManager.class);
            return phm != null ? phm.getPreferredUpdateRateNanos() : 0L;
        } catch (Exception e) {
            return 0L;
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private boolean engageAdpfSession(Context ctx, long targetNanos) {
        try {
            PerformanceHintManager phm = ctx.getSystemService(PerformanceHintManager.class);
            if (phm == null) return false;
            if (adpfSessionObj instanceof PerformanceHintManager.Session) {
                ((PerformanceHintManager.Session) adpfSessionObj).updateTargetWorkDuration(targetNanos);
                return true;
            }
            PerformanceHintManager.Session session = phm.createHintSession(
                new int[]{Process.myTid()},
                targetNanos
            );
            if (session != null) {
                adpfSessionObj = session;
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private String mapThermalStatus(int status) {
        switch (status) {
            case 0: return "NONE (COOL)";
            case 1: return "LIGHT";
            case 2: return "MODERATE";
            case 3: return "SEVERE";
            case 4: return "CRITICAL";
            case 5: return "EMERGENCY";
            case 6: return "SHUTDOWN";
            default: return String.format(Locale.US, "STATE_%d", status);
        }
    }

    private int readCpuFreqMhz(String path) {
        try (BufferedReader br = new BufferedReader(new FileReader(path))) {
            String line = br.readLine();
            if (line != null) {
                long khz = Long.parseLong(line.trim());
                return (int) (khz / 1000L);
            }
        } catch (Exception ignored) {}
        return 0;
    }

    @Override
    protected void handleOnDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && adpfSessionObj instanceof PerformanceHintManager.Session) {
            try {
                ((PerformanceHintManager.Session) adpfSessionObj).close();
            } catch (Exception ignored) {}
            adpfSessionObj = null;
        }
        super.handleOnDestroy();
    }
}
