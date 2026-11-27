package com.fpsbooster.pro

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * BoostBootReceiver
 *
 * Automatically restores PersistentGamingService + FpsVpnService after device reboot
 * or app package update whenever an unexpired Super Boost session was active.
 */
class BoostBootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BoostBootReceiver"
        private const val PREFS_NAME = "fps_booster_persistent_session"
        private const val KEY_ACTIVE = "session_active"
        private const val KEY_BLOCKED = "session_blocked"
        private const val KEY_ALLOWED = "session_allowed"
        private const val KEY_BLOCK_ALL = "session_block_all"
        private const val KEY_EXPIRES_AT = "session_expires_at"
        private const val KEY_GAME = "session_game"
        private const val KEY_DNS = "session_dns"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) {
            return
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ACTIVE, false)) return

        val expiresAt = prefs.getLong(KEY_EXPIRES_AT, 0L)
        if (expiresAt > 0L && System.currentTimeMillis() >= expiresAt) {
            prefs.edit().putBoolean(KEY_ACTIVE, false).apply()
            return
        }

        val blocked = ArrayList(prefs.getStringSet(KEY_BLOCKED, emptySet()) ?: emptySet())
        val allowed = ArrayList(prefs.getStringSet(KEY_ALLOWED, emptySet()) ?: emptySet())
        val blockAll = prefs.getBoolean(KEY_BLOCK_ALL, true)
        val game = prefs.getString(KEY_GAME, "") ?: ""
        val dns = prefs.getBoolean(KEY_DNS, true)

        try {
            val svcIntent = Intent(context, PersistentGamingService::class.java).apply {
                this.action = PersistentGamingService.ACTION_START_SESSION
                putStringArrayListExtra(PersistentGamingService.EXTRA_BLOCKED_PACKAGES, blocked)
                putStringArrayListExtra(PersistentGamingService.EXTRA_ALLOWED_PACKAGES, allowed)
                putExtra(PersistentGamingService.EXTRA_BLOCK_ALL_NON_SELECTED, blockAll)
                putExtra(PersistentGamingService.EXTRA_BOOST_EXPIRES_AT_MS, expiresAt)
                putExtra(PersistentGamingService.EXTRA_PROTECTED_GAME, game)
                putExtra(PersistentGamingService.EXTRA_DNS_FILTER, dns)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, svcIntent)
            } else {
                context.startService(svcIntent)
            }
            Log.i(TAG, "Restored active Boost session after $action")
        } catch (e: Exception) {
            Log.w(TAG, "Could not auto-start PersistentGamingService on $action: ${e.message}")
        }
    }
}
