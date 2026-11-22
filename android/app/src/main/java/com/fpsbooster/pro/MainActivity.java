package com.fpsbooster.pro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register native Capacitor plugins
        registerPlugin(RealStatsPlugin.class);
        registerPlugin(GamingFirewallPlugin.class);
        registerPlugin(GamingEnginePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
