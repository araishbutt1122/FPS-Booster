package com.fpsbooster.pro;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.WindowManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "RealStats")
public class RealStatsPlugin extends Plugin {

    private static final class DisplayHardwareSnapshot {
        int activeHz = 60;
        int maxHz = 60;
        List<Integer> supportedRates = Collections.singletonList(60);
        int widthPixels = 0;
        int heightPixels = 0;
        int densityDpi = 0;
        float density = 1.0f;
        int xdpi = 0;
        int ydpi = 0;
    }

    private DisplayHardwareSnapshot readDisplayHardwareSnapshot(Context ctx, Activity act) {
        DisplayHardwareSnapshot snap = new DisplayHardwareSnapshot();
        WindowManager wm = null;
        if (act != null) {
            wm = (WindowManager) act.getSystemService(Context.WINDOW_SERVICE);
        }
        if (wm == null && ctx != null) {
            wm = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
        }

        Display display = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && act != null) {
            display = act.getDisplay();
        }
        if (display == null && wm != null) {
            display = wm.getDefaultDisplay();
        }

        float activeRate = 60.0f;
        float maxRate = 60.0f;
        Set<Integer> rateSet = new LinkedHashSet<>();

        if (display != null) {
            float currentRate = display.getRefreshRate();
            if (currentRate > 0f) {
                activeRate = currentRate;
                maxRate = currentRate;
                rateSet.add(Math.round(currentRate));
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    Display.Mode[] modes = display.getSupportedModes();
                    if (modes != null) {
                        for (Display.Mode m : modes) {
                            float modeHz = m.getRefreshRate();
                            if (modeHz > 0f) {
                                int rounded = Math.round(modeHz);
                                rateSet.add(rounded);
                                if (modeHz > maxRate) {
                                    maxRate = modeHz;
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        DisplayMetrics dm = new DisplayMetrics();
        if (ctx != null && ctx.getResources() != null) {
            dm.setTo(ctx.getResources().getDisplayMetrics());
        }
        if (display != null && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            try {
                display.getRealMetrics(dm);
            } catch (Exception ignored) {}
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

        snap.activeHz = Math.max(30, Math.round(activeRate));
        snap.maxHz = Math.max(snap.activeHz, Math.round(maxRate));

        if (rateSet.isEmpty()) {
            rateSet.add(snap.activeHz);
        }
        List<Integer> sortedRates = new ArrayList<>(rateSet);
        Collections.sort(sortedRates);
        snap.supportedRates = sortedRates;

        snap.widthPixels = dm.widthPixels;
        snap.heightPixels = dm.heightPixels;
        snap.densityDpi = dm.densityDpi;
        snap.density = dm.density;
        snap.xdpi = Math.round(dm.xdpi);
        snap.ydpi = Math.round(dm.ydpi);

        return snap;
    }

    /**
     * Explicit Android DisplayMetrics & WindowManager hardware refresh rate endpoint
     */
    @PluginMethod
    public void getDisplayMetrics(PluginCall call) {
        try {
            DisplayHardwareSnapshot snap = readDisplayHardwareSnapshot(getContext(), getActivity());
            JSArray ratesArray = new JSArray();
            for (Integer r : snap.supportedRates) {
                ratesArray.put(r);
            }

            JSObject ret = new JSObject();
            ret.put("fps", snap.activeHz);
            ret.put("refreshRate", snap.activeHz);
            ret.put("activeRefreshRate", snap.activeHz);
            ret.put("maxRefreshRate", snap.maxHz);
            ret.put("supportedRefreshRates", ratesArray);
            ret.put("widthPixels", snap.widthPixels);
            ret.put("heightPixels", snap.heightPixels);
            ret.put("densityDpi", snap.densityDpi);
            ret.put("density", snap.density);
            ret.put("xdpi", snap.xdpi);
            ret.put("ydpi", snap.ydpi);
            ret.put("detectionSource", "Android DisplayMetrics & WindowManager");
            ret.put("isNativeDisplay", true);

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("RealStats DisplayMetrics Error: " + e.getMessage());
        }
    }

    /**
     * Real Hardware RAM Information (Total, Used, Available, Percent)
     */
    @PluginMethod
    public void getRealRAM(PluginCall call) {
        try {
            Context ctx = getContext();
            if (ctx == null) {
                call.reject("Context unavailable");
                return;
            }

            ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            if (am == null) {
                call.reject("ActivityManager unavailable");
                return;
            }

            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);

            double totalGB = mi.totalMem / (1024.0 * 1024.0 * 1024.0);
            double availGB = mi.availMem / (1024.0 * 1024.0 * 1024.0);
            double usedGB = Math.max(0.0, totalGB - availGB);
            double percent = totalGB > 0 ? (usedGB / totalGB) * 100.0 : 0.0;

            JSObject ret = new JSObject();
            ret.put("total", String.format(Locale.US, "%.1f", totalGB));
            ret.put("used", String.format(Locale.US, "%.1f", usedGB));
            ret.put("available", String.format(Locale.US, "%.1f", availGB));
            ret.put("percent", (int) Math.round(percent));
            ret.put("isLowMemory", mi.lowMemory);

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("RealStats RAM Error: " + e.getMessage());
        }
    }

    /**
     * Real Battery Temperature & Battery Percentage
     */
    @PluginMethod
    public void getRealTemp(PluginCall call) {
        try {
            Context ctx = getContext();
            float tempC = 34.0f;
            int batteryLevel = 100;
            boolean isCharging = false;

            if (ctx != null) {
                IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
                Intent battery = ctx.registerReceiver(null, filter);

                if (battery != null) {
                    // Battery temperature is reported in tenths of a degree Celsius (e.g., 345 = 34.5°C)
                    int tempRaw = battery.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 340);
                    if (tempRaw > 0) {
                        tempC = tempRaw / 10.0f;
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
            }

            JSObject ret = new JSObject();
            ret.put("temp", String.format(Locale.US, "%.1f", tempC));
            ret.put("battery", batteryLevel);
            ret.put("isCharging", isCharging);

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("RealStats Temp Error: " + e.getMessage());
        }
    }

    /**
     * Real Screen Display Refresh Rate & DisplayMetrics (WindowManager + Display.getSupportedModes)
     */
    @PluginMethod
    public void getRealFPS(PluginCall call) {
        try {
            DisplayHardwareSnapshot snap = readDisplayHardwareSnapshot(getContext(), getActivity());
            JSArray ratesArray = new JSArray();
            for (Integer r : snap.supportedRates) {
                ratesArray.put(r);
            }

            JSObject ret = new JSObject();
            ret.put("fps", snap.activeHz);
            ret.put("refreshRate", snap.activeHz);
            ret.put("maxRefreshRate", snap.maxHz);
            ret.put("supportedRefreshRates", ratesArray);
            ret.put("widthPixels", snap.widthPixels);
            ret.put("heightPixels", snap.heightPixels);
            ret.put("densityDpi", snap.densityDpi);
            ret.put("xdpi", snap.xdpi);
            ret.put("ydpi", snap.ydpi);
            ret.put("detectionSource", "Android WindowManager & DisplayMetrics");
            ret.put("isNativeDisplay", true);

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("RealStats FPS Error: " + e.getMessage());
        }
    }

    /**
     * High Performance All-in-One Real Stats call
     */
    @PluginMethod
    public void getAllRealStats(PluginCall call) {
        try {
            Context ctx = getContext();
            Activity act = getActivity();

            // 1. RAM
            double totalGB = 4.0;
            double availGB = 2.0;
            double usedGB = 2.0;
            int ramPercent = 50;

            if (ctx != null) {
                ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
                if (am != null) {
                    ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
                    am.getMemoryInfo(mi);
                    totalGB = mi.totalMem / (1024.0 * 1024.0 * 1024.0);
                    availGB = mi.availMem / (1024.0 * 1024.0 * 1024.0);
                    usedGB = Math.max(0.0, totalGB - availGB);
                    ramPercent = totalGB > 0 ? (int) Math.round((usedGB / totalGB) * 100.0) : 50;
                }
            }

            // 2. Battery & Temp
            float tempC = 34.0f;
            int batteryLevel = 100;
            if (ctx != null) {
                IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
                Intent battery = ctx.registerReceiver(null, filter);
                if (battery != null) {
                    int tempRaw = battery.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 340);
                    if (tempRaw > 0) tempC = tempRaw / 10.0f;
                    int levelRaw = battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                    int scaleRaw = battery.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
                    if (levelRaw >= 0 && scaleRaw > 0) {
                        batteryLevel = (int) ((levelRaw / (float) scaleRaw) * 100.0f);
                    }
                }
            }

            // 3. Display Refresh Rate & DisplayMetrics via WindowManager
            DisplayHardwareSnapshot dispSnap = readDisplayHardwareSnapshot(ctx, act);
            JSArray ratesArray = new JSArray();
            for (Integer r : dispSnap.supportedRates) {
                ratesArray.put(r);
            }

            // 4. Real Storage (StatFs) & App Temp Cache
            double[] storageMetrics = readStorageMetrics(ctx);

            JSObject ret = new JSObject();
            ret.put("total", String.format(Locale.US, "%.1f", totalGB));
            ret.put("used", String.format(Locale.US, "%.1f", usedGB));
            ret.put("available", String.format(Locale.US, "%.1f", availGB));
            ret.put("percent", ramPercent);
            ret.put("temp", String.format(Locale.US, "%.1f", tempC));
            ret.put("battery", batteryLevel);
            ret.put("fps", dispSnap.activeHz);
            ret.put("maxRefreshRate", dispSnap.maxHz);
            ret.put("supportedRefreshRates", ratesArray);
            ret.put("widthPixels", dispSnap.widthPixels);
            ret.put("heightPixels", dispSnap.heightPixels);
            ret.put("densityDpi", dispSnap.densityDpi);
            ret.put("detectionSource", "Android WindowManager & DisplayMetrics");
            ret.put("isNativeDisplay", true);
            ret.put("storageTotalGb", String.format(Locale.US, "%.1f", storageMetrics[0]));
            ret.put("storageFreeGb", String.format(Locale.US, "%.1f", storageMetrics[1]));
            ret.put("storageUsedPercent", (int) Math.round(storageMetrics[2]));
            ret.put("appTempCacheKb", Math.round(storageMetrics[3]));

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("RealStats Error: " + e.getMessage());
        }
    }

    /**
     * Real Internal Storage Space (StatFs) & App Sandbox Temp Cache Size
     */
    @PluginMethod
    public void getStorageStats(PluginCall call) {
        try {
            Context ctx = getContext();
            double[] m = readStorageMetrics(ctx);
            JSObject ret = new JSObject();
            ret.put("totalGb", String.format(Locale.US, "%.1f", m[0]));
            ret.put("freeGb", String.format(Locale.US, "%.1f", m[1]));
            ret.put("usedPercent", (int) Math.round(m[2]));
            ret.put("appTempCacheKb", Math.round(m[3]));
            ret.put("isNativeStorage", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("RealStats Storage Error: " + e.getMessage());
        }
    }

    /**
     * Clear ONLY this app's temporary cache directories (invoked only after explicit user confirmation)
     */
    @PluginMethod
    public void clearAppTempCache(PluginCall call) {
        try {
            Context ctx = getContext();
            if (ctx == null) {
                call.reject("Context unavailable");
                return;
            }
            long beforeBytes = getAppCacheBytes(ctx);
            deleteDirectoryContents(ctx.getCacheDir());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                deleteDirectoryContents(ctx.getCodeCacheDir());
            }
            File extCache = ctx.getExternalCacheDir();
            if (extCache != null) {
                deleteDirectoryContents(extCache);
            }
            long afterBytes = getAppCacheBytes(ctx);
            long freedBytes = Math.max(0L, beforeBytes - afterBytes);

            double[] m = readStorageMetrics(ctx);
            JSObject ret = new JSObject();
            ret.put("freedKb", Math.round(freedBytes / 1024.0));
            ret.put("remainingCacheKb", Math.round(afterBytes / 1024.0));
            ret.put("freeGb", String.format(Locale.US, "%.1f", m[1]));
            ret.put("totalGb", String.format(Locale.US, "%.1f", m[0]));
            ret.put("usedPercent", (int) Math.round(m[2]));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Cache Clear Error: " + e.getMessage());
        }
    }

    private double[] readStorageMetrics(Context ctx) {
        StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
        long blockSize = stat.getBlockSizeLong();
        long totalBlocks = stat.getBlockCountLong();
        long availBlocks = stat.getAvailableBlocksLong();

        double totalGb = (totalBlocks * (double) blockSize) / (1024.0 * 1024.0 * 1024.0);
        double freeGb = (availBlocks * (double) blockSize) / (1024.0 * 1024.0 * 1024.0);
        double usedPercent = totalGb > 0 ? Math.max(0.0, Math.min(100.0, ((totalGb - freeGb) / totalGb) * 100.0)) : 0.0;
        double cacheKb = ctx != null ? (getAppCacheBytes(ctx) / 1024.0) : 0.0;
        return new double[]{totalGb, freeGb, usedPercent, cacheKb};
    }

    private long getAppCacheBytes(Context ctx) {
        long total = 0L;
        if (ctx == null) return 0L;
        total += getFolderSize(ctx.getCacheDir());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            total += getFolderSize(ctx.getCodeCacheDir());
        }
        File ext = ctx.getExternalCacheDir();
        if (ext != null) total += getFolderSize(ext);
        return total;
    }

    private long getFolderSize(File dir) {
        if (dir == null || !dir.exists()) return 0L;
        if (dir.isFile()) return dir.length();
        long size = 0L;
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                size += f.isDirectory() ? getFolderSize(f) : f.length();
            }
        }
        return size;
    }

    private void deleteDirectoryContents(File dir) {
        if (dir == null || !dir.exists() || !dir.isDirectory()) return;
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File f : files) {
            if (f.isDirectory()) {
                deleteDirectoryContents(f);
            }
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
    }
}
