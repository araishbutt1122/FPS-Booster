package com.fpsbooster.pro

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.ParcelFileDescriptor
import android.system.ErrnoException
import android.system.Os
import android.system.OsConstants
import android.system.StructPollfd
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import java.io.FileDescriptor
import java.io.FileInputStream
import java.io.IOException
import java.util.Collections
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

/**
 * FpsVpnService
 *
 * Dedicated Android VpnService (Kotlin) providing builder-based per-app traffic filtering
 * and zero-payload packet header processing:
 * - Excludes the active protected game, self, telephony/dialer, emergency, SMS/MMS,
 *   SystemUI, and core Google Play services so they always route natively at 0ms overhead.
 * - Routes only selected restricted background applications into a local dual-stack
 *   IPv4 (10.88.0.1/32) + IPv6 (fd00:1:fd00::1/128) drop TUN.
 * - Coordinates with PersistentGamingService (heartbeat watchdog + wake lock + START_STICKY)
 *   and uses registerDefaultNetworkCallback + rulesSignature deduplication to eliminate
 *   intermittent disconnects and self-teardown loops.
 */
class FpsVpnService : VpnService() {

    companion object {
        private const val TAG = "FpsVpnService"

        const val ACTION_START = "com.fpsbooster.pro.FPS_VPN_START"
        const val ACTION_UPDATE_RULES = "com.fpsbooster.pro.FPS_VPN_UPDATE_RULES"
        const val ACTION_STOP = "com.fpsbooster.pro.FPS_VPN_STOP"
        const val ACTION_HEARTBEAT_CHECK = "com.fpsbooster.pro.FPS_VPN_HEARTBEAT_CHECK"
        const val ACTION_VPN_STATE_BROADCAST = "com.fpsbooster.pro.VPN_STATE_CHANGED"

        const val EXTRA_BLOCKED_PACKAGES = "blocked_packages"
        const val EXTRA_ALLOWED_PACKAGES = "allowed_packages"
        const val EXTRA_BLOCK_ALL_NON_SELECTED = "block_all_non_selected"
        const val EXTRA_PROTECTED_GAME = "protected_game"
        const val EXTRA_DNS_FILTER = "dns_filter"
        const val EXTRA_EVENT_MESSAGE = "event_message"
        const val EXTRA_EVENT_TYPE = "event_type"

        private const val CHANNEL_ID = "fps_booster_vpn_tunnel_channel"
        private const val NOTIFICATION_ID = 4120
        private const val SESSION_PREFS = "fps_booster_vpn_session"
        private const val KEY_SESSION_ACTIVE = "session_active"
        private const val KEY_SESSION_BLOCKED = "session_blocked"
        private const val KEY_SESSION_ALLOWED = "session_allowed"
        private const val KEY_SESSION_BLOCK_ALL = "session_block_all"
        private const val KEY_SESSION_GAME = "session_game"
        private const val KEY_SESSION_DNS = "session_dns"

        private const val MAX_RECONNECT_LAYERS = 1000
        private const val MAX_FIREWALL_LAYERS = 1000
        private const val NETWORK_SWITCH_DEBOUNCE_MS = 1_500L
        private val WAKE_SIGNAL = byteArrayOf(1)

        /**
         * Essential OS, telephony, emergency, and Play Services packages that must ALWAYS
         * remain excluded from background traffic sinkholing.
         */
        @JvmField
        val ESSENTIAL_EXCLUDED_PACKAGES: Set<String> = Collections.unmodifiableSet(
            hashSetOf(
                "android",
                "com.android.phone",
                "com.android.server.telecom",
                "com.android.dialer",
                "com.google.android.dialer",
                "com.samsung.android.dialer",
                "com.samsung.android.incallui",
                "com.android.incallui",
                "com.android.emergency",
                "com.android.mms",
                "com.google.android.apps.messaging",
                "com.samsung.android.messaging",
                "com.android.systemui",
                "com.google.android.gms",
                "com.google.android.gsf",
                "com.android.vending"
            )
        )

        private val runningFlag = AtomicBoolean(false)
        private val transitioningFlag = AtomicBoolean(false)
        private val blockedBytesTotal = AtomicLong(0L)
        private val blockedPacketsTotal = AtomicLong(0L)
        private val blockedTcpPackets = AtomicLong(0L)
        private val blockedUdpPackets = AtomicLong(0L)
        private val blockedDnsQueries = AtomicLong(0L)
        private val blockedIpv4Packets = AtomicLong(0L)
        private val blockedIpv6Packets = AtomicLong(0L)
        private val sessionStartedAtMs = AtomicLong(0L)
        private val reconnectCounter = AtomicInteger(0)
        private val vpnLayerIndex = AtomicInteger(1)
        private val firewallLayerIndex = AtomicInteger(1)

        @Volatile
        private var connectionState: String = "READY"

        @Volatile
        private var activeTransport: String = "UNKNOWN"

        @Volatile
        private var lastFailureReason: String = ""

        @Volatile
        private var layerStatusNote: String = "Dual-Stack Guard Layer #1/1000"

        @Volatile
        private var activeProtectedGame: String = ""

        @Volatile
        private var dnsFilterActive: Boolean = true

        @Volatile
        private var blockAllNonSelected: Boolean = false

        private val activeBlockedPackages: MutableSet<String> =
            Collections.synchronizedSet(HashSet())

        private val activeAllowedPackages: MutableSet<String> =
            Collections.synchronizedSet(HashSet())

        @JvmStatic
        fun isVpnRunning(): Boolean = runningFlag.get()

        @JvmStatic
        fun getBlockedBytesTotal(): Long = blockedBytesTotal.get()

        @JvmStatic
        fun getBlockedPacketsTotal(): Long = blockedPacketsTotal.get()

        @JvmStatic
        fun getBlockedTcpPackets(): Long = blockedTcpPackets.get()

        @JvmStatic
        fun getBlockedUdpPackets(): Long = blockedUdpPackets.get()

        @JvmStatic
        fun getBlockedDnsQueries(): Long = blockedDnsQueries.get()

        @JvmStatic
        fun getBlockedIpv4Packets(): Long = blockedIpv4Packets.get()

        @JvmStatic
        fun getBlockedIpv6Packets(): Long = blockedIpv6Packets.get()

        @JvmStatic
        fun getUptimeSeconds(): Long {
            val started = sessionStartedAtMs.get()
            if (!runningFlag.get() || started <= 0L) return 0L
            return maxOf(0L, (System.currentTimeMillis() - started) / 1000L)
        }

        @JvmStatic
        fun getReconnectCount(): Int = reconnectCounter.get()

        @JvmStatic
        fun getVpnLayerIndex(): Int = vpnLayerIndex.get()

        @JvmStatic
        fun getFirewallLayerIndex(): Int = firewallLayerIndex.get()

        @JvmStatic
        fun getLayerStatusNote(): String = layerStatusNote

        @JvmStatic
        fun getConnectionState(): String = connectionState

        @JvmStatic
        fun getActiveTransport(): String = activeTransport

        @JvmStatic
        fun getLastFailureReason(): String = lastFailureReason

        @JvmStatic
        fun isDnsFilterActive(): Boolean = dnsFilterActive

        @JvmStatic
        fun getActiveProtectedGame(): String = activeProtectedGame

        @JvmStatic
        fun getActiveBlockedPackages(): List<String> = synchronized(activeBlockedPackages) {
            ArrayList(activeBlockedPackages)
        }

        @JvmStatic
        fun isExternalVpnConflict(ctx: Context?): Boolean {
            if (ctx == null || runningFlag.get() || transitioningFlag.get()) return false
            return try {
                val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                    ?: return false
                val active = cm.activeNetwork
                if (active != null) {
                    val caps = cm.getNetworkCapabilities(active)
                    if (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                        return true
                    }
                }
                @Suppress("DEPRECATION")
                for (n in cm.allNetworks) {
                    val caps = cm.getNetworkCapabilities(n)
                    if (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                        return true
                    }
                }
                false
            } catch (_: Exception) {
                false
            }
        }
    }

    private val vpnInterfaceRef = AtomicReference<ParcelFileDescriptor?>(null)

    @Volatile
    private var wakeReadFd: FileDescriptor? = null

    @Volatile
    private var wakeWriteFd: FileDescriptor? = null

    private var packetFilterThread: Thread? = null
    private var serviceWorkerThread: HandlerThread? = null
    private var serviceWorkerHandler: Handler? = null
    private var connectivityManager: ConnectivityManager? = null
    private var defaultNetworkCallback: ConnectivityManager.NetworkCallback? = null

    @Volatile
    private var activeUnderlyingNetworkHandle: Long = -1L

    @Volatile
    private var activeRulesSignature: String = ""

    private var foregroundStarted: Boolean = false
    private var consecutiveRetries: Int = 0

    private val debouncedReconnectRunnable = Runnable {
        if (!isSessionPersistedActive()) return@Runnable
        if (prepare(applicationContext) != null) {
            recordFailure("VPN permission revoked by system", "ERROR")
            stopFirewallVpn()
            stopSelf()
            return@Runnable
        }
        attemptControlledReconnect("Underlying transport change ($activeTransport)")
    }

    override fun onCreate() {
        super.onCreate()
        ensureNotificationChannel()
        serviceWorkerThread = HandlerThread("FpsVpnWorker").also { it.start() }
        serviceWorkerHandler = serviceWorkerThread?.looper?.let { Handler(it) }
        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        updateTransportSnapshot()
        registerDefaultNetworkMonitor()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        promoteToForeground("Initializing per-app VPN tunnel...")

        if (intent == null) {
            if (!rehydratePersistedSession()) {
                connectionState = "READY"
                stopForegroundSafely()
                stopSelf()
                return START_NOT_STICKY
            }
            configureAndStartVpn(forceRebuild = false)
            return START_STICKY
        }

        when (intent.action) {
            ACTION_STOP -> {
                persistSessionState(false, emptySet(), emptySet(), false, "", dnsFilterActive)
                stopFirewallVpn()
                stopForegroundSafely()
                stopSelf()
                return START_NOT_STICKY
            }

            ACTION_HEARTBEAT_CHECK -> {
                verifyTunnelHealthFromHeartbeat()
                return START_STICKY
            }
        }

        val incomingBlocked = intent.getStringArrayListExtra(EXTRA_BLOCKED_PACKAGES)
        val incomingAllowed = intent.getStringArrayListExtra(EXTRA_ALLOWED_PACKAGES)
        val incomingBlockAll = intent.getBooleanExtra(EXTRA_BLOCK_ALL_NON_SELECTED, false)
        val protectedGame = intent.getStringExtra(EXTRA_PROTECTED_GAME)
        val incomingDns = intent.getBooleanExtra(EXTRA_DNS_FILTER, true)

        activeProtectedGame = protectedGame ?: ""
        dnsFilterActive = incomingDns
        blockAllNonSelected = incomingBlockAll

        val sanitizedBlocked = HashSet<String>()
        if (incomingBlocked != null) {
            for (pkg in incomingBlocked) {
                if (isPackageSafeToFilter(pkg)) {
                    sanitizedBlocked.add(pkg)
                }
            }
        }

        val sanitizedAllowed = HashSet<String>()
        if (incomingAllowed != null) {
            for (pkg in incomingAllowed) {
                if (!pkg.isNullOrEmpty()) {
                    sanitizedAllowed.add(pkg)
                }
            }
        }

        synchronized(activeBlockedPackages) {
            activeBlockedPackages.clear()
            activeBlockedPackages.addAll(sanitizedBlocked)
        }
        synchronized(activeAllowedPackages) {
            activeAllowedPackages.clear()
            activeAllowedPackages.addAll(sanitizedAllowed)
        }

        if (ACTION_START == intent.action || ACTION_UPDATE_RULES == intent.action) {
            persistSessionState(
                true,
                sanitizedBlocked,
                sanitizedAllowed,
                blockAllNonSelected,
                activeProtectedGame,
                dnsFilterActive
            )
            consecutiveRetries = 0
            lastFailureReason = ""
            configureAndStartVpn(forceRebuild = (ACTION_UPDATE_RULES == intent.action))
        }

        return START_STICKY
    }

    private fun verifyTunnelHealthFromHeartbeat() {
        if (!isSessionPersistedActive()) return
        if (prepare(applicationContext) != null) {
            recordFailure("VPN permission revoked during session", "ERROR")
            stopFirewallVpn()
            stopForegroundSafely()
            stopSelf()
            return
        }
        val tun = vpnInterfaceRef.get()
        val healthy = runningFlag.get() && tun != null && tun.fileDescriptor != null && tun.fileDescriptor.valid()
        val hasTargets = blockAllNonSelected || synchronized(activeBlockedPackages) { activeBlockedPackages.isNotEmpty() }
        if (!healthy && !transitioningFlag.get() && hasTargets) {
            attemptControlledReconnect("Heartbeat watchdog recovery")
        }
    }

    private fun isPackageSafeToFilter(pkg: String?): Boolean {
        if (pkg.isNullOrEmpty()) return false
        if (pkg == packageName) return false
        if (pkg == activeProtectedGame) return false
        return !ESSENTIAL_EXCLUDED_PACKAGES.contains(pkg)
    }

    private fun computeRulesSignature(
        blocked: Set<String>,
        allowed: Set<String>,
        blockAll: Boolean,
        gamePkg: String,
        dns: Boolean
    ): String {
        val sortedBlocked = blocked.sorted()
        val sortedAllowed = allowed.sorted()
        return buildString {
            append(gamePkg)
            append('|')
            append(if (dns) '1' else '0')
            append('|')
            append(if (blockAll) 'A' else 'S')
            append('|')
            sortedBlocked.forEach { append(it).append(',') }
            append('|')
            sortedAllowed.forEach { append(it).append(',') }
        }
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "FPS Booster Per-App VPN Tunnel",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Maintains local per-app background traffic filtering while excluding games and system services."
                    setShowBadge(false)
                    setSound(null, null)
                }
                nm.createNotificationChannel(channel)
            }
        }
    }

    private fun buildForegroundNotification(statusText: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPending = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, PersistentGamingService::class.java).apply {
            action = PersistentGamingService.ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this,
            2,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val blockedCount = synchronized(activeBlockedPackages) { activeBlockedPackages.size }
        val title = if (activeProtectedGame.isNotEmpty()) {
            "FPS VPN Tunnel Active · Game Excluded"
        } else {
            "FPS VPN Per-App Filter"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText("$statusText · $blockedCount BG apps filtered")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(contentPending)
            .addAction(0, "Stop Boost", stopPending)
            .build()
    }

    private fun promoteToForeground(statusText: String) {
        try {
            ensureNotificationChannel()
            val notification = buildForegroundNotification(statusText)
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
            foregroundStarted = true
        } catch (e: Exception) {
            Log.w(TAG, "Unable to promote FpsVpnService to foreground: ${e.message}")
        }
    }

    private fun updateForegroundNotification(statusText: String) {
        if (!foregroundStarted) {
            promoteToForeground(statusText)
            return
        }
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.notify(NOTIFICATION_ID, buildForegroundNotification(statusText))
        } catch (_: Exception) {
        }
    }

    private fun stopForegroundSafely() {
        try {
            if (foregroundStarted) {
                ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
                foregroundStarted = false
            }
        } catch (_: Exception) {
        }
    }

    @Synchronized
    private fun configureAndStartVpn(forceRebuild: Boolean) {
        val snapshotBlocked: Set<String> = synchronized(activeBlockedPackages) {
            HashSet(activeBlockedPackages)
        }
        val snapshotAllowed: Set<String> = synchronized(activeAllowedPackages) {
            HashSet(activeAllowedPackages)
        }
        val blockAll = blockAllNonSelected
        val newSignature = computeRulesSignature(
            snapshotBlocked,
            snapshotAllowed,
            blockAll,
            activeProtectedGame,
            dnsFilterActive
        )

        val existingTun = vpnInterfaceRef.get()
        if (!forceRebuild &&
            runningFlag.get() &&
            existingTun != null &&
            existingTun.fileDescriptor != null &&
            existingTun.fileDescriptor.valid() &&
            newSignature == activeRulesSignature
        ) {
            connectionState = "CONNECTED"
            updateForegroundNotification("Healthy on $activeTransport")
            return
        }

        if (prepare(this) != null) {
            recordFailure("Android VPN consent missing or revoked", "ERROR")
            return
        }

        if (isExternalVpnConflict(this)) {
            recordFailure("Another active VPN is running on this device", "ERROR")
            return
        }

        transitioningFlag.set(true)
        try {
            closeVpnInterfaceOnly()

            connectionState = "CONNECTING"
            broadcastStateEvent("state_change", "Configuring FpsVpnService per-app tunnel")

            val builder = Builder()
                .setSession("FPS Booster Per-App VPN")
                .setMtu(1500)
                .setBlocking(true)
                .addAddress("10.88.0.1", 32)
                .addRoute("0.0.0.0", 0)
                .addAddress("fd00:1:fd00::1", 128)
                .addRoute("::", 0)

            if (dnsFilterActive) {
                builder.addDnsServer("10.88.0.2")
                builder.addDnsServer("fd00:1:fd00::2")
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                builder.setMetered(false)
            }

            val pm = packageManager
            var statusLabel: String

            if (blockAll) {
                // Global Background Firewall Mode:
                // Exclude self, active protected game, essential calling/OS packages, and user-allowed apps
                // via addDisallowedApplication so ALL other apps route into the local drop TUN.
                val excludedSet = HashSet<String>()
                excludedSet.add(packageName)
                if (activeProtectedGame.isNotEmpty()) {
                    excludedSet.add(activeProtectedGame)
                }
                excludedSet.addAll(ESSENTIAL_EXCLUDED_PACKAGES)
                for (allowedPkg in snapshotAllowed) {
                    if (allowedPkg.isNotEmpty() && !snapshotBlocked.contains(allowedPkg)) {
                        excludedSet.add(allowedPkg)
                    }
                }

                var excludedCount = 0
                for (pkg in excludedSet) {
                    try {
                        pm.getApplicationInfo(pkg, 0)
                        builder.addDisallowedApplication(pkg)
                        excludedCount++
                    } catch (_: PackageManager.NameNotFoundException) {
                        // Not installed on device; skip cleanly
                    } catch (e: Exception) {
                        Log.w(TAG, "Skipping exclusion for $pkg: ${e.message}")
                    }
                }
                statusLabel = "All background apps filtered ($excludedCount excluded)"
            } else {
                var attachedCount = 0
                // Selective Blocklist Mode: ONLY sanitized installed blocked apps enter TUN.
                for (pkg in snapshotBlocked) {
                    if (!isPackageSafeToFilter(pkg)) continue
                    try {
                        pm.getApplicationInfo(pkg, 0)
                        builder.addAllowedApplication(pkg)
                        attachedCount++
                    } catch (_: PackageManager.NameNotFoundException) {
                        // Not installed on device; skip cleanly
                    } catch (e: Exception) {
                        Log.w(TAG, "Skipping package $pkg: ${e.message}")
                    }
                }

                if (attachedCount == 0) {
                    // Firewall Backup Layer escalation: automatically fall back to strict non-selected exclusion layer
                    val nextFwLayer = (firewallLayerIndex.get() % MAX_FIREWALL_LAYERS) + 1
                    firewallLayerIndex.set(nextFwLayer)
                    val fallbackExcluded = HashSet<String>()
                    fallbackExcluded.add(packageName)
                    if (activeProtectedGame.isNotEmpty()) {
                        fallbackExcluded.add(activeProtectedGame)
                    }
                    fallbackExcluded.addAll(ESSENTIAL_EXCLUDED_PACKAGES)
                    for (allowedPkg in snapshotAllowed) {
                        if (allowedPkg.isNotEmpty() && !snapshotBlocked.contains(allowedPkg)) {
                            fallbackExcluded.add(allowedPkg)
                        }
                    }
                    var fallbackExcludedCount = 0
                    for (pkg in fallbackExcluded) {
                        try {
                            pm.getApplicationInfo(pkg, 0)
                            builder.addDisallowedApplication(pkg)
                            fallbackExcludedCount++
                        } catch (_: PackageManager.NameNotFoundException) {
                        } catch (e: Exception) {
                            Log.w(TAG, "Skipping fallback exclusion for $pkg: ${e.message}")
                        }
                    }
                    statusLabel = "Firewall Layer #$nextFwLayer/$MAX_FIREWALL_LAYERS ($fallbackExcludedCount excluded)"
                } else {
                    statusLabel = "Firewall Layer #${firewallLayerIndex.get()}/$MAX_FIREWALL_LAYERS ($attachedCount apps filtered)"
                }
            }

            val tun = builder.establish()
            if (tun == null) {
                recordFailure("VpnService.Builder.establish() returned null", "RECONNECTING")
                attemptControlledReconnect("TUN establish backup layer")
                return
            }

            vpnInterfaceRef.set(tun)
            activeRulesSignature = newSignature
            if (sessionStartedAtMs.get() == 0L) {
                sessionStartedAtMs.set(System.currentTimeMillis())
            }
            runningFlag.set(true)
            connectionState = "CONNECTED"
            lastFailureReason = ""
            consecutiveRetries = 0
            layerStatusNote = "VPN Layer #${vpnLayerIndex.get()}/$MAX_RECONNECT_LAYERS · FW Layer #${firewallLayerIndex.get()}/$MAX_FIREWALL_LAYERS"

            startPacketFilterLoop(tun)
            updateForegroundNotification("VPN Layer #${vpnLayerIndex.get()} · $statusLabel ($activeTransport)")
            broadcastStateEvent("connected", "FpsVpnService active ($statusLabel)")
            Log.i(TAG, "FpsVpnService established ($statusLabel) on $activeTransport")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to establish FpsVpnService", e)
            closeVpnInterfaceOnly()
            recordFailure(e.message ?: "VPN establish exception", "ERROR")
            attemptControlledReconnect("Establish exception recovery")
        } finally {
            transitioningFlag.set(false)
        }
    }

    private fun startPacketFilterLoop(tun: ParcelFileDescriptor) {
        try {
            val pipeFds = Os.pipe()
            wakeReadFd = pipeFds[0]
            wakeWriteFd = pipeFds[1]
        } catch (e: ErrnoException) {
            Log.w(TAG, "Wake-pipe unavailable, falling back to blocking read: ${e.message}")
            wakeReadFd = null
            wakeWriteFd = null
        }

        packetFilterThread = Thread({
            val inputStream = FileInputStream(tun.fileDescriptor)
            val packetBuf = ByteArray(2048)
            try {
                val readWake = wakeReadFd
                if (readWake != null) {
                    val pollFds = arrayOf(
                        StructPollfd().apply {
                            fd = tun.fileDescriptor
                            events = OsConstants.POLLIN.toShort()
                        },
                        StructPollfd().apply {
                            fd = readWake
                            events = OsConstants.POLLIN.toShort()
                        }
                    )

                    while (runningFlag.get() && !Thread.currentThread().isInterrupted) {
                        val ready = Os.poll(pollFds, -1)
                        if (ready <= 0) continue

                        if ((pollFds[1].revents.toInt() and (OsConstants.POLLIN or OsConstants.POLLHUP or OsConstants.POLLERR)) != 0) {
                            break
                        }
                        if ((pollFds[0].revents.toInt() and (OsConstants.POLLHUP or OsConstants.POLLERR)) != 0) {
                            break
                        }
                        if ((pollFds[0].revents.toInt() and OsConstants.POLLIN) != 0) {
                            val length = inputStream.read(packetBuf)
                            if (length > 0) {
                                inspectHeaderAndCount(packetBuf, length)
                            } else if (length < 0) {
                                break
                            }
                        }
                    }
                } else {
                    while (runningFlag.get() && !Thread.currentThread().isInterrupted) {
                        val length = inputStream.read(packetBuf)
                        if (length > 0) {
                            inspectHeaderAndCount(packetBuf, length)
                        } else if (length < 0) {
                            break
                        }
                    }
                }
            } catch (e: Exception) {
                if (runningFlag.get() && (e is IOException || e is ErrnoException)) {
                    Log.w(TAG, "TUN packet loop interrupted: ${e.message}")
                }
            } finally {
                try {
                    inputStream.close()
                } catch (_: IOException) {
                }
                closeWakePipe()
            }
        }, "FpsVpnPacketLoop").apply {
            isDaemon = true
            start()
        }
    }

    /**
     * Header-only telemetry accounting for IPv4, IPv6, TCP, UDP, and DNS packets.
     * Zero allocations, never inspects or stores payload data.
     */
    private fun inspectHeaderAndCount(buf: ByteArray, length: Int) {
        blockedBytesTotal.addAndGet(length.toLong())
        blockedPacketsTotal.incrementAndGet()
        if (length < 20) return

        val version = (buf[0].toInt() ushr 4) and 0x0F
        var protocol = -1
        var transportOffset = -1

        if (version == 4) {
            blockedIpv4Packets.incrementAndGet()
            val ihl = (buf[0].toInt() and 0x0F) * 4
            if (ihl >= 20 && length >= ihl) {
                protocol = buf[9].toInt() and 0xFF
                transportOffset = ihl
            }
        } else if (version == 6 && length >= 40) {
            blockedIpv6Packets.incrementAndGet()
            protocol = buf[6].toInt() and 0xFF
            transportOffset = 40
        }

        if (protocol == 6) {
            blockedTcpPackets.incrementAndGet()
        } else if (protocol == 17) {
            blockedUdpPackets.incrementAndGet()
        }

        if ((protocol == 6 || protocol == 17) && transportOffset >= 0 && length >= transportOffset + 4) {
            val dstPort =
                ((buf[transportOffset + 2].toInt() and 0xFF) shl 8) or
                    (buf[transportOffset + 3].toInt() and 0xFF)
            if (dstPort == 53 || dstPort == 853) {
                blockedDnsQueries.incrementAndGet()
            }
        }
    }

    private fun signalWakePipe() {
        val writeFd = wakeWriteFd
        if (writeFd != null && writeFd.valid()) {
            try {
                Os.write(writeFd, WAKE_SIGNAL, 0, 1)
            } catch (_: Exception) {
            }
        }
    }

    private fun closeWakePipe() {
        wakeReadFd?.let {
            try {
                Os.close(it)
            } catch (_: Exception) {
            }
            wakeReadFd = null
        }
        wakeWriteFd?.let {
            try {
                Os.close(it)
            } catch (_: Exception) {
            }
            wakeWriteFd = null
        }
    }

    private fun closeVpnInterfaceOnly() {
        runningFlag.set(false)
        signalWakePipe()
        packetFilterThread?.interrupt()
        packetFilterThread = null

        vpnInterfaceRef.getAndSet(null)?.let { tun ->
            try {
                tun.close()
            } catch (_: IOException) {
            }
        }
        closeWakePipe()
    }

    @Synchronized
    private fun stopFirewallVpn() {
        serviceWorkerHandler?.removeCallbacks(debouncedReconnectRunnable)
        activeRulesSignature = ""
        blockAllNonSelected = false
        closeVpnInterfaceOnly()
        synchronized(activeBlockedPackages) {
            activeBlockedPackages.clear()
        }
        synchronized(activeAllowedPackages) {
            activeAllowedPackages.clear()
        }
        activeProtectedGame = ""
        sessionStartedAtMs.set(0L)
        consecutiveRetries = 0
        vpnLayerIndex.set(1)
        firewallLayerIndex.set(1)
        layerStatusNote = "Dual-Stack Guard Ready"
        connectionState = "READY"
        broadcastStateEvent("disconnected", "FpsVpnService stopped & normal networking restored")
        Log.i(TAG, "FpsVpnService stopped cleanly.")
    }

    private fun attemptControlledReconnect(reason: String) {
        if (!isSessionPersistedActive()) return
        if (consecutiveRetries >= MAX_RECONNECT_LAYERS) {
            recordFailure("Layer cycle limit reached ($MAX_RECONNECT_LAYERS/$MAX_RECONNECT_LAYERS)", "ERROR")
            return
        }
        consecutiveRetries++
        val nextVpnLayer = (vpnLayerIndex.get() % MAX_RECONNECT_LAYERS) + 1
        val nextFwLayer = (firewallLayerIndex.get() % MAX_FIREWALL_LAYERS) + 1
        vpnLayerIndex.set(nextVpnLayer)
        firewallLayerIndex.set(nextFwLayer)
        reconnectCounter.incrementAndGet()
        connectionState = "RECONNECTING"
        layerStatusNote = "Switching to VPN Layer #$nextVpnLayer/$MAX_RECONNECT_LAYERS"
        broadcastStateEvent(
            "reconnecting",
            "$reason · Backup VPN Layer #$nextVpnLayer/$MAX_RECONNECT_LAYERS"
        )
        val delayMs = minOf(2_000L, 600L + (consecutiveRetries * 150L))
        serviceWorkerHandler?.postDelayed({ configureAndStartVpn(forceRebuild = true) }, delayMs)
    }

    private fun recordFailure(reason: String?, state: String) {
        lastFailureReason = reason ?: "Unknown VPN error"
        connectionState = state
        broadcastStateEvent("error", lastFailureReason)
        updateForegroundNotification("Tunnel recovery paused: $lastFailureReason")
    }

    private fun registerDefaultNetworkMonitor() {
        val cm = connectivityManager ?: return
        try {
            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    val caps = cm.getNetworkCapabilities(network)
                    if (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                        return
                    }
                    val newHandle = network.networkHandle
                    val prevHandle = activeUnderlyingNetworkHandle
                    activeUnderlyingNetworkHandle = newHandle
                    updateTransportFromCaps(caps)

                    val tunnelHealthy = runningFlag.get() && vpnInterfaceRef.get() != null
                    if (isSessionPersistedActive() &&
                        (!tunnelHealthy || (prevHandle != -1L && prevHandle != newHandle))
                    ) {
                        serviceWorkerHandler?.removeCallbacks(debouncedReconnectRunnable)
                        serviceWorkerHandler?.postDelayed(
                            debouncedReconnectRunnable,
                            NETWORK_SWITCH_DEBOUNCE_MS
                        )
                    }
                }

                override fun onLost(network: Network) {
                    if (network.networkHandle == activeUnderlyingNetworkHandle) {
                        activeUnderlyingNetworkHandle = -1L
                    }
                    updateTransportSnapshot()
                    if (isSessionPersistedActive()) {
                        broadcastStateEvent("network_lost", "Underlying network transition ($activeTransport)")
                    }
                }

                override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
                    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) return
                    val prevTransport = activeTransport
                    updateTransportFromCaps(caps)
                    if (prevTransport != activeTransport && runningFlag.get()) {
                        updateForegroundNotification("Filtering via $activeTransport")
                    }
                }
            }
            defaultNetworkCallback = callback
            cm.registerDefaultNetworkCallback(callback)
        } catch (e: Exception) {
            Log.w(TAG, "DefaultNetworkCallback unavailable: ${e.message}")
        }
    }

    private fun unregisterDefaultNetworkMonitor() {
        val cb = defaultNetworkCallback ?: return
        try {
            connectivityManager?.unregisterNetworkCallback(cb)
        } catch (_: Exception) {
        }
        defaultNetworkCallback = null
    }

    private fun updateTransportSnapshot() {
        val cm = connectivityManager
        if (cm == null) {
            activeTransport = "UNKNOWN"
            return
        }
        try {
            val active = cm.activeNetwork
            if (active == null) {
                activeTransport = "OFFLINE"
                return
            }
            val caps = cm.getNetworkCapabilities(active)
            if (caps != null && !caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                activeUnderlyingNetworkHandle = active.networkHandle
            }
            updateTransportFromCaps(caps)
        } catch (_: Exception) {
            activeTransport = "UNKNOWN"
        }
    }

    private fun updateTransportFromCaps(caps: NetworkCapabilities?) {
        activeTransport = when {
            caps == null -> "OFFLINE"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
            else -> "CONNECTED"
        }
    }

    private fun persistSessionState(
        active: Boolean,
        blocked: Set<String>,
        allowed: Set<String>,
        blockAll: Boolean,
        gamePkg: String,
        dns: Boolean
    ) {
        getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_SESSION_ACTIVE, active)
            .putStringSet(KEY_SESSION_BLOCKED, HashSet(blocked))
            .putStringSet(KEY_SESSION_ALLOWED, HashSet(allowed))
            .putBoolean(KEY_SESSION_BLOCK_ALL, blockAll)
            .putString(KEY_SESSION_GAME, gamePkg)
            .putBoolean(KEY_SESSION_DNS, dns)
            .apply()
    }

    private fun isSessionPersistedActive(): Boolean {
        return getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_SESSION_ACTIVE, false)
    }

    private fun rehydratePersistedSession(): Boolean {
        val prefs = getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_SESSION_ACTIVE, false)) return false
        if (prepare(this) != null) {
            persistSessionState(false, emptySet(), emptySet(), false, "", true)
            return false
        }
        val savedBlocked = prefs.getStringSet(KEY_SESSION_BLOCKED, emptySet()) ?: emptySet()
        val savedAllowed = prefs.getStringSet(KEY_SESSION_ALLOWED, emptySet()) ?: emptySet()
        blockAllNonSelected = prefs.getBoolean(KEY_SESSION_BLOCK_ALL, false)
        activeProtectedGame = prefs.getString(KEY_SESSION_GAME, "") ?: ""
        dnsFilterActive = prefs.getBoolean(KEY_SESSION_DNS, true)
        synchronized(activeBlockedPackages) {
            activeBlockedPackages.clear()
            for (pkg in savedBlocked) {
                if (isPackageSafeToFilter(pkg)) {
                    activeBlockedPackages.add(pkg)
                }
            }
        }
        synchronized(activeAllowedPackages) {
            activeAllowedPackages.clear()
            for (pkg in savedAllowed) {
                if (pkg.isNotEmpty()) {
                    activeAllowedPackages.add(pkg)
                }
            }
        }
        return true
    }

    private fun broadcastStateEvent(type: String, message: String) {
        try {
            val intent = Intent(ACTION_VPN_STATE_BROADCAST).apply {
                setPackage(packageName)
                putExtra(EXTRA_EVENT_TYPE, type)
                putExtra(EXTRA_EVENT_MESSAGE, message)
            }
            sendBroadcast(intent)
        } catch (_: Exception) {
        }
    }

    override fun onRevoke() {
        persistSessionState(false, emptySet(), emptySet(), false, "", dnsFilterActive)
        recordFailure("VPN connection revoked by Android or user", "READY")
        stopFirewallVpn()
        stopForegroundSafely()
        super.onRevoke()
    }

    override fun onDestroy() {
        unregisterDefaultNetworkMonitor()
        serviceWorkerHandler?.removeCallbacksAndMessages(null)
        serviceWorkerHandler = null
        serviceWorkerThread?.quitSafely()
        serviceWorkerThread = null
        stopFirewallVpn()
        stopForegroundSafely()
        super.onDestroy()
    }
}
