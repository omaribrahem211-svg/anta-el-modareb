package com.getcapacitor.community.admob.banner;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.RelativeLayout;
import androidx.annotation.NonNull;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.util.Supplier;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.community.admob.helpers.AdViewIdHelper;
import com.getcapacitor.community.admob.helpers.RequestHelper;
import com.getcapacitor.community.admob.models.AdMobPluginError;
import com.getcapacitor.community.admob.models.AdMobRevenueData;
import com.getcapacitor.community.admob.models.AdOptions;
import com.getcapacitor.community.admob.models.Executor;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.common.util.BiConsumer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class BannerExecutor extends Executor {

    private final JSObject emptyObject = new JSObject();
    private final Map<String, RelativeLayout> mAdViewLayouts = new ConcurrentHashMap<>();
    private final Map<String, AdView> mAdViews = new ConcurrentHashMap<>();
    private ViewGroup mViewGroup;

    public BannerExecutor(
        Supplier<Context> contextSupplier,
        Supplier<Activity> activitySupplier,
        BiConsumer<String, JSObject> notifyListenersFunction,
        String pluginLogTag
    ) {
        super(contextSupplier, activitySupplier, notifyListenersFunction, pluginLogTag, "BannerExecutor");
    }

    public void initialize() {
        Activity act = activitySupplier.get();
        if (act != null) {
            ViewGroup root = act.findViewById(android.R.id.content);
            if (root != null) {
                View child = root.getChildAt(0);
                if (child instanceof CoordinatorLayout || (child instanceof FrameLayout && !(child instanceof WebView))) {
                    mViewGroup = (ViewGroup) child;
                } else {
                    mViewGroup = root;
                }
            }
        }
    }

    public void showBanner(final PluginCall call) {
        final AdOptions adOptions = AdOptions.getFactory().createBannerOptions(call);
        final String posKey = (adOptions.position != null && !adOptions.position.isEmpty()) ? adOptions.position : "BOTTOM_CENTER";
        float density = contextSupplier.get().getResources().getDisplayMetrics().density;

        int defaultWidthPixels = contextSupplier.get().getResources().getDisplayMetrics().widthPixels;

        DisplayMetrics metrics = new DisplayMetrics();
        activitySupplier.get().getWindowManager().getDefaultDisplay().getRealMetrics(metrics);
        int realWidthPixels = metrics.widthPixels;

        boolean fullscreen = false;
        if ((activitySupplier.get().getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_FULLSCREEN) != 0) {
            fullscreen = true;
        }

        if (mAdViews.containsKey(posKey) && mAdViews.get(posKey) != null) {
            updateExistingAdView(adOptions, posKey);
            call.resolve();
            return;
        }

        try {
            if (mViewGroup == null) {
                initialize();
            }

            final AdView adView = new AdView(contextSupplier.get());

            if (!adOptions.adSize.toString().equals("ADAPTIVE_BANNER")) {
                adView.setAdSize(adOptions.adSize.getSize());
            } else {
                adView.setAdSize(
                    AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(contextSupplier.get(), (int) (defaultWidthPixels / density))
                );
            }

            // Setup AdView Layout
            final RelativeLayout adViewLayout = new RelativeLayout(contextSupplier.get());
            adViewLayout.setHorizontalGravity(Gravity.CENTER_HORIZONTAL);

            int gravity;
            switch (adOptions.position != null ? adOptions.position : "BOTTOM_CENTER") {
                case "TOP_CENTER":
                    gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                    adViewLayout.setVerticalGravity(Gravity.TOP);
                    break;
                case "CENTER":
                    gravity = Gravity.CENTER;
                    adViewLayout.setVerticalGravity(Gravity.CENTER_VERTICAL);
                    break;
                default:
                    gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
                    adViewLayout.setVerticalGravity(Gravity.BOTTOM);
                    break;
            }

            int densityMargin = (int) (adOptions.margin * density);
            int topMargin = "TOP_CENTER".equals(adOptions.position) ? densityMargin : 0;
            int bottomMargin = ("BOTTOM_CENTER".equals(adOptions.position) || adOptions.position == null || adOptions.position.isEmpty()) ? densityMargin : 0;

            int adWidth = (int) (adOptions.adSize.getSize().getWidth() * density);
            int sideMargin = 0;
            if (adWidth > 0 && !adOptions.adSize.toString().equals("ADAPTIVE_BANNER")) {
                sideMargin = Math.max(0, ((int) defaultWidthPixels - adWidth) / 2);
            }
            if (fullscreen) {
                sideMargin = Math.max(sideMargin, (realWidthPixels - defaultWidthPixels) / 2);
            }

            if (mViewGroup instanceof CoordinatorLayout) {
                CoordinatorLayout.LayoutParams clp = new CoordinatorLayout.LayoutParams(
                    CoordinatorLayout.LayoutParams.WRAP_CONTENT,
                    CoordinatorLayout.LayoutParams.WRAP_CONTENT
                );
                clp.gravity = gravity;
                clp.setMargins(sideMargin, topMargin, sideMargin, bottomMargin);
                adViewLayout.setLayoutParams(clp);
            } else {
                FrameLayout.LayoutParams flp = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                );
                flp.gravity = gravity;
                flp.setMargins(sideMargin, topMargin, sideMargin, bottomMargin);
                adViewLayout.setLayoutParams(flp);
            }

            // set Safe Area only for Android 15+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                final int finalSideMargin = sideMargin;
                final int finalTopMargin = topMargin;
                final int finalBottomMargin = bottomMargin;
                View rootView = activitySupplier.get().getWindow().getDecorView();
                rootView.setOnApplyWindowInsetsListener((v, insets) -> {
                    int bottomInset = insets.getSystemWindowInsetBottom();
                    int topInset = insets.getSystemWindowInsetTop();

                    ViewGroup.LayoutParams lp = adViewLayout.getLayoutParams();
                    if (lp instanceof ViewGroup.MarginLayoutParams) {
                        ViewGroup.MarginLayoutParams mlp = (ViewGroup.MarginLayoutParams) lp;
                        if ("TOP_CENTER".equals(adOptions.position)) {
                            mlp.setMargins(finalSideMargin, finalTopMargin + topInset, finalSideMargin, finalBottomMargin);
                        } else {
                            mlp.setMargins(finalSideMargin, finalTopMargin, finalSideMargin, finalBottomMargin + bottomInset);
                        }
                        adViewLayout.setLayoutParams(mlp);
                    }
                    return insets;
                });
            }

            mAdViews.put(posKey, adView);
            mAdViewLayouts.put(posKey, adViewLayout);

            createNewAdView(adOptions, posKey, adView, adViewLayout);

            call.resolve();
        } catch (Exception ex) {
            call.reject(ex.getLocalizedMessage(), ex);
        }
    }

    public void hideBanner(final PluginCall call) {
        try {
            activitySupplier
                .get()
                .runOnUiThread(() -> {
                    for (Map.Entry<String, RelativeLayout> entry : mAdViewLayouts.entrySet()) {
                        if (entry.getValue() != null) {
                            entry.getValue().setVisibility(View.GONE);
                        }
                    }
                    for (Map.Entry<String, AdView> entry : mAdViews.entrySet()) {
                        if (entry.getValue() != null) {
                            entry.getValue().pause();
                        }
                    }

                    final BannerAdSizeInfo sizeInfo = new BannerAdSizeInfo(0, 0);
                    notifyListeners(BannerAdPluginEvents.SizeChanged.getWebEventName(), sizeInfo);
                    call.resolve();
                });
        } catch (Exception ex) {
            call.reject(ex.getLocalizedMessage(), ex);
        }
    }

    public void resumeBanner(final PluginCall call) {
        try {
            activitySupplier
                .get()
                .runOnUiThread(() -> {
                    for (Map.Entry<String, RelativeLayout> entry : mAdViewLayouts.entrySet()) {
                        if (entry.getValue() != null) {
                            entry.getValue().setVisibility(View.VISIBLE);
                        }
                    }
                    for (Map.Entry<String, AdView> entry : mAdViews.entrySet()) {
                        if (entry.getValue() != null) {
                            entry.getValue().resume();
                        }
                    }
                    Log.d(logTag, "Banner AD Resumed");
                    call.resolve();
                });
        } catch (Exception ex) {
            call.reject(ex.getLocalizedMessage(), ex);
        }
    }

    public void removeBanner(final PluginCall call) {
        try {
            activitySupplier
                .get()
                .runOnUiThread(() -> {
                    for (Map.Entry<String, RelativeLayout> entry : mAdViewLayouts.entrySet()) {
                        if (mViewGroup != null && entry.getValue() != null) {
                            mViewGroup.removeView(entry.getValue());
                        }
                    }
                    for (Map.Entry<String, AdView> entry : mAdViews.entrySet()) {
                        if (entry.getValue() != null) {
                            entry.getValue().destroy();
                        }
                    }
                    mAdViews.clear();
                    mAdViewLayouts.clear();
                    Log.d(logTag, "Banner ADs Removed");
                    final BannerAdSizeInfo sizeInfo = new BannerAdSizeInfo(0, 0);
                    notifyListeners(BannerAdPluginEvents.SizeChanged.getWebEventName(), sizeInfo);
                    call.resolve();
                });
        } catch (Exception ex) {
            call.reject(ex.getLocalizedMessage(), ex);
        }
    }

    private void updateExistingAdView(AdOptions adOptions, String posKey) {
        final AdView adView = mAdViews.get(posKey);
        if (adView == null) return;

        activitySupplier
            .get()
            .runOnUiThread(() -> {
                Log.d("AdMobBanner", "loadAd() called");
                final AdRequest adRequest = RequestHelper.createRequest(adOptions);
                adView.loadAd(adRequest);
            });
    }

    private void createNewAdView(AdOptions adOptions, String posKey, AdView adView, RelativeLayout adViewLayout) {
        activitySupplier
            .get()
            .runOnUiThread(() -> {
                if (mViewGroup == null) {
                    initialize();
                }

                Log.d("AdMobBanner", "AdView created");
                final AdRequest adRequest = RequestHelper.createRequest(adOptions);
                AdViewIdHelper.assignIdToAdView(adView, adOptions, adRequest, logTag, contextSupplier.get());
                adViewLayout.addView(adView);
                Log.d("AdMobBanner", "loadAd() called");
                adView.loadAd(adRequest);

                adView.setAdListener(
                    new AdListener() {
                        @Override
                        public void onAdLoaded() {
                            Log.d("AdMobBanner", "onAdLoaded");
                            activitySupplier.get().runOnUiThread(() -> {
                                adViewLayout.bringToFront();
                                if (mViewGroup != null) {
                                    mViewGroup.bringChildToFront(adViewLayout);
                                }
                            });
                            final BannerAdSizeInfo sizeInfo = new BannerAdSizeInfo(adView);
                            notifyListeners(BannerAdPluginEvents.SizeChanged.getWebEventName(), sizeInfo);
                            notifyListeners(BannerAdPluginEvents.Loaded.getWebEventName(), emptyObject);
                            super.onAdLoaded();
                        }

                        @Override
                        public void onAdFailedToLoad(@NonNull LoadAdError adError) {
                            Log.e("AdMobBanner", "onAdFailedToLoad: " + adError.getMessage() + " (code: " + adError.getCode() + ")");
                            activitySupplier.get().runOnUiThread(() -> {
                                if (mViewGroup != null) {
                                    mViewGroup.removeView(adViewLayout);
                                }
                                adViewLayout.removeView(adView);
                                adView.destroy();
                                mAdViews.remove(posKey);
                                mAdViewLayouts.remove(posKey);
                            });

                            final BannerAdSizeInfo sizeInfo = new BannerAdSizeInfo(0, 0);
                            notifyListeners(BannerAdPluginEvents.SizeChanged.getWebEventName(), sizeInfo);

                            final AdMobPluginError adMobPluginError = new AdMobPluginError(adError);
                            notifyListeners(BannerAdPluginEvents.FailedToLoad.getWebEventName(), adMobPluginError);

                            super.onAdFailedToLoad(adError);
                        }

                        @Override
                        public void onAdOpened() {
                            notifyListeners(BannerAdPluginEvents.Opened.getWebEventName(), emptyObject);
                            super.onAdOpened();
                        }

                        @Override
                        public void onAdClosed() {
                            notifyListeners(BannerAdPluginEvents.Closed.getWebEventName(), emptyObject);
                            super.onAdClosed();
                        }

                        @Override
                        public void onAdImpression() {
                            notifyListeners(BannerAdPluginEvents.AdImpression.getWebEventName(), emptyObject);
                            super.onAdImpression();
                        }
                    }
                );

                adView.setOnPaidEventListener((adValue) -> {
                    String networkName = "";
                    String impressionId = "";
                    if (adView.getResponseInfo() != null) {
                        networkName = adView.getResponseInfo().getMediationAdapterClassName();
                        if (networkName == null) networkName = "";
                        impressionId = adView.getResponseInfo().getResponseId();
                        if (impressionId == null) impressionId = "";
                    }
                    AdMobRevenueData revenueData = new AdMobRevenueData(adValue, adView.getAdUnitId(), networkName, impressionId);
                    notifyListeners(BannerAdPluginEvents.AdPaid.getWebEventName(), revenueData);
                });

                if (mViewGroup != null) {
                    if (adViewLayout.getParent() != null) {
                        ((ViewGroup) adViewLayout.getParent()).removeView(adViewLayout);
                    }
                    mViewGroup.addView(adViewLayout);
                    adViewLayout.bringToFront();
                    mViewGroup.bringChildToFront(adViewLayout);
                }
            });
    }
}
