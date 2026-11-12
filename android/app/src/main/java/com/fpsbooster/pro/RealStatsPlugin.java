package com.fpsbooster.pro;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;
import android.view.Display;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

@CapacitorPlugin(name = "RealStats")
public class RealStatsPlugin extends Plugin {

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
     * Real Screen Display Refresh Rate / Target FPS (Supports API 23 to API 35+)
     */
    @PluginMethod
    public void getRealFPS(PluginCall call) {
        try {
            float refreshRate = 60.0f;
            Activity act = getActivity();

            if (act != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    // Android 11+ (API 30+) safe display query
                    Display display = act.getDisplay();
                    if (display != null) {
                        refreshRate = display.getRefreshRate();
                    }
                } else {
                    // Android 6.0 to Android 10 (API 23 to 29) backwards-compatible fallback
                    WindowManager wm = (WindowManager) act.getSystemService(Context.WINDOW_SERVICE);
                    if (wm != null) {
                        Display display = wm.getDefaultDisplay();
                        if (display != null) {
                            refreshRate = display.getRefreshRate();
                        }
                    }
                }
            }

            int fpsInt = Math.round(refreshRate);
            if (fpsInt <= 0) fpsInt = 60;

            JSObject ret = new JSObject();
            ret.put("fps", fpsInt);
            ret.put("refreshRate", fpsInt);

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

            // 3. FPS
            float refreshRate = 60.0f;
            if (act != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Display display = act.getDisplay();
                    if (display != null) refreshRate = display.getRefreshRate();
                } else {
                    WindowManager wm = (WindowManager) act.getSystemService(Context.WINDOW_SERVICE);
                    if (wm != null && wm.getDefaultDisplay() != null) {
                        refreshRate = wm.getDefaultDisplay().getRefreshRate();
                    }
                }
            }
            int fpsInt = Math.max(30, Math.round(refreshRate));

            JSObject ret = new JSObject();
            ret.put("total", String.format(Locale.US, "%.1f", totalGB));
            ret.put("used", String.format(Locale.US, "%.1f", usedGB));
            ret.put("available", String.format(Locale.US, "%.1f", availGB));
            ret.put("percent", ramPercent);
            ret.put("temp", String.format(Locale.US, "%.1f", tempC));
            ret.put("battery", batteryLevel);
            ret.put("fps", fpsInt);

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("RealStats Error: " + e.getMessage());
        }
    }
}
