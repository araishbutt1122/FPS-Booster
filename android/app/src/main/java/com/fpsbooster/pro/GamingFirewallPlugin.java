package com.fpsbooster.pro;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.VpnService;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "GamingFirewall")
public class GamingFirewallPlugin extends Plugin {
    private static final String PREFS_NAME = "fps_booster_firewall_snapshot";
    private static final String KEY_PREV_ACTIVE = "prev_active";
    private static final String KEY_PREV_BLOCKED = "prev_blocked";
    private static final String KEY_PREV_GAME = "prev_game";

    @PluginMethod
    public void getFirewallStatus(PluginCall call) {
        Context ctx = getContext();
        boolean permissionGranted = ctx != null && VpnService.prepare(ctx) == null;

        JSObject ret = new JSObject();
        ret.put("isNativeAndroid", true);
        ret.put("permissionGranted", permissionGranted);
        ret.put("isVpnRunning", GamingFirewallVpnService.isVpnRunning());
        ret.put("blockedBytes", GamingFirewallVpnService.getBlockedBytesTotal());
        ret.put("blockedPackets", GamingFirewallVpnService.getBlockedPacketsTotal());
        ret.put("protectedGamePackage", GamingFirewallVpnService.getActiveProtectedGame());

        JSArray blockedArr = new JSArray();
        for (String pkg : GamingFirewallVpnService.getActiveBlockedPackages()) {
            blockedArr.put(pkg);
        }
        ret.put("activeBlockedPackages", blockedArr);
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

    @PluginMethod
    public void savePreviousConfig(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context unavailable");
            return;
        }
        boolean wasRunning = GamingFirewallVpnService.isVpnRunning();
        Set<String> prevBlocked = new HashSet<>(GamingFirewallVpnService.getActiveBlockedPackages());
        String prevGame = GamingFirewallVpnService.getActiveProtectedGame();

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
            Intent stopIntent = new Intent(ctx, GamingFirewallVpnService.class);
            stopIntent.setAction(GamingFirewallVpnService.ACTION_STOP);
            ctx.startService(stopIntent);
        } else if (VpnService.prepare(ctx) == null) {
            Intent restoreIntent = new Intent(ctx, GamingFirewallVpnService.class);
            restoreIntent.setAction(GamingFirewallVpnService.ACTION_UPDATE_RULES);
            restoreIntent.putStringArrayListExtra(
                GamingFirewallVpnService.EXTRA_BLOCKED_PACKAGES,
                new ArrayList<>(prevBlocked)
            );
            restoreIntent.putExtra(GamingFirewallVpnService.EXTRA_PROTECTED_GAME, prevGame);
            ctx.startService(restoreIntent);
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

        Intent prepareIntent = VpnService.prepare(ctx);
        if (prepareIntent != null) {
            JSObject ret = new JSObject();
            ret.put("started", false);
            ret.put("needsPermission", true);
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
        String protectedGame = call.getString("protectedGamePackage", "");

        Intent vpnIntent = new Intent(ctx, GamingFirewallVpnService.class);
        vpnIntent.setAction(GamingFirewallVpnService.ACTION_START);
        vpnIntent.putStringArrayListExtra(GamingFirewallVpnService.EXTRA_BLOCKED_PACKAGES, blockedList);
        vpnIntent.putExtra(GamingFirewallVpnService.EXTRA_PROTECTED_GAME, protectedGame);
        ctx.startService(vpnIntent);

        JSObject ret = new JSObject();
        ret.put("started", true);
        ret.put("needsPermission", false);
        ret.put("blockedRequestedCount", blockedList.size());
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
        Intent stopIntent = new Intent(ctx, GamingFirewallVpnService.class);
        stopIntent.setAction(GamingFirewallVpnService.ACTION_STOP);
        ctx.startService(stopIntent);

        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }
}
