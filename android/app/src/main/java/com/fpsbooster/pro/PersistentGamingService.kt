package com.fpsbooster.pro

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * PersistentGamingService
 *
 * Dedicated foreground service managing long-lived Super Boost + background traffic
 * blocking sessions without 2-minute OS/Doze timeout drops:
 * - Handles START_STICKY with SharedPreferences session rehydration.
 * - Promotes cleanly via ServiceCompat.startForeground with persistent notification & Stop action.
 * - Acquires a bounded PowerManager.PARTIAL_WAKE_LOCK renewed on every 25s heartbeat and always
 *   released cleanly on stop/destroy.
 * - Emits periodic heartbeat signals to verify FpsVpnService health and notify Capacitor/JS.
 */
class PersistentGamingService : Service() {

    companion object {
        private const val TAG = "PersistentGamingSvc"

        const val ACTION_START_SESSION = "com.fpsbooster.pro.PERSISTENT_START_SESSION"
        const val ACTION_UPDATE_SESSION = "com.fpsbooster.pro.PERSISTENT_UPDATE_SESSION"
        const val ACTION_STOP = "com.fpsbooster.pro.PERSISTENT_STOP_SESSION"
        const val ACTION_GAMING_HEARTBEAT = "com.fpsbooster.pro.GAMING_HEARTBEAT"

        const val EXTRA_BLOCKED_PACKAGES = "blocked_packages"
        const val EXTRA_ALLOWED_PACKAGES = "allowed_packages"
        const val EXTRA_BLOCK_ALL_NON_SELECTED = "block_all_non_selected"
        const val EXTRA_BOOST_EXPIRES_AT_MS = "boost_expires_at_ms"
        const val EXTRA_PROTECTED_GAME = "protected_game"
        const val EXTRA_DNS_FILTER = "dns_filter"
        const val EXTRA_HEARTBEAT_COUNT = "heartbeat_count"
        const val EXTRA_WAKE_LOCK_ACTIVE = "wake_lock_active"

        private const val CHANNEL_ID = "fps_booster_persistent_gaming_channel"
        private const val NOTIFICATION_ID = 4125
        private const val PREFS_NAME = "fps_booster_persistent_session"
        private const val KEY_ACTIVE = "session_active"
        private const val KEY_BLOCKED = "session_blocked"
        private const val KEY_ALLOWED = "session_allowed"
        private const val KEY_BLOCK_ALL = "session_block_all"
        private const val KEY_EXPIRES_AT = "session_expires_at"
        private const val KEY_GAME = "session_game"
        private const val KEY_DNS = "session_dns"

        // 2s watchdog verifies VPN tunnel, firewall rules, and heartbeat continuously
        private const val HEARTBEAT_INTERVAL_MS = 2_000L
        // 5-minute bounded wake-lock lease renewed by heartbeat loop (zero leak on crash)
        private const val WAKE_LOCK_LEASE_MS = 5 * 60 * 1000L

        private val serviceRunning = AtomicBoolean(false)
        private val wakeLockHeld = AtomicBoolean(false)
        private val heartbeatCount = AtomicLong(0L)
        private val lastHeartbeatAtMs = AtomicLong(0L)
        private val startedAtMs = AtomicLong(0L)

        @JvmStatic
        fun isServiceRunning(): Boolean = serviceRunning.get()

        @JvmStatic
        fun isWakeLockActive(): Boolean = wakeLockHeld.get()

        @JvmStatic
        fun getHeartbeatCount(): Long = heartbeatCount.get()

        @JvmStatic
        fun getLastHeartbeatAtMs(): Long = lastHeartbeatAtMs.get()
    }

    private var workerThread: HandlerThread? = null
    private var workerHandler: Handler? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var foregroundPromoted = false

    private var activeProtectedGame: String = ""
    private var dnsFilterEnabled: Boolean = true
    private var blockAllNonSelected: Boolean = false
    private var boostExpiresAtMs: Long = 0L
    private var activeBlockedPackages: ArrayList<String> = arrayListOf()
    private var activeAllowedPackages: ArrayList<String> = arrayListOf()

    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            if (!serviceRunning.get()) return
            performHeartbeatTick()
            workerHandler?.postDelayed(this, HEARTBEAT_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        ensureNotificationChannel()
        workerThread = HandlerThread("PersistentGamingHeartbeat").also { it.start() }
        workerHandler = workerThread?.looper?.let { Handler(it) }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        promoteToForeground("Initializing Persistent Gaming Engine...")

        if (intent == null) {
            if (!rehydratePersistedSession()) {
                stopAllAndCleanup()
                stopSelf()
                return START_NOT_STICKY
            }
            serviceRunning.set(true)
            if (startedAtMs.get() == 0L) {
                startedAtMs.set(System.currentTimeMillis())
            }
            acquireOrRenewWakeLock()
            forwardRulesToFpsVpn(FpsVpnService.ACTION_START)
            scheduleHeartbeatLoop()
            return START_STICKY
        }

        when (intent.action) {
            ACTION_STOP -> {
                persistSession(false, emptyList(), emptyList(), false, 0L, "", dnsFilterEnabled)
                stopAllAndCleanup()
                broadcastSessionState("stopped", "Boost stopped from notification or controller")
                stopSelf()
                return START_NOT_STICKY
            }

            ACTION_START_SESSION, ACTION_UPDATE_SESSION -> {
                val incomingBlocked =
                    intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES) ?: arrayListOf()
                val incomingAllowed =
                    intent.getStringArrayListExtra(EXTRA_ALLOWED_PACKAGES) ?: arrayListOf()
                blockAllNonSelected = intent.getBooleanExtra(EXTRA_BLOCK_ALL_NON_SELECTED, false)
                boostExpiresAtMs = intent.getLongExtra(EXTRA_BOOST_EXPIRES_AT_MS, 0L)
                activeProtectedGame = intent.getStringExtra(EXTRA_PROTECTED_GAME) ?: ""
                dnsFilterEnabled = intent.getBooleanExtra(EXTRA_DNS_FILTER, true)
                activeBlockedPackages = ArrayList(incomingBlocked)
                activeAllowedPackages = ArrayList(incomingAllowed)

                persistSession(
                    true,
                    activeBlockedPackages,
                    activeAllowedPackages,
                    blockAllNonSelected,
                    boostExpiresAtMs,
                    activeProtectedGame,
                    dnsFilterEnabled
                )

                val wasAlreadyRunning = serviceRunning.getAndSet(true)
                if (!wasAlreadyRunning || startedAtMs.get() == 0L) {
                    startedAtMs.set(System.currentTimeMillis())
                    heartbeatCount.set(0L)
                }

                acquireOrRenewWakeLock()
                val vpnAction = if (ACTION_UPDATE_SESSION == intent.action && FpsVpnService.isVpnRunning()) {
                    FpsVpnService.ACTION_UPDATE_RULES
                } else {
                    FpsVpnService.ACTION_START
                }
                forwardRulesToFpsVpn(vpnAction)
                scheduleHeartbeatLoop()
                updateForegroundNotification(
                    if (blockAllNonSelected) {
                        "VPN Layer #${FpsVpnService.getVpnLayerIndex()} · All BG filtered"
                    } else {
                        "VPN Layer #${FpsVpnService.getVpnLayerIndex()} · ${activeBlockedPackages.size} BG filtered"
                    }
                )
            }
        }

        return START_STICKY
    }

    private fun performHeartbeatTick() {
        val now = System.currentTimeMillis()
        if (boostExpiresAtMs > 0L && now >= boostExpiresAtMs) {
            persistSession(false, emptyList(), emptyList(), false, 0L, "", dnsFilterEnabled)
            stopAllAndCleanup()
            broadcastSessionState("expired", "Boost countdown reached 00:00 — VPN stopped")
            stopSelf()
            return
        }

        val seq = heartbeatCount.incrementAndGet()
        lastHeartbeatAtMs.set(now)

        // 1. Renew partial wake lock lease cleanly (every 15 ticks = 30s, or if released)
        if (seq == 1L || seq % 15L == 0L || !wakeLockHeld.get()) {
            acquireOrRenewWakeLock()
        }

        // 2. Every 2 seconds verify FpsVpnService + Firewall layer health & auto-recover if needed
        if (VpnService.prepare(applicationContext) == null) {
            val hasFirewallTargets = blockAllNonSelected || activeBlockedPackages.isNotEmpty()
            if (hasFirewallTargets && !FpsVpnService.isVpnRunning() && !FpsVpnService.isExternalVpnConflict(applicationContext)) {
                forwardRulesToFpsVpn(FpsVpnService.ACTION_START)
            } else {
                val hbIntent = Intent(this, FpsVpnService::class.java).apply {
                    action = FpsVpnService.ACTION_HEARTBEAT_CHECK
                }
                try {
                    startService(hbIntent)
                } catch (_: Exception) {
                }
            }
        }

        // 3. Refresh persistent foreground notification every 10s (every 5 ticks)
        if (seq == 1L || seq % 5L == 0L) {
            val uptimeSec = maxOf(0L, (now - startedAtMs.get()) / 1000L)
            val mins = uptimeSec / 60L
            val secs = uptimeSec % 60L
            val uptimeLabel = String.format("%02d:%02d", mins, secs)
            val layerInfo = "VPN L#${FpsVpnService.getVpnLayerIndex()} · FW L#${FpsVpnService.getFirewallLayerIndex()}"
            updateForegroundNotification("Uptime $uptimeLabel · $layerInfo · 2s Guard")
        }

        // 4. Broadcast heartbeat event to Capacitor plugin -> React state every 2s
        try {
            val hbBroadcast = Intent(ACTION_GAMING_HEARTBEAT).apply {
                setPackage(packageName)
                putExtra(EXTRA_HEARTBEAT_COUNT, seq)
                putExtra(EXTRA_WAKE_LOCK_ACTIVE, wakeLockHeld.get())
            }
            sendBroadcast(hbBroadcast)
        } catch (_: Exception) {
        }
    }

    private fun broadcastSessionState(type: String, message: String) {
        try {
            val intent = Intent(FpsVpnService.ACTION_VPN_STATE_BROADCAST).apply {
                setPackage(packageName)
                putExtra(FpsVpnService.EXTRA_EVENT_TYPE, type)
                putExtra(FpsVpnService.EXTRA_EVENT_MESSAGE, message)
            }
            sendBroadcast(intent)
        } catch (_: Exception) {
        }
    }

    private fun forwardRulesToFpsVpn(action: String) {
        if (VpnService.prepare(applicationContext) != null) {
            Log.w(TAG, "VPN permission not granted yet; PersistentGamingService running without TUN")
            return
        }
        try {
            val vpnIntent = Intent(this, FpsVpnService::class.java).apply {
                this.action = action
                putStringArrayListExtra(
                    FpsVpnService.EXTRA_BLOCKED_PACKAGES,
                    ArrayList(activeBlockedPackages)
                )
                putStringArrayListExtra(
                    FpsVpnService.EXTRA_ALLOWED_PACKAGES,
                    ArrayList(activeAllowedPackages)
                )
                putExtra(FpsVpnService.EXTRA_BLOCK_ALL_NON_SELECTED, blockAllNonSelected)
                putExtra(FpsVpnService.EXTRA_PROTECTED_GAME, activeProtectedGame)
                putExtra(FpsVpnService.EXTRA_DNS_FILTER, dnsFilterEnabled)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(vpnIntent)
            } else {
                startService(vpnIntent)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to forward rules to FpsVpnService: ${e.message}")
        }
    }

    private fun stopFpsVpn() {
        try {
            val stopIntent = Intent(this, FpsVpnService::class.java).apply {
                action = FpsVpnService.ACTION_STOP
            }
            startService(stopIntent)
        } catch (_: Exception) {
        }
    }

    private fun scheduleHeartbeatLoop() {
        val h = workerHandler ?: return
        h.removeCallbacks(heartbeatRunnable)
        h.postDelayed(heartbeatRunnable, HEARTBEAT_INTERVAL_MS)
    }

    private fun acquireOrRenewWakeLock() {
        try {
            if (wakeLock == null) {
                val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
                wakeLock = pm?.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "fpsbooster:PersistentGamingSession"
                )?.apply {
                    setReferenceCounted(false)
                }
            }
            wakeLock?.let { wl ->
                wl.acquire(WAKE_LOCK_LEASE_MS)
                wakeLockHeld.set(wl.isHeld)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Unable to acquire wake lock: ${e.message}")
            wakeLockHeld.set(false)
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let { wl ->
                if (wl.isHeld) {
                    wl.release()
                }
            }
        } catch (_: Exception) {
        } finally {
            wakeLockHeld.set(false)
        }
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Persistent Gaming Super Boost",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Keeps Super Boost, wake lock heartbeat, and per-app background blocking alive cleanly."
                    setShowBadge(false)
                    setSound(null, null)
                }
                nm.createNotificationChannel(channel)
            }
        }
    }

    private fun buildNotification(statusText: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPending = PendingIntent.getActivity(
            this,
            10,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, PersistentGamingService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this,
            11,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (activeProtectedGame.isNotEmpty()) {
            "BOOST ON · $activeProtectedGame"
        } else {
            "BOOST ON · Gaming Mode Active"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(statusText)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(contentPending)
            .addAction(0, "Stop Boost", stopPending)
            .build()
    }

    private fun promoteToForeground(statusText: String) {
        try {
            ensureNotificationChannel()
            val notification = buildNotification(statusText)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceCompat.startForeground(
                    this,
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            foregroundPromoted = true
        } catch (e: Exception) {
            Log.w(TAG, "Unable to start foreground PersistentGamingService: ${e.message}")
        }
    }

    private fun updateForegroundNotification(statusText: String) {
        if (!foregroundPromoted) {
            promoteToForeground(statusText)
            return
        }
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.notify(NOTIFICATION_ID, buildNotification(statusText))
        } catch (_: Exception) {
        }
    }

    private fun stopForegroundSafely() {
        try {
            if (foregroundPromoted) {
                ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
                foregroundPromoted = false
            }
        } catch (_: Exception) {
        }
    }

    private fun persistSession(
        active: Boolean,
        blocked: List<String>,
        allowed: List<String>,
        blockAll: Boolean,
        expiresAtMs: Long,
        gamePkg: String,
        dns: Boolean
    ) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_ACTIVE, active)
            .putStringSet(KEY_BLOCKED, HashSet(blocked))
            .putStringSet(KEY_ALLOWED, HashSet(allowed))
            .putBoolean(KEY_BLOCK_ALL, blockAll)
            .putLong(KEY_EXPIRES_AT, expiresAtMs)
            .putString(KEY_GAME, gamePkg)
            .putBoolean(KEY_DNS, dns)
            .apply()
    }

    private fun rehydratePersistedSession(): Boolean {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ACTIVE, false)) return false
        val savedExpiresAt = prefs.getLong(KEY_EXPIRES_AT, 0L)
        if (savedExpiresAt > 0L && System.currentTimeMillis() >= savedExpiresAt) {
            persistSession(false, emptyList(), emptyList(), false, 0L, "", true)
            return false
        }
        val savedBlocked = prefs.getStringSet(KEY_BLOCKED, emptySet()) ?: emptySet()
        val savedAllowed = prefs.getStringSet(KEY_ALLOWED, emptySet()) ?: emptySet()
        activeBlockedPackages = ArrayList(savedBlocked)
        activeAllowedPackages = ArrayList(savedAllowed)
        blockAllNonSelected = prefs.getBoolean(KEY_BLOCK_ALL, false)
        boostExpiresAtMs = savedExpiresAt
        activeProtectedGame = prefs.getString(KEY_GAME, "") ?: ""
        dnsFilterEnabled = prefs.getBoolean(KEY_DNS, true)
        return true
    }

    private fun stopAllAndCleanup() {
        serviceRunning.set(false)
        workerHandler?.removeCallbacks(heartbeatRunnable)
        stopFpsVpn()
        GamingFirewallPlugin.restoreSavedDndIfNeeded(applicationContext)
        releaseWakeLock()
        startedAtMs.set(0L)
        boostExpiresAtMs = 0L
        blockAllNonSelected = false
        heartbeatCount.set(0L)
        lastHeartbeatAtMs.set(0L)
        stopForegroundSafely()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (serviceRunning.get() && rehydratePersistedSession()) {
            try {
                val restartIntent = Intent(applicationContext, PersistentGamingService::class.java).apply {
                    action = ACTION_START_SESSION
                    putStringArrayListExtra(EXTRA_BLOCKED_PACKAGES, ArrayList(activeBlockedPackages))
                    putStringArrayListExtra(EXTRA_ALLOWED_PACKAGES, ArrayList(activeAllowedPackages))
                    putExtra(EXTRA_BLOCK_ALL_NON_SELECTED, blockAllNonSelected)
                    putExtra(EXTRA_BOOST_EXPIRES_AT_MS, boostExpiresAtMs)
                    putExtra(EXTRA_PROTECTED_GAME, activeProtectedGame)
                    putExtra(EXTRA_DNS_FILTER, dnsFilterEnabled)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    applicationContext.startForegroundService(restartIntent)
                } else {
                    applicationContext.startService(restartIntent)
                }
            } catch (_: Exception) {
            }
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        workerHandler?.removeCallbacksAndMessages(null)
        workerHandler = null
        workerThread?.quitSafely()
        workerThread = null
        releaseWakeLock()
        serviceRunning.set(false)
        stopForegroundSafely()
        super.onDestroy()
    }
}
