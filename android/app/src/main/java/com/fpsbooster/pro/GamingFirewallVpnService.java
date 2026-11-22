package com.fpsbooster.pro;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Genuine Local Android VpnService Firewall (Zero remote proxy, zero payload inspection).
 * Routes ONLY blocked background applications through the local TUN interface so they
 * cannot bypass firewall rules, while keeping the active game & allowed apps on normal
 * native connectivity with zero added latency.
 */
public class GamingFirewallVpnService extends VpnService {
    private static final String TAG = "GamingFirewallVPN";

    public static final String ACTION_START = "com.fpsbooster.pro.VPN_START";
    public static final String ACTION_UPDATE_RULES = "com.fpsbooster.pro.VPN_UPDATE_RULES";
    public static final String ACTION_STOP = "com.fpsbooster.pro.VPN_STOP";
    public static final String EXTRA_BLOCKED_PACKAGES = "blocked_packages";
    public static final String EXTRA_PROTECTED_GAME = "protected_game";

    private static final AtomicBoolean isRunning = new AtomicBoolean(false);
    private static final AtomicLong blockedBytesTotal = new AtomicLong(0L);
    private static final AtomicLong blockedPacketsTotal = new AtomicLong(0L);
    private static volatile String activeProtectedGame = "";
    private static final Set<String> activeBlockedPackages = Collections.synchronizedSet(new HashSet<>());

    private ParcelFileDescriptor vpnInterface = null;
    private Thread packetFilterThread = null;

    public static boolean isVpnRunning() {
        return isRunning.get();
    }

    public static long getBlockedBytesTotal() {
        return blockedBytesTotal.get();
    }

    public static long getBlockedPacketsTotal() {
        return blockedPacketsTotal.get();
    }

    public static String getActiveProtectedGame() {
        return activeProtectedGame;
    }

    public static List<String> getActiveBlockedPackages() {
        synchronized (activeBlockedPackages) {
            return new ArrayList<>(activeBlockedPackages);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopFirewallVpn();
            stopSelf();
            return START_NOT_STICKY;
        }

        ArrayList<String> incomingBlocked = intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES);
        String protectedGame = intent.getStringExtra(EXTRA_PROTECTED_GAME);
        activeProtectedGame = protectedGame != null ? protectedGame : "";

        synchronized (activeBlockedPackages) {
            activeBlockedPackages.clear();
            if (incomingBlocked != null) {
                for (String pkg : incomingBlocked) {
                    if (pkg != null && !pkg.isEmpty() && !pkg.equals(activeProtectedGame) && !pkg.equals(getPackageName())) {
                        activeBlockedPackages.add(pkg);
                    }
                }
            }
        }

        if (ACTION_START.equals(action) || ACTION_UPDATE_RULES.equals(action)) {
            configureAndStartVpn();
        }

        return START_STICKY;
    }

    private synchronized void configureAndStartVpn() {
        closeVpnInterfaceOnly();

        try {
            Builder builder = new Builder();
            builder.setSession("FPS Booster Local Firewall");
            builder.setMtu(1500);
            builder.addAddress("10.88.0.1", 32);
            builder.addRoute("0.0.0.0", 0);
            builder.addRoute("::", 0);

            PackageManager pm = getPackageManager();
            int attachedCount = 0;

            synchronized (activeBlockedPackages) {
                for (String pkg : activeBlockedPackages) {
                    try {
                        pm.getApplicationInfo(pkg, 0);
                        builder.addAllowedApplication(pkg);
                        attachedCount++;
                    } catch (PackageManager.NameNotFoundException ignored) {
                        // App is not installed on this device; skip safely
                    }
                }
            }

            // If user has no installed blocked background apps yet, bind only an unused placeholder route check cleanly:
            // Do NOT capture this app itself so Firebase Cloud sync and ping probes continue unobstructed.
            if (attachedCount == 0) {
                Log.i(TAG, "No installed blocked background apps matched; firewall standby.");
                isRunning.set(false);
                return;
            }

            vpnInterface = builder.establish();
            if (vpnInterface == null) {
                isRunning.set(false);
                return;
            }

            isRunning.set(true);
            startPacketDropLoop();
            Log.i(TAG, "Local Gaming Firewall VPN started for " + attachedCount + " blocked apps. Game protected: " + activeProtectedGame);
        } catch (Exception e) {
            Log.e(TAG, "Failed to establish local firewall VPN", e);
            isRunning.set(false);
            closeVpnInterfaceOnly();
        }
    }

    private void startPacketDropLoop() {
        if (packetFilterThread != null && packetFilterThread.isAlive()) {
            packetFilterThread.interrupt();
        }

        final ParcelFileDescriptor tun = vpnInterface;
        if (tun == null) return;

        packetFilterThread = new Thread(() -> {
            FileInputStream in = new FileInputStream(tun.getFileDescriptor());
            ByteBuffer packet = ByteBuffer.allocate(32767);
            try {
                while (isRunning.get() && !Thread.currentThread().isInterrupted()) {
                    int length = in.read(packet.array());
                    if (length > 0) {
                        // Telemetry only: measure packet byte count; never inspect, store, or log user payload data
                        blockedBytesTotal.addAndGet(length);
                        blockedPacketsTotal.incrementAndGet();
                        packet.clear();
                    } else if (length < 0) {
                        break;
                    }
                }
            } catch (IOException e) {
                if (isRunning.get()) {
                    Log.w(TAG, "Firewall TUN stream closed", e);
                }
            } finally {
                try {
                    in.close();
                } catch (IOException ignored) {}
            }
        }, "GamingFirewallDropLoop");
        packetFilterThread.setDaemon(true);
        packetFilterThread.start();
    }

    private void closeVpnInterfaceOnly() {
        isRunning.set(false);
        if (packetFilterThread != null) {
            packetFilterThread.interrupt();
            packetFilterThread = null;
        }
        if (vpnInterface != null) {
            try {
                vpnInterface.close();
            } catch (IOException ignored) {}
            vpnInterface = null;
        }
    }

    private synchronized void stopFirewallVpn() {
        closeVpnInterfaceOnly();
        synchronized (activeBlockedPackages) {
            activeBlockedPackages.clear();
        }
        activeProtectedGame = "";
        Log.i(TAG, "Local Gaming Firewall VPN stopped and prior rules released.");
    }

    @Override
    public void onRevoke() {
        stopFirewallVpn();
        super.onRevoke();
    }

    @Override
    public void onDestroy() {
        stopFirewallVpn();
        super.onDestroy();
    }
}
