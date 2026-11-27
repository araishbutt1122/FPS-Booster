package com.fpsbooster.pro;

import android.app.Activity;
import android.app.GameManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.TrafficStats;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.PerformanceHintManager;
import android.os.PowerManager;
import android.os.Process;
import android.util.Base64;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileReader;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Genuine Android Performance & Network Engine Plugin:
 * - Android Game Mode API (API 31+)
 * - Android Dynamic Performance Framework (ADPF PerformanceHintManager, API 31+)
 * - PowerManager Thermal Status (API 29+), OnThermalStatusChangedListener & Thermal Headroom (API 30+)
 * - Kernel Thermal Zones (/sys/class/thermal/thermal_zone*) + Battery Temperature Sensor
 * - Display Refresh Rate / Window Preferred Refresh Rate
 * - TrafficStats + ConnectivityManager real bandwidth & transport capabilities
 */
@CapacitorPlugin(name = "GamingEngine")
public class GamingEnginePlugin extends Plugin {
    private Object adpfSessionObj = null;
    private Object thermalListenerObj = null;
    private final ExecutorService netProbeExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        super.load();
        Context ctx = getContext();
        if (ctx != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    PowerManager.OnThermalStatusChangedListener listener = status -> {
                        JSObject event = new JSObject();
                        event.put("thermalStatusCode", status);
                        event.put("thermalLabel", mapThermalStatus(status));
                        notifyListeners("thermalStatusChanged", event);
                    };
                    pm.addThermalStatusListener(listener);
                    thermalListenerObj = listener;
                }
            } catch (Exception ignored) {}
        }
    }

    @PluginMethod
    public void getThermalTelemetry(PluginCall call) {
        Context ctx = getContext();
        float batteryTempC = 34.0f;
        int batteryLevel = 100;
        boolean isCharging = false;

        if (ctx != null) {
            try {
                IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
                Intent battery = ctx.registerReceiver(null, filter);
                if (battery != null) {
                    int tempRaw = battery.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 340);
                    if (tempRaw > 0) {
                        batteryTempC = tempRaw / 10.0f;
                    }
                    int levelRaw = battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                    int scaleRaw = battery.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
                    if (levelRaw >= 0 && scaleRaw > 0) {
                        batteryLevel = (int) ((levelRaw / (float) scaleRaw) * 100.0f);
                    }
                    int status = battery.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                    isCharging = (status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                  status == BatteryManager.BATTERY_STATUS_FULL);
                }
            } catch (Exception ignored) {}
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

        JSArray zones = new JSArray();
        float cpuTempC = -1f;
        float skinTempC = -1f;
        for (int i = 0; i < 16; i++) {
            File zoneDir = new File("/sys/class/thermal/thermal_zone" + i);
            if (!zoneDir.exists()) break;
            String zoneType = readSingleLine("/sys/class/thermal/thermal_zone" + i + "/type");
            String zoneTempStr = readSingleLine("/sys/class/thermal/thermal_zone" + i + "/temp");
            if (zoneType == null || zoneTempStr == null) continue;
            try {
                float raw = Float.parseFloat(zoneTempStr.trim());
                float normalizedC = raw > 1000f ? raw / 1000f : (raw > 150f ? raw / 10f : raw);
                if (normalizedC >= 10f && normalizedC <= 115f) {
                    JSObject z = new JSObject();
                    z.put("type", zoneType.trim());
                    z.put("tempC", Math.round(normalizedC * 10f) / 10f);
                    zones.put(z);

                    String lower = zoneType.toLowerCase(Locale.US);
                    if (cpuTempC < 0 && (lower.contains("cpu") || lower.contains("soc") || lower.contains("tsens") || lower.contains("ap"))) {
                        cpuTempC = normalizedC;
                    }
                    if (skinTempC < 0 && (lower.contains("skin") || lower.contains("quiet") || lower.contains("xo"))) {
                        skinTempC = normalizedC;
                    }
                }
            } catch (Exception ignored) {}
        }

        float effectiveTempC = batteryTempC;
        if (skinTempC > 0f && skinTempC > effectiveTempC) {
            effectiveTempC = (batteryTempC + skinTempC) / 2.0f;
        }

        JSObject ret = new JSObject();
        ret.put("isNativeAndroid", true);
        ret.put("temperatureC", Math.round(effectiveTempC * 10f) / 10f);
        ret.put("batteryTempC", Math.round(batteryTempC * 10f) / 10f);
        if (cpuTempC > 0f) ret.put("cpuTempC", Math.round(cpuTempC * 10f) / 10f);
        if (skinTempC > 0f) ret.put("skinTempC", Math.round(skinTempC * 10f) / 10f);
        ret.put("thermalStatusCode", thermalStatus);
        ret.put("thermalLabel", thermalLabel);
        ret.put("thermalHeadroom", thermalHeadroom);
        ret.put("batteryLevel", batteryLevel);
        ret.put("isCharging", isCharging);
        ret.put("sensorSource", zones.length() > 0 ? "Android Thermal HAL + Zones" : "Android PowerManager + Battery");
        ret.put("zones", zones);
        call.resolve(ret);
    }

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

        float activeRefreshHz = 60f;
        float maxRefreshHz = 60f;
        java.util.Set<Integer> supportedRateSet = new java.util.LinkedHashSet<>();
        WindowManager wm = (WindowManager) (act != null
            ? act.getSystemService(Context.WINDOW_SERVICE)
            : (ctx != null ? ctx.getSystemService(Context.WINDOW_SERVICE) : null));
        Display d = null;
        if (act != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            d = act.getDisplay();
        }
        if (d == null && wm != null) {
            d = wm.getDefaultDisplay();
        }
        if (d != null) {
            activeRefreshHz = d.getRefreshRate();
            maxRefreshHz = activeRefreshHz;
            supportedRateSet.add(Math.round(activeRefreshHz));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                for (Display.Mode m : d.getSupportedModes()) {
                    float mr = m.getRefreshRate();
                    if (mr > 0f) {
                        supportedRateSet.add(Math.round(mr));
                        if (mr > maxRefreshHz) {
                            maxRefreshHz = mr;
                        }
                    }
                }
            }
        }
        if (supportedRateSet.isEmpty()) supportedRateSet.add(60);
        java.util.List<Integer> sortedRates = new java.util.ArrayList<>(supportedRateSet);
        java.util.Collections.sort(sortedRates);
        JSArray ratesArr = new JSArray();
        for (Integer r : sortedRates) ratesArr.put(r);

        android.util.DisplayMetrics dm = new android.util.DisplayMetrics();
        if (ctx != null && ctx.getResources() != null) {
            dm.setTo(ctx.getResources().getDisplayMetrics());
        }
        if (d != null && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            try { d.getRealMetrics(dm); } catch (Exception ignored) {}
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && wm != null) {
            try {
                android.graphics.Rect bounds = wm.getMaximumWindowMetrics().getBounds();
                if (bounds.width() > 0 && bounds.height() > 0) {
                    dm.widthPixels = bounds.width();
                    dm.heightPixels = bounds.height();
                }
            } catch (Exception ignored) {}
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
        ret.put("activeRefreshHz", Math.round(activeRefreshHz));
        ret.put("maxSupportedHz", Math.round(maxRefreshHz));
        ret.put("supportedRefreshRates", ratesArr);
        ret.put("widthPixels", dm.widthPixels);
        ret.put("heightPixels", dm.heightPixels);
        ret.put("densityDpi", dm.densityDpi);
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

        // 3. Inspect target game installation & GameMode state (no arbitrary third-party process killing)
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
    public void setScreenBrightness(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        float requestedLevel = call.getFloat("level", 0.30f);
        float clampedLevel = Math.max(0.10f, Math.min(1.0f, requestedLevel));
        final float targetBrightness = enabled
            ? clampedLevel
            : WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;

        Activity act = getActivity();
        if (act == null) {
            JSObject ret = new JSObject();
            ret.put("applied", false);
            ret.put("enabled", enabled);
            call.resolve(ret);
            return;
        }

        act.runOnUiThread(() -> {
            boolean applied = false;
            try {
                Window w = act.getWindow();
                if (w != null) {
                    WindowManager.LayoutParams lp = w.getAttributes();
                    lp.screenBrightness = targetBrightness;
                    w.setAttributes(lp);
                    applied = true;
                }
            } catch (Exception ignored) {}
            JSObject ret = new JSObject();
            ret.put("applied", applied);
            ret.put("enabled", enabled);
            ret.put("brightness", targetBrightness);
            call.resolve(ret);
        });
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
        boolean validated = false;
        boolean metered = false;
        boolean vpnActiveOnDevice = false;
        int wifiRssi = 0;
        int wifiLinkMbps = 0;
        int wifiFreqMhz = 0;

        if (ctx != null) {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                Network active = cm.getActiveNetwork();
                if (active != null) {
                    NetworkCapabilities caps = cm.getNetworkCapabilities(active);
                    if (caps != null) {
                        connected = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
                        validated = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
                        metered = !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED);
                        vpnActiveOnDevice = caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
                            || !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN);
                        downKbps = caps.getLinkDownstreamBandwidthKbps();
                        upKbps = caps.getLinkUpstreamBandwidthKbps();
                        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                            transport = "ETHERNET";
                        } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                            transport = "WIFI";
                        } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                            transport = "CELLULAR";
                        } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                            transport = "VPN";
                        }
                    }
                }
            }

            if ("WIFI".equals(transport)) {
                try {
                    WifiManager wm = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                    if (wm != null) {
                        WifiInfo info = wm.getConnectionInfo();
                        if (info != null) {
                            wifiRssi = info.getRssi();
                            wifiLinkMbps = info.getLinkSpeed();
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                wifiFreqMhz = info.getFrequency();
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        JSObject ret = new JSObject();
        ret.put("connected", connected);
        ret.put("validated", validated);
        ret.put("metered", metered);
        ret.put("vpnActiveOnDevice", vpnActiveOnDevice || FpsVpnService.isExternalVpnConflict(ctx));
        ret.put("transport", transport);
        ret.put("downstreamKbps", downKbps);
        ret.put("upstreamKbps", upKbps);
        ret.put("totalRxBytes", rxBytes);
        ret.put("totalTxBytes", txBytes);
        ret.put("wifiRssi", wifiRssi);
        ret.put("wifiLinkMbps", wifiLinkMbps);
        ret.put("wifiFreqMhz", wifiFreqMhz);
        call.resolve(ret);
    }

    @PluginMethod
    public void probeRealNetworkLatency(PluginCall call) {
        final Context ctx = getContext();
        final JSArray hostsParam = call.getArray("hosts");
        final List<String> targets = new ArrayList<>();
        if (hostsParam != null) {
            for (int i = 0; i < hostsParam.length(); i++) {
                try {
                    String h = hostsParam.getString(i);
                    if (h != null && !h.trim().isEmpty()) {
                        targets.add(h.trim());
                    }
                } catch (Exception ignored) {}
            }
        }
        if (targets.isEmpty()) {
            targets.add("1.1.1.1");
            targets.add("8.8.8.8");
            targets.add("9.9.9.9");
        }

        netProbeExecutor.execute(() -> {
            boolean externalVpn = ctx != null && FpsVpnService.isExternalVpnConflict(ctx);
            String bestHost = "";
            int bestAvgMs = -1;
            double bestJitterMs = 0.0;
            double bestLossPct = 100.0;

            JSArray results = new JSArray();
            for (String host : targets) {
                List<Integer> rtts = new ArrayList<>();
                int failures = 0;
                // 3 direct TCP port-443 handshake RTT probes (excludes HTTP/TLS parsing overhead)
                for (int s = 0; s < 3; s++) {
                    long startNs = System.nanoTime();
                    try (Socket socket = new Socket()) {
                        socket.connect(new InetSocketAddress(host, 443), 1200);
                        long elapsedMs = Math.max(1L, Math.round((System.nanoTime() - startNs) / 1_000_000.0));
                        rtts.add((int) elapsedMs);
                    } catch (Exception e) {
                        failures++;
                    }
                }

                double lossPct = Math.round((failures / 3.0) * 1000.0) / 10.0;
                int avgMs = -1;
                double jitterMs = 0.0;
                if (!rtts.isEmpty()) {
                    // Use median / trimmed sample when 3 samples succeed so single OS scheduling spikes don't distort
                    if (rtts.size() == 3) {
                        List<Integer> sorted = new ArrayList<>(rtts);
                        Collections.sort(sorted);
                        avgMs = sorted.get(1);
                    } else {
                        int sum = 0;
                        for (int v : rtts) sum += v;
                        avgMs = Math.round(sum / (float) rtts.size());
                    }
                    if (rtts.size() >= 2) {
                        double diffs = 0.0;
                        for (int i = 1; i < rtts.size(); i++) {
                            diffs += Math.abs(rtts.get(i) - rtts.get(i - 1));
                        }
                        jitterMs = Math.round((diffs / (rtts.size() - 1)) * 10.0) / 10.0;
                    }
                }

                JSObject item = new JSObject();
                item.put("host", host);
                item.put("pingMs", avgMs);
                item.put("jitterMs", jitterMs);
                item.put("packetLossPercent", lossPct);
                item.put("reachable", avgMs > 0);
                results.put(item);

                if (avgMs > 0 && (bestAvgMs < 0 || avgMs < bestAvgMs)) {
                    bestAvgMs = avgMs;
                    bestHost = host;
                    bestJitterMs = jitterMs;
                    bestLossPct = lossPct;
                }
            }

            JSObject ret = new JSObject();
            ret.put("bestHost", bestHost);
            ret.put("bestPingMs", bestAvgMs);
            ret.put("bestJitterMs", bestJitterMs);
            ret.put("bestLossPercent", bestLossPct);
            ret.put("externalVpnDetected", externalVpn);
            ret.put("results", results);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        final Context ctx = getContext();
        if (ctx == null) {
            JSObject ret = new JSObject();
            ret.put("apps", new JSArray());
            ret.put("source", "unavailable");
            call.resolve(ret);
            return;
        }
        netProbeExecutor.execute(() -> {
            JSArray appsArr = new JSArray();
            try {
                PackageManager pm = ctx.getPackageManager();
                String selfPkg = ctx.getPackageName();
                Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> launchables = pm.queryIntentActivities(mainIntent, 0);
                Set<String> seen = new HashSet<>();

                for (ResolveInfo ri : launchables) {
                    if (ri.activityInfo == null) continue;
                    String pkg = ri.activityInfo.packageName;
                    if (pkg == null || pkg.equals(selfPkg) || seen.contains(pkg)) continue;
                    seen.add(pkg);

                    try {
                        ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
                        boolean isSystem = (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0
                            && (ai.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0;
                        boolean isGame = isGameApp(ai, pkg);
                        CharSequence labelCs = pm.getApplicationLabel(ai);
                        String appName = labelCs != null ? labelCs.toString().trim() : pkg;
                        String category = classifyAppCategory(pkg, appName, isSystem, isGame);
                        String iconDataUrl = encodeDrawableToDataUrl(pm.getApplicationIcon(ai));

                        JSObject obj = new JSObject();
                        obj.put("packageName", pkg);
                        obj.put("name", appName);
                        obj.put("category", category);
                        obj.put("isGame", isGame);
                        obj.put("isSystem", isSystem);
                        if (iconDataUrl != null) obj.put("iconDataUrl", iconDataUrl);
                        appsArr.put(obj);
                    } catch (Exception ignored) {}
                }

                // Fallback pass for launchable installed apps/games missed by launcher query
                List<ApplicationInfo> allInstalled = pm.getInstalledApplications(0);
                for (ApplicationInfo ai : allInstalled) {
                    String pkg = ai.packageName;
                    if (pkg == null || pkg.equals(selfPkg) || seen.contains(pkg)) continue;
                    boolean isSystem = (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0
                        && (ai.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0;
                    boolean isGame = isGameApp(ai, pkg);
                    if (pm.getLaunchIntentForPackage(pkg) == null && !isGame) continue;
                    seen.add(pkg);
                    try {
                        CharSequence labelCs = pm.getApplicationLabel(ai);
                        String appName = labelCs != null ? labelCs.toString().trim() : pkg;
                        String category = classifyAppCategory(pkg, appName, isSystem, isGame);
                        String iconDataUrl = encodeDrawableToDataUrl(pm.getApplicationIcon(ai));

                        JSObject obj = new JSObject();
                        obj.put("packageName", pkg);
                        obj.put("name", appName);
                        obj.put("category", category);
                        obj.put("isGame", isGame);
                        obj.put("isSystem", isSystem);
                        if (iconDataUrl != null) obj.put("iconDataUrl", iconDataUrl);
                        appsArr.put(obj);
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}

            JSObject ret = new JSObject();
            ret.put("apps", appsArr);
            ret.put("count", appsArr.length());
            ret.put("source", "android_packagemanager");
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void getInstalledGames(PluginCall call) {
        final Context ctx = getContext();
        if (ctx == null) {
            JSObject ret = new JSObject();
            ret.put("games", new JSArray());
            ret.put("source", "unavailable");
            call.resolve(ret);
            return;
        }
        netProbeExecutor.execute(() -> {
            JSArray gamesArr = new JSArray();
            try {
                PackageManager pm = ctx.getPackageManager();
                String selfPkg = ctx.getPackageName();
                Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> launchables = pm.queryIntentActivities(mainIntent, 0);
                Set<String> seen = new HashSet<>();

                for (ResolveInfo ri : launchables) {
                    if (ri.activityInfo == null) continue;
                    String pkg = ri.activityInfo.packageName;
                    if (pkg == null || pkg.equals(selfPkg) || seen.contains(pkg)) continue;
                    seen.add(pkg);

                    try {
                        ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
                        if (!isGameApp(ai, pkg)) continue;
                        CharSequence labelCs = pm.getApplicationLabel(ai);
                        String appName = labelCs != null ? labelCs.toString().trim() : pkg;
                        String genre = classifyGameGenre(pkg, appName);
                        String iconDataUrl = encodeDrawableToDataUrl(pm.getApplicationIcon(ai));

                        JSObject obj = new JSObject();
                        obj.put("packageName", pkg);
                        obj.put("name", appName);
                        obj.put("category", genre);
                        obj.put("isGame", true);
                        obj.put("isInstalled", true);
                        if (iconDataUrl != null) obj.put("iconDataUrl", iconDataUrl);
                        gamesArr.put(obj);
                    } catch (Exception ignored) {}
                }

                // Fallback pass for installed games missed by standard CATEGORY_LAUNCHER query
                List<ApplicationInfo> allInstalled = pm.getInstalledApplications(0);
                for (ApplicationInfo ai : allInstalled) {
                    String pkg = ai.packageName;
                    if (pkg == null || pkg.equals(selfPkg) || seen.contains(pkg)) continue;
                    if (!isGameApp(ai, pkg)) continue;
                    if (pm.getLaunchIntentForPackage(pkg) == null) continue;
                    seen.add(pkg);
                    try {
                        CharSequence labelCs = pm.getApplicationLabel(ai);
                        String appName = labelCs != null ? labelCs.toString().trim() : pkg;
                        String genre = classifyGameGenre(pkg, appName);
                        String iconDataUrl = encodeDrawableToDataUrl(pm.getApplicationIcon(ai));

                        JSObject obj = new JSObject();
                        obj.put("packageName", pkg);
                        obj.put("name", appName);
                        obj.put("category", genre);
                        obj.put("isGame", true);
                        obj.put("isInstalled", true);
                        if (iconDataUrl != null) obj.put("iconDataUrl", iconDataUrl);
                        gamesArr.put(obj);
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}

            JSObject ret = new JSObject();
            ret.put("games", gamesArr);
            ret.put("count", gamesArr.length());
            ret.put("source", "android_packagemanager");
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void launchGamePackage(PluginCall call) {
        String packageName = call.getString("packageName", "");
        Context ctx = getContext();
        if (ctx == null || packageName == null || packageName.trim().isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("launched", false);
            ret.put("installed", false);
            call.resolve(ret);
            return;
        }

        try {
            PackageManager pm = ctx.getPackageManager();
            Intent launchIntent = pm.getLaunchIntentForPackage(packageName.trim());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(launchIntent);
                JSObject ret = new JSObject();
                ret.put("launched", true);
                ret.put("installed", true);
                ret.put("packageName", packageName.trim());
                call.resolve(ret);
                return;
            }
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("launched", false);
        ret.put("installed", false);
        ret.put("packageName", packageName.trim());
        call.resolve(ret);
    }

    @PluginMethod
    public void openStorePage(PluginCall call) {
        String packageName = call.getString("packageName", "");
        Context ctx = getContext();
        if (ctx == null || packageName == null || packageName.trim().isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("opened", false);
            call.resolve(ret);
            return;
        }
        String pkg = packageName.trim();
        try {
            Intent marketIntent = new Intent(
                Intent.ACTION_VIEW,
                android.net.Uri.parse("market://details?id=" + pkg)
            );
            marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(marketIntent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            ret.put("packageName", pkg);
            call.resolve(ret);
            return;
        } catch (Exception ignored) {}

        try {
            Intent webIntent = new Intent(
                Intent.ACTION_VIEW,
                android.net.Uri.parse("https://play.google.com/store/apps/details?id=" + pkg)
            );
            webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(webIntent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            ret.put("packageName", pkg);
            call.resolve(ret);
            return;
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("opened", false);
        call.resolve(ret);
    }

    @SuppressWarnings("deprecation")
    private boolean isGameApp(ApplicationInfo ai, String pkg) {
        if ((ai.flags & ApplicationInfo.FLAG_IS_GAME) != 0) return true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && ai.category == ApplicationInfo.CATEGORY_GAME) {
            return true;
        }
        String p = pkg.toLowerCase(Locale.US);
        return p.contains("tencent.ig") || p.contains("freefire") || p.contains("callofduty")
            || p.contains("pubg") || p.contains("fortnite") || p.contains("roblox")
            || p.contains("minecraft") || p.contains("mobile.legends") || p.contains("mobilelegends")
            || p.contains("wildrift") || p.contains("supercell") || p.contains("asphalt")
            || p.contains("genshin") || p.contains("starrail") || p.contains("wutheringwaves")
            || p.contains("efootball") || p.contains("fifamobile") || p.contains("standoff2")
            || p.contains("bloodstrike") || p.contains("newspike") || p.contains("farlight")
            || p.contains("arenabreakout") || p.contains("dreamleague") || p.contains("spacemafia")
            || p.contains("sgameglobal") || p.contains("carxtech");
    }

    private String classifyGameGenre(String pkg, String name) {
        String p = (pkg + " " + name).toLowerCase(Locale.US);
        if (p.contains("pubg") || p.contains("tencent.ig") || p.contains("freefire") || p.contains("callofduty")
            || p.contains("warzone") || p.contains("fortnite") || p.contains("standoff") || p.contains("newspike")
            || p.contains("bloodstrike") || p.contains("farlight") || p.contains("shooter") || p.contains("fps")
            || p.contains("arenabreakout") || p.contains("uamo")) {
            return "Shooter";
        }
        if (p.contains("mobile.legends") || p.contains("wildrift") || p.contains("sgame") || p.contains("honor of kings")
            || p.contains("moba") || p.contains("dota") || p.contains("arenaofvalor")) {
            return "MOBA";
        }
        if (p.contains("genshin") || p.contains("starrail") || p.contains("hkrpg") || p.contains("wuthering")
            || p.contains("rpg") || p.contains("diablo")) {
            return "RPG";
        }
        if (p.contains("roblox") || p.contains("minecraft") || p.contains("terraria")) {
            return "Sandbox";
        }
        if (p.contains("asphalt") || p.contains("carx") || p.contains("racing") || p.contains("needforspeed")) {
            return "Racing";
        }
        if (p.contains("fifa") || p.contains("pesam") || p.contains("efootball") || p.contains("dreamleague")
            || p.contains("nba") || p.contains("cricket")) {
            return "Sports";
        }
        if (p.contains("clash") || p.contains("strategy") || p.contains("lords")) {
            return "Strategy";
        }
        if (p.contains("brawlstars") || p.contains("action")) {
            return "Action";
        }
        return "Games";
    }

    private String classifyAppCategory(String pkg, String name, boolean isSystem, boolean isGame) {
        if (isGame) return "Games";
        String p = (pkg + " " + name).toLowerCase(Locale.US);
        if (p.contains("whatsapp") || p.contains("instagram") || p.contains("facebook") || p.contains("snapchat")
            || p.contains("discord") || p.contains("telegram") || p.contains("twitter") || p.contains("barcelona")
            || p.contains("pinterest") || p.contains("orca") || p.contains("messenger") || p.contains("reddit")) {
            return "Social";
        }
        if (p.contains("chrome") || p.contains("firefox") || p.contains("opera") || p.contains("brave")
            || p.contains("edge") || p.contains("browser") || p.contains("ucmobile")) {
            return "Browsers";
        }
        if (p.contains("youtube") || p.contains("netflix") || p.contains("spotify") || p.contains("tiktok")
            || p.contains("musically") || p.contains("twitch") || p.contains("primevideo") || p.contains("hotstar")
            || p.contains("kwai") || p.contains("like") || p.contains("mxplayer")) {
            return "Entertainment";
        }
        if (isSystem || p.startsWith("com.android.") || p.startsWith("com.google.android.gms")) {
            return "System";
        }
        return "Tools";
    }

    private String encodeDrawableToDataUrl(Drawable drawable) {
        if (drawable == null) return null;
        Bitmap bitmap = null;
        boolean ownsBitmap = false;
        try {
            if (drawable instanceof BitmapDrawable && ((BitmapDrawable) drawable).getBitmap() != null) {
                Bitmap src = ((BitmapDrawable) drawable).getBitmap();
                bitmap = Bitmap.createScaledBitmap(src, 72, 72, true);
                ownsBitmap = bitmap != src;
            } else {
                bitmap = Bitmap.createBitmap(72, 72, Bitmap.Config.ARGB_8888);
                ownsBitmap = true;
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                drawable.draw(canvas);
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, baos);
            String b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
            return "data:image/png;base64," + b64;
        } catch (Exception e) {
            return null;
        } finally {
            if (ownsBitmap && bitmap != null && !bitmap.isRecycled()) {
                bitmap.recycle();
            }
        }
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

    private String readSingleLine(String path) {
        try (BufferedReader br = new BufferedReader(new FileReader(path))) {
            return br.readLine();
        } catch (Exception ignored) {
            return null;
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && thermalListenerObj instanceof PowerManager.OnThermalStatusChangedListener) {
            try {
                Context ctx = getContext();
                if (ctx != null) {
                    PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                    if (pm != null) {
                        pm.removeThermalStatusListener((PowerManager.OnThermalStatusChangedListener) thermalListenerObj);
                    }
                }
            } catch (Exception ignored) {}
            thermalListenerObj = null;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && adpfSessionObj instanceof PerformanceHintManager.Session) {
            try {
                ((PerformanceHintManager.Session) adpfSessionObj).close();
            } catch (Exception ignored) {}
            adpfSessionObj = null;
        }
        netProbeExecutor.shutdownNow();
        super.handleOnDestroy();
    }
}
