package com.modareb.game;

import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG_APP = "[APP]";
    private static final String TAG_WEBVIEW = "[WEBVIEW]";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG_APP, "Activity lifecycle: onCreate");

        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                // Prevent white flash by aligning WebView background with game dark theme
                webView.setBackgroundColor(Color.parseColor("#020617"));

                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
            }
        } catch (Exception e) {
            Log.e(TAG_WEBVIEW, "WebView configuration error: " + e.getMessage());
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        Log.d(TAG_APP, "Activity lifecycle: onStart");
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG_APP, "Activity lifecycle: onResume");
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setBackgroundColor(Color.parseColor("#020617"));
            }
        } catch (Exception ignored) {}
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG_APP, "Activity lifecycle: onPause");
    }

    @Override
    protected void onStop() {
        super.onStop();
        Log.d(TAG_APP, "Activity lifecycle: onStop");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        Log.d(TAG_APP, "Activity lifecycle: onDestroy");
    }
}
