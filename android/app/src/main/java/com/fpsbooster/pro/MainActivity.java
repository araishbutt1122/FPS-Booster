package com.fpsbooster.pro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register RealStatsPlugin with Capacitor Bridge
        registerPlugin(RealStatsPlugin.class);
        super.onCreate(savedInstanceState);

        // Initialize Google Mobile Ads SDK immediately on app launch
        MobileAds.initialize(this, initializationStatus -> {});
    }
}
