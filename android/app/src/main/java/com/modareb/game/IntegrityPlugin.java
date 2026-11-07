package com.modareb.game;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Debug;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Detects well-known cheat / tamper tools installed on the device.
 * Only packages declared in the manifest <queries> block are visible (no QUERY_ALL_PACKAGES needed).
 * This is a deterrent, not bulletproof protection.
 */
@CapacitorPlugin(name = "Integrity")
public class IntegrityPlugin extends Plugin {

    static final String[] BLOCKED_PACKAGES = new String[] {
        "com.cih.game_cih",                    // GameCIH
        "com.cih.gamecih2",
        "com.cih.gamecih",
        "catch_.me_.if_.you_.can_",            // Game Guardian
        "com.mlsoft.gameguardian",
        "com.chelpus.lackypatch",              // Lucky Patcher
        "com.dimonvideo.luckypatcher",
        "com.android.vending.billing.InAppBillingService.COIN",
        "com.android.vending.billing.InAppBillingService.LUCK",
        "com.zune.gamekiller",                 // GameKiller
        "com.killerapp.gamekiller",
        "com.xmodgame",                        // X-Mod Games
        "com.xmodgames",
        "com.cheatengine.ceserver",
        "com.sbgames.speedhack"
    };

    @PluginMethod
    public void scan(PluginCall call) {
        JSObject res = new JSObject();
        JSArray found = new JSArray();
        try {
            PackageManager pm = getContext().getPackageManager();
            for (String pkg : BLOCKED_PACKAGES) {
                try {
                    pm.getPackageInfo(pkg, 0);
                    found.put(pkg);
                } catch (PackageManager.NameNotFoundException ignored) {
                } catch (Exception ignored) {
                }
            }
        } catch (Exception ignored) {
        }
        res.put("packages", found);

        res.put("debugger", false);
        res.put("suBinary", false);
        call.resolve(res);
    }
}
