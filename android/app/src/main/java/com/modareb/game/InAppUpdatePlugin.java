package com.modareb.game;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Google Play in-app updates (immediate / full-screen flow).
 * Works only for builds installed from Google Play; on any other install the checks fail silently
 * and the JS side simply lets the player continue.
 */
@CapacitorPlugin(name = "InAppUpdate")
public class InAppUpdatePlugin extends Plugin {

    private AppUpdateManager manager() {
        return AppUpdateManagerFactory.create(getContext());
    }

    /** Resolves { available, allowed, inProgress, versionCode }. Never rejects: errors mean "no update". */
    @PluginMethod
    public void check(PluginCall call) {
        try {
            manager().getAppUpdateInfo().addOnSuccessListener(info -> {
                int availability = info.updateAvailability();
                JSObject res = new JSObject();
                res.put("available", availability == UpdateAvailability.UPDATE_AVAILABLE);
                res.put("inProgress", availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS);
                res.put("allowed", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
                res.put("versionCode", info.availableVersionCode());
                call.resolve(res);
            }).addOnFailureListener(e -> {
                JSObject res = new JSObject();
                res.put("available", false);
                res.put("inProgress", false);
                res.put("allowed", false);
                res.put("error", String.valueOf(e.getMessage()));
                call.resolve(res);
            });
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("available", false);
            res.put("error", String.valueOf(e.getMessage()));
            call.resolve(res);
        }
    }

    /** Starts (or resumes) the full-screen update. Resolves { result: "ok" | "cancelled" | "failed" }. */
    @PluginMethod
    public void startImmediate(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("no_activity");
            return;
        }
        try {
            final AppUpdateManager mgr = manager();
            mgr.getAppUpdateInfo().addOnSuccessListener(info -> {
                int availability = info.updateAvailability();
                boolean canRun = (availability == UpdateAvailability.UPDATE_AVAILABLE
                        || availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS)
                        && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE);
                if (!canRun) {
                    JSObject res = new JSObject();
                    res.put("result", "failed");
                    call.resolve(res);
                    return;
                }
                activity.runOnUiThread(() -> {
                    try {
                        mgr.startUpdateFlow(info, activity, AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build())
                            .addOnSuccessListener(code -> {
                                JSObject res = new JSObject();
                                res.put("result", code != null && code == Activity.RESULT_OK ? "ok" : "cancelled");
                                call.resolve(res);
                            })
                            .addOnFailureListener(e -> {
                                JSObject res = new JSObject();
                                res.put("result", "failed");
                                call.resolve(res);
                            });
                    } catch (Exception e) {
                        JSObject res = new JSObject();
                        res.put("result", "failed");
                        call.resolve(res);
                    }
                });
            }).addOnFailureListener(e -> {
                JSObject res = new JSObject();
                res.put("result", "failed");
                call.resolve(res);
            });
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("result", "failed");
            call.resolve(res);
        }
    }
}
