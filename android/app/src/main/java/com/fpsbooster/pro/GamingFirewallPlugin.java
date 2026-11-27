package com.fpsbooster.pro;

import android.Manifest;
import android.app.Activity;
import android.app.ActivityManager;
import android.app.AppOpsManager;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.net.VpnService;
import android.os.Build;
import android.os.PowerManager;
import android.os.Process;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
    name = "GamingFirewall",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class GamingFirewallPlugin extends Plugin {
    private static final String PREFS_NAME = "fps_booster_firewall_snapshot";
    private static final String KEY_PREV_ACTIVE = "prev_active";
    private static final String KEY_PREV_BLOCKED = "prev_blocked";
    private static final String KEY_PREV_GAME = "prev_game";
    private static final String DND_PREFS_NAME = "fps_booster_dnd_prefs";
    private static final String KEY_DND_OWNED = "dnd_owned";
    private static final String KEY_PREV_DND_FILTER = "prev_dnd_filter";

    private BroadcastReceiver vpnStateReceiver = null;

    @Override
    public void load() {
        super.load();
        Context ctx = getContext();
        if (ctx != null && vpnStateReceiver == null) {
            vpnStateReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null) return;
                    JSObject payload = buildStatusJson(context);
                    if (PersistentGamingService.ACTION_GAMING_HEARTBEAT.equals(intent.getAction())) {
                        long hb = intent.getLongExtra(
                            PersistentGamingService.EXTRA_HEARTBEAT_COUNT,
                            PersistentGamingService.getHeartbeatCount()
                        );
                        payload.put("eventType", "heartbeat");
                        payload.put("eventMessage", "PersistentGamingService heartbeat #" + hb);
                    } else {
                        payload.put("eventType", intent.getStringExtra(FpsVpnService.EXTRA_EVENT_TYPE));
                        payload.put("eventMessage", intent.getStringExtra(FpsVpnService.EXTRA_EVENT_MESSAGE));
                    }
                    notifyListeners("vpnStateChanged", payload);
                }
            };
            IntentFilter filter = new IntentFilter();
            filter.addAction(FpsVpnService.ACTION_VPN_STATE_BROADCAST);
            filter.addAction(PersistentGamingService.ACTION_GAMING_HEARTBEAT);
            ContextCompat.registerReceiver(ctx, vpnStateReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        }
    }

    private JSObject buildStatusJson(Context ctx) {
        boolean permissionGranted = ctx != null && VpnService.prepare(ctx) == null;
        boolean notificationGranted = true;
        if (ctx != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationGranted = ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
        }
        boolean conflictDetected = FpsVpnService.isExternalVpnConflict(ctx);

        JSObject ret = new JSObject();
        ret.put("isNativeAndroid", true);
        ret.put("permissionGranted", permissionGranted);
        ret.put("notificationPermissionGranted", notificationGranted);
        ret.put("isVpnRunning", FpsVpnService.isVpnRunning());
        ret.put("persistentServiceRunning", PersistentGamingService.isServiceRunning());
        ret.put("wakeLockActive", PersistentGamingService.isWakeLockActive());
        ret.put("heartbeatCount", PersistentGamingService.getHeartbeatCount());
        ret.put("lastHeartbeatAt", PersistentGamingService.getLastHeartbeatAtMs());
        ret.put("connectionState", FpsVpnService.getConnectionState());
        ret.put("activeTransport", FpsVpnService.getActiveTransport());
        ret.put("reconnectCount", FpsVpnService.getReconnectCount());
        ret.put("lastFailureReason", FpsVpnService.getLastFailureReason());
        ret.put("conflictDetected", conflictDetected);
        ret.put("uptimeSec", FpsVpnService.getUptimeSeconds());
        ret.put("vpnLayer", FpsVpnService.getVpnLayerIndex());
        ret.put("firewallLayer", FpsVpnService.getFirewallLayerIndex());
        ret.put("layerStatusNote", FpsVpnService.getLayerStatusNote());
        ret.put("dnsFilterEnabled", FpsVpnService.isDnsFilterActive());
        ret.put("blockedBytes", FpsVpnService.getBlockedBytesTotal());
        ret.put("blockedPackets", FpsVpnService.getBlockedPacketsTotal());
        ret.put("blockedTcpPackets", FpsVpnService.getBlockedTcpPackets());
        ret.put("blockedUdpPackets", FpsVpnService.getBlockedUdpPackets());
        ret.put("blockedDnsQueries", FpsVpnService.getBlockedDnsQueries());
        ret.put("blockedIpv4Packets", FpsVpnService.getBlockedIpv4Packets());
        ret.put("blockedIpv6Packets", FpsVpnService.getBlockedIpv6Packets());
        ret.put("protectedGamePackage", FpsVpnService.getActiveProtectedGame());

        JSArray blockedArr = new JSArray();
        for (String pkg : FpsVpnService.getActiveBlockedPackages()) {
            blockedArr.put(pkg);
        }
        ret.put("activeBlockedPackages", blockedArr);
        return ret;
    }

    @PluginMethod
    public void getFirewallStatus(PluginCall call) {
        call.resolve(buildStatusJson(getContext()));
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("notifications", call, "handleNotificationPermissionResult");
    }

    @PermissionCallback
    private void handleNotificationPermissionResult(PluginCall call) {
        if (call == null) return;
        boolean granted = getPermissionState("notifications") == PermissionState.GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestVpnPermission(PluginCall call) {
        Activity act = getActivity();
        Context ctx = getContext();
        if (act == null || ctx == null) {
            call.reject("Activity unavailable");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            try {
                ActivityCompat.requestPermissions(act, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4121);
            } catch (Exception ignored) {}
        }

        Intent prepareIntent = VpnService.prepare(ctx);
        if (prepareIntent == null) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        startActivityForResult(call, prepareIntent, "handleVpnPermissionResult");
    }

    @ActivityCallback
    private void handleVpnPermissionResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        boolean granted = result != null && result.getResultCode() == Activity.RESULT_OK;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    private boolean isBatteryOptimizationIgnored(Context ctx) {
        if (ctx == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        try {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isUsageAccessGranted(Context ctx) {
        if (ctx == null) return false;
        try {
            AppOpsManager appOps = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
            if (appOps == null) return false;
            int mode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                mode = appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    ctx.getPackageName()
                );
            } else {
                mode = appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    ctx.getPackageName()
                );
            }
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isDndAccessGranted(Context ctx) {
        if (ctx == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            return nm != null && nm.isNotificationPolicyAccessGranted();
        } catch (Exception ignored) {
            return false;
        }
    }

    @PluginMethod
    public void getPermissionChecklist(PluginCall call) {
        Context ctx = getContext();
        boolean notificationGranted = true;
        if (ctx != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationGranted = ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("batteryOptimizationIgnored", isBatteryOptimizationIgnored(ctx));
        ret.put("usageAccessGranted", isUsageAccessGranted(ctx));
        ret.put("dndAccessGranted", isDndAccessGranted(ctx));
        ret.put("notificationGranted", notificationGranted);
        ret.put("vpnGranted", ctx != null && VpnService.prepare(ctx) == null);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimization(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }
        if (isBatteryOptimizationIgnored(ctx)) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            startActivityForResult(call, intent, "handleBatteryOptResult");
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                startActivityForResult(call, fallback, "handleBatteryOptResult");
            } catch (Exception ignored) {
                JSObject ret = new JSObject();
                ret.put("granted", isBatteryOptimizationIgnored(ctx));
                call.resolve(ret);
            }
        }
    }

    @ActivityCallback
    private void handleBatteryOptResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        ret.put("granted", isBatteryOptimizationIgnored(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestUsageAccess(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }
        if (isUsageAccessGranted(ctx)) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            startActivityForResult(call, intent, "handleUsageAccessResult");
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                startActivityForResult(call, fallback, "handleUsageAccessResult");
            } catch (Exception ignored) {
                JSObject ret = new JSObject();
                ret.put("granted", isUsageAccessGranted(ctx));
                call.resolve(ret);
            }
        }
    }

    @ActivityCallback
    private void handleUsageAccessResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        ret.put("granted", isUsageAccessGranted(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestDndAccess(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }
        if (isDndAccessGranted(ctx)) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
            startActivityForResult(call, intent, "handleDndAccessResult");
        } catch (Exception ignored) {
            JSObject ret = new JSObject();
            ret.put("granted", isDndAccessGranted(ctx));
            call.resolve(ret);
        }
    }

    @ActivityCallback
    private void handleDndAccessResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        ret.put("granted", isDndAccessGranted(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void setDndMode(PluginCall call) {
        Context ctx = getContext();
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        if (ctx == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            JSObject ret = new JSObject();
            ret.put("applied", false);
            ret.put("granted", false);
            call.resolve(ret);
            return;
        }
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || !nm.isNotificationPolicyAccessGranted()) {
            JSObject ret = new JSObject();
            ret.put("applied", false);
            ret.put("granted", false);
            call.resolve(ret);
            return;
        }
        SharedPreferences prefs = ctx.getSharedPreferences(DND_PREFS_NAME, Context.MODE_PRIVATE);
        try {
            if (enabled) {
                if (!prefs.getBoolean(KEY_DND_OWNED, false)) {
                    prefs.edit()
                        .putBoolean(KEY_DND_OWNED, true)
                        .putInt(KEY_PREV_DND_FILTER, nm.getCurrentInterruptionFilter())
                        .apply();
                }
                nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);
            } else {
                restoreSavedDndIfNeeded(ctx);
            }
            JSObject ret = new JSObject();
            ret.put("applied", true);
            ret.put("granted", true);
            ret.put("enabled", enabled);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("applied", false);
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    public static void restoreSavedDndIfNeeded(Context ctx) {
        if (ctx == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(DND_PREFS_NAME, Context.MODE_PRIVATE);
            if (!prefs.getBoolean(KEY_DND_OWNED, false)) return;
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.isNotificationPolicyAccessGranted()) {
                int prev = prefs.getInt(KEY_PREV_DND_FILTER, NotificationManager.INTERRUPTION_FILTER_ALL);
                nm.setInterruptionFilter(prev);
            }
            prefs.edit().putBoolean(KEY_DND_OWNED, false).apply();
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void trimBackgroundApps(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }
        ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
        if (am == null) {
            JSObject ret = new JSObject();
            ret.put("trimmedCount", 0);
            ret.put("freedMb", 0);
            call.resolve(ret);
            return;
        }
        ActivityManager.MemoryInfo before = new ActivityManager.MemoryInfo();
        am.getMemoryInfo(before);

        JSArray arr = call.getArray("packages");
        String protectedGame = call.getString("protectedGamePackage", "");
        int trimmedCount = 0;
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                try {
                    String pkg = arr.getString(i);
                    if (pkg == null || pkg.isEmpty()) continue;
                    if (pkg.equals(ctx.getPackageName()) || pkg.equals(protectedGame)) continue;
                    if (FpsVpnService.ESSENTIAL_EXCLUDED_PACKAGES.contains(pkg)) continue;
                    am.killBackgroundProcesses(pkg);
                    trimmedCount++;
                } catch (Exception ignored) {}
            }
        }

        ActivityManager.MemoryInfo after = new ActivityManager.MemoryInfo();
        am.getMemoryInfo(after);
        long freedBytes = Math.max(0L, after.availMem - before.availMem);
        int freedMb = (int) Math.round(freedBytes / (1024.0 * 1024.0));

        JSObject ret = new JSObject();
        ret.put("trimmedCount", trimmedCount);
        ret.put("freedMb", freedMb);
        call.resolve(ret);
    }

    @PluginMethod
    public void savePreviousConfig(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }
        boolean wasRunning = FpsVpnService.isVpnRunning() || PersistentGamingService.isServiceRunning();
        Set<String> prevBlocked = new HashSet<>(FpsVpnService.getActiveBlockedPackages());
        String prevGame = FpsVpnService.getActiveProtectedGame();

        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(KEY_PREV_ACTIVE, wasRunning)
            .putStringSet(KEY_PREV_BLOCKED, prevBlocked)
            .putString(KEY_PREV_GAME, prevGame)
            .apply();

        JSObject ret = new JSObject();
        ret.put("saved", true);
        ret.put("wasRunning", wasRunning);
        ret.put("blockedCount", prevBlocked.size());
        call.resolve(ret);
    }

    @PluginMethod
    public void restorePreviousConfig(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean wasRunning = prefs.getBoolean(KEY_PREV_ACTIVE, false);
        Set<String> prevBlocked = prefs.getStringSet(KEY_PREV_BLOCKED, new HashSet<>());
        String prevGame = prefs.getString(KEY_PREV_GAME, "");

        if (!wasRunning) {
            Intent stopIntent = new Intent(ctx, PersistentGamingService.class);
            stopIntent.setAction(PersistentGamingService.ACTION_STOP);
            ctx.startService(stopIntent);
        } else if (VpnService.prepare(ctx) == null) {
            Intent restoreIntent = new Intent(ctx, PersistentGamingService.class);
            restoreIntent.setAction(PersistentGamingService.ACTION_UPDATE_SESSION);
            restoreIntent.putStringArrayListExtra(
                PersistentGamingService.EXTRA_BLOCKED_PACKAGES,
                new ArrayList<>(prevBlocked)
            );
            restoreIntent.putExtra(PersistentGamingService.EXTRA_PROTECTED_GAME, prevGame);
            ContextCompat.startForegroundService(ctx, restoreIntent);
        }

        JSObject ret = new JSObject();
        ret.put("restored", true);
        ret.put("wasRunning", wasRunning);
        ret.put("blockedCount", prevBlocked != null ? prevBlocked.size() : 0);
        call.resolve(ret);
    }

    @PluginMethod
    public void startFirewall(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }

        if (FpsVpnService.isExternalVpnConflict(ctx)) {
            JSObject ret = new JSObject();
            ret.put("started", false);
            ret.put("needsPermission", false);
            ret.put("conflictDetected", true);
            ret.put("errorReason", "Another active VPN is currently enabled");
            call.resolve(ret);
            return;
        }

        Intent prepareIntent = VpnService.prepare(ctx);
        if (prepareIntent != null) {
            JSObject ret = new JSObject();
            ret.put("started", false);
            ret.put("needsPermission", true);
            ret.put("conflictDetected", false);
            call.resolve(ret);
            return;
        }

        ArrayList<String> blockedList = new ArrayList<>();
        JSArray arr = call.getArray("blockedPackages");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                try {
                    String pkg = arr.getString(i);
                    if (pkg != null && !pkg.isEmpty()) {
                        blockedList.add(pkg);
                    }
                } catch (JSONException ignored) {}
            }
        }

        ArrayList<String> allowedList = new ArrayList<>();
        JSArray allowedArr = call.getArray("allowedPackages");
        if (allowedArr != null) {
            for (int i = 0; i < allowedArr.length(); i++) {
                try {
                    String pkg = allowedArr.getString(i);
                    if (pkg != null && !pkg.isEmpty()) {
                        allowedList.add(pkg);
                    }
                } catch (JSONException ignored) {}
            }
        }

        boolean blockAllNonSelected = Boolean.TRUE.equals(call.getBoolean("blockAllNonSelected", false));
        long boostExpiresAtMs = 0L;
        try {
            Double rawExp = call.getDouble("boostExpiresAtMs");
            if (rawExp != null && rawExp > 0) {
                boostExpiresAtMs = rawExp.longValue();
            }
        } catch (Exception ignored) {}

        String protectedGame = call.getString("protectedGamePackage", "");
        boolean dnsFilter = call.getBoolean("dnsFilter", true);

        boolean alreadyRunning = PersistentGamingService.isServiceRunning() && FpsVpnService.isVpnRunning();

        Intent persistentIntent = new Intent(ctx, PersistentGamingService.class);
        persistentIntent.setAction(
            alreadyRunning
                ? PersistentGamingService.ACTION_UPDATE_SESSION
                : PersistentGamingService.ACTION_START_SESSION
        );
        persistentIntent.putStringArrayListExtra(PersistentGamingService.EXTRA_BLOCKED_PACKAGES, blockedList);
        persistentIntent.putStringArrayListExtra(PersistentGamingService.EXTRA_ALLOWED_PACKAGES, allowedList);
        persistentIntent.putExtra(PersistentGamingService.EXTRA_BLOCK_ALL_NON_SELECTED, blockAllNonSelected);
        persistentIntent.putExtra(PersistentGamingService.EXTRA_BOOST_EXPIRES_AT_MS, boostExpiresAtMs);
        persistentIntent.putExtra(PersistentGamingService.EXTRA_PROTECTED_GAME, protectedGame);
        persistentIntent.putExtra(PersistentGamingService.EXTRA_DNS_FILTER, dnsFilter);
        ContextCompat.startForegroundService(ctx, persistentIntent);

        JSObject ret = new JSObject();
        ret.put("started", true);
        ret.put("alreadyRunning", alreadyRunning);
        ret.put("needsPermission", false);
        ret.put("conflictDetected", false);
        ret.put("persistentServiceStarted", true);
        ret.put("blockAllNonSelected", blockAllNonSelected);
        ret.put("blockedRequestedCount", blockedList.size());
        ret.put("allowedRequestedCount", allowedList.size());
        ret.put("protectedGamePackage", protectedGame);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopFirewall(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }
        Intent stopPersistent = new Intent(ctx, PersistentGamingService.class);
        stopPersistent.setAction(PersistentGamingService.ACTION_STOP);
        ctx.startService(stopPersistent);

        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        Context ctx = getContext();
        if (ctx != null && vpnStateReceiver != null) {
            try {
                ctx.unregisterReceiver(vpnStateReceiver);
            } catch (Exception ignored) {}
            vpnStateReceiver = null;
        }
        super.handleOnDestroy();
    }
}
