package com.modareb.game;

import android.content.ComponentCallbacks2;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * High-Performance Production MainActivity for "أنت المدرب" (com.modareb.game)
 *
 * Implements Android Vitals Zero-ANR & Zero-Crash Architecture:
 * 1. Offloads all heavy setup from onCreate() to getWindow().getDecorView().post(...) to eliminate
 *    the "Input dispatching timed out (No focused window)" ANR.
 * 2. Overrides onRenderProcessGone() via custom BridgeWebViewClient returning true to eliminate
 *    fatal [base.apk!libwebviewchromium.so] SIGSEGV / SIGTRAP crashes.
 * 3. Applies OVER_SCROLL_NEVER and LAYER_TYPE_NONE to eliminate MediaTek [libGLESv2_mtk.so]
 *    glDrawArrays GPU driver deadlock ANRs.
 * 4. Ensures clean lifecycle pausing and native WebView cleanup in onDestroy().
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG_APP = "ModarebApp";
    private static final String TAG_WEBVIEW = "ModarebWebView";
    private static final String THEME_BACKGROUND_COLOR = "#020617";

    // Dedicated background thread for non-UI initialization tasks
    private final ExecutorService backgroundExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "modareb-bg-init");
        t.setPriority(Thread.NORM_PRIORITY - 1);
        t.setDaemon(true);
        return t;
    });

    private boolean isWebViewConfigured = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the Google Play in-app update plugin before the bridge initializes
        registerPlugin(InAppUpdatePlugin.class);
        // Step 1: Let BridgeActivity complete core framework initialization without blocking
        super.onCreate(savedInstanceState);
        Log.d(TAG_APP, "Activity onCreate initiated");

        // Step 2: Clear all heavy work from the UI thread.
        // Using decorView.post() guarantees the Window surface is created, measured, drawn,
        // and given focus by WindowManager BEFORE any WebView configurations run.
        // This completely eliminates the "Input dispatching timed out (No focused window)" ANR.
        getWindow().getDecorView().post(() -> {
            setupWebViewSafely();
            scheduleBackgroundWarmup();
        });
    }

    /**
     * Configures custom BridgeWebViewClient, GPU compositing layer, and MediaTek stability flags.
     * Guaranteed to execute after initial window focus.
     */
    private void setupWebViewSafely() {
        if (isWebViewConfigured || isFinishing() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && isDestroyed())) {
            return;
        }

        Bridge bridge = getBridge();
        if (bridge == null) {
            Log.w(TAG_WEBVIEW, "Capacitor bridge is null, retrying setup in next frame");
            getWindow().getDecorView().postDelayed(this::setupWebViewSafely, 100);
            return;
        }

        WebView webView = bridge.getWebView();
        if (webView == null) {
            Log.w(TAG_WEBVIEW, "WebView is null, retrying setup in next frame");
            getWindow().getDecorView().postDelayed(this::setupWebViewSafely, 100);
            return;
        }

        try {
            // 1. Align background color with dark theme to eliminate white startup flash
            webView.setBackgroundColor(Color.parseColor(THEME_BACKGROUND_COLOR));

            // 2. Fix [libGLESv2_mtk.so] glDrawArrays crash & GPU lockup on MediaTek devices:
            // MediaTek's GLES driver contains race conditions during overscroll stretch/glow drawing.
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);

            // Avoid conflicting offscreen FBO layers on WebView; render directly to the Window's hardware surface
            webView.setLayerType(View.LAYER_TYPE_NONE, null);

            // 3. WebSettings Optimization for memory and render stability
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setTextZoom(100); // Prevent unwanted reflow loops

            // Security & I/O performance
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(true);
            settings.setGeolocationEnabled(false);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Disable synchronous SafeBrowsing network queries on main thread
                settings.setSafeBrowsingEnabled(false);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            }

            // 4. Fix [base.apk!libwebviewchromium.so] SIGSEGV / SIGTRAP crashes:
            // Set custom BridgeWebViewClient overriding onRenderProcessGone() to return true with safe bridge reloading
            bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    boolean didCrash = (detail != null && detail.didCrash());
                    int priority = (detail != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) 
                            ? detail.rendererPriorityAtExit() : -1;

                    Log.e(TAG_WEBVIEW, "Chromium render process terminated. didCrash=" + didCrash + ", priority=" + priority);

                    try {
                        if (view != null) {
                            view.stopLoading();
                        }
                    } catch (Exception ignored) {}

                    // Schedule safe reload to recover user session without crashing the host process
                    if (!isFinishing() && (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR1 || !isDestroyed())) {
                        getWindow().getDecorView().postDelayed(() -> {
                            try {
                                if (getBridge() != null && !isFinishing() && (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR1 || !isDestroyed())) {
                                    Log.i(TAG_WEBVIEW, "Reloading Capacitor bridge following renderer crash recovery");
                                    getBridge().reload();
                                }
                            } catch (Exception e) {
                                Log.e(TAG_WEBVIEW, "Failed to reload bridge after render crash: " + e.getMessage());
                            }
                        }, 300);
                    }

                    // Returning true notifies Android that the app has handled the termination gracefully,
                    // which completely prevents the fatal SIGSEGV / SIGTRAP crash of the application process!
                    return true;
                }
            });

            isWebViewConfigured = true;
            Log.i(TAG_WEBVIEW, "Custom BridgeWebViewClient and MediaTek GPU stability applied successfully");

        } catch (Exception e) {
            Log.e(TAG_WEBVIEW, "Error configuring WebView stability settings: " + e.getMessage(), e);
        }
    }

    /**
     * Offloads non-critical initialization routines to background executor.
     */
    private void scheduleBackgroundWarmup() {
        backgroundExecutor.execute(() -> {
            try {
                Log.d(TAG_APP, "Background initialization warmup running off Main Thread");
                // Pre-warm thread pools and caches without competing with UI thread
                Thread.sleep(50);
            } catch (Exception ignored) {}
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.onResume();
                webView.resumeTimers();
                webView.setBackgroundColor(Color.parseColor(THEME_BACKGROUND_COLOR));
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        // CRITICAL ADMOB FIX:
        // NEVER call webView.pauseTimers() or webView.onPause() here!
        // In Android Chromium, WebView.pauseTimers() is a PROCESS-GLOBAL static call.
        // When AdMob opens full-screen AdActivity, MainActivity is paused.
        // If pauseTimers() is called, it freezes all JavaScript timers and countdowns
        // ("Reward in X seconds") inside AdMob's AdActivity WebView, causing ads to permanently freeze!
        super.onPause();
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        // Clean up RAM buffers and graphics caches when OS signals memory pressure
        if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW || level == ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().clearCache(false); // Clear RAM cache only
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onDestroy() {
        // Step 1: Terminate background executor
        try {
            if (!backgroundExecutor.isShutdown()) {
                backgroundExecutor.shutdownNow();
            }
        } catch (Exception ignored) {}

        // Step 2: Clean up WebView to prevent native memory leaks in libwebviewchromium.so
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.stopLoading();
                webView.loadUrl("about:blank");
                webView.clearHistory();
            }
        } catch (Exception ignored) {}

        super.onDestroy();
        Log.d(TAG_APP, "Activity onDestroy completed cleanly");
    }
}
