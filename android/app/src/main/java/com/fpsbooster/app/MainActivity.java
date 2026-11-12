package com.fpsbooster.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register RealStatsPlugin with Capacitor Bridge
        registerPlugin(RealStatsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
