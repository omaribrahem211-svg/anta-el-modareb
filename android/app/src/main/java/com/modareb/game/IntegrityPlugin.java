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
        "com.gmd.hidex",
        "catch_.me_.if_.you_.can_",            // Game Guardian (alt id)
        "com.keramidas.TitaniumBackup",        // can edit app data
        "com.chelpus.lackypatch",              // Lucky Patcher
        "com.dimonvideo.luckypatcher",
        "com.android.vending.billing.InAppBillingService.COIN",
        "com.android.vending.billing.InAppBillingService.LUCK",
        "com.android.vending.billing.InAppBillingService.CLON",
        "com.blackmartalpha",
        "org.blackmart.market",
        "com.allinone.free",
        "com.repodroid.app",
        "org.creeplays.hack",
        "com.zune.gamekiller",                 // GameKiller
        "com.killerapp.gamekiller",
        "cn.mm.xxyy",
        "com.xmodgame",                        // X-Mod Games
        "com.xmodgames",
        "com.ramdroid.appquarantine",
        "com.topjohnwu.magisk",                // Magisk (root)
        "io.github.vvb2060.magisk",
        "me.weishu.kernelsu",                  // KernelSU
        "com.noshufou.android.su",
        "eu.chainfire.supersu",
        "com.koushikdutta.superuser",
        "com.thirdparty.superuser",
        "com.yellowes.su",
        "com.lbe.parallel.intl",               // Parallel Space (virtual space cloners)
        "com.lbe.parallel",
        "com.excelliance.dualaid",             // Dual Space
        "com.excelliance.multiaccount",
        "com.ludashi.dualspace",
        "com.lody.virtual",                    // VirtualApp
        "io.va.exposed",                       // VirtualXposed
        "de.robv.android.xposed.installer",    // Xposed
        "org.meowcat.edxposed.manager",
        "org.lsposed.manager",
        "com.saurik.substrate",
        "com.formyhm.hideroot",
        "com.devadvance.rootcloak",
        "com.devadvance.rootcloak2",
        "com.amphoras.hidemyroot",
        "com.speedsoftware.rootexplorer",
        "com.mlsoft.gameguardian",
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

        boolean debuggerAttached = false;
        try {
            // Release builds are never debuggable; a debugger attached to one is a tamper signal.
            boolean appDebuggable = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            debuggerAttached = !appDebuggable && Debug.isDebuggerConnected();
        } catch (Exception ignored) {
        }
        res.put("debugger", debuggerAttached);

        boolean suBinary = false;
        try {
            String[] paths = {"/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/sd/xbin/su", "/data/local/xbin/su", "/data/local/bin/su"};
            for (String p : paths) {
                if (new java.io.File(p).exists()) { suBinary = true; break; }
            }
        } catch (Exception ignored) {
        }
        res.put("suBinary", suBinary);
        call.resolve(res);
    }
}
