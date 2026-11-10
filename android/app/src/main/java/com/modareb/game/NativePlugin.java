package com.modareb.game;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * مسيرة نجم — خدمات أندرويد للعبة:
 * - حفظ المسيرة في SharedPreferences (كتابة فورية) جنب localStorage
 * - حفظ كارت اللاعب في الصور ومشاركته (فيسبوك وغيره)
 * - كشف برامج تهكير الألعاب المعروفة
 * - فحص التحديثات على Google Play وفتح شاشة التحديث
 */
@CapacitorPlugin(name = "Native")
public class NativePlugin extends Plugin {

    // لازم كل اسم هنا يبقى مكتوب كمان في AndroidManifest جوه <queries> (أندرويد 11+)
    private static final String[][] CHEATS = {
        {"catch_.me_.if_.you_.can_", "GameGuardian"},
        {"com.gameguardian.app", "GameGuardian"},
        {"com.chelpus.lackypatch", "Lucky Patcher"},
        {"com.dimonvideo.luckypatcher", "Lucky Patcher"},
        {"com.forpda.lp", "Lucky Patcher"},
        {"com.chelpus.luckypatcher", "Lucky Patcher"},
        {"com.android.vending.billing.InAppBillingService.LUCK", "Lucky Patcher"},
        {"com.android.vending.billing.InAppBillingService.CLON", "Lucky Patcher"},
        {"com.android.vending.billing.InAppBillingService.COIN", "Lucky Patcher"},
        {"com.android.vending.billing.InAppBillingService.LOCK", "Lucky Patcher"},
        {"com.android.vending.billing.InAppBillingService.CRAC", "Lucky Patcher"},
        {"org.sbtools.gamehack", "SB Game Hacker"},
        {"com.cih.game_cih", "GameCIH"},
        {"com.cih.gamecih2", "GameCIH"},
        {"cn.mc.sq", "Game Killer"},
        {"com.zune.gamekiller", "Game Killer"},
        {"com.xmodgame", "Xmodgames"},
        {"cc.madkite.freedom", "Freedom"},
        {"cc.cz.madkite.freedom", "Freedom"},
        {"madkite.freedom", "Freedom"},
        {"com.allinone.free", "Freedom"},
        {"com.github.ggmodder", "GG Modder"},
        {"com.hacker.cheat.engine", "Cheat Engine"},
        {"org.cheatengine.cegui", "Cheat Engine"},
        {"com.happymod.apk", "HappyMod"},
        {"de.robv.android.xposed.installer", "Xposed"},
        {"org.lsposed.manager", "LSPosed"},
        {"org.meowcat.edxposed.manager", "EdXposed"},
        {"com.saurik.substrate", "Substrate"}
    };

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences("anta_save", Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void saveSet(PluginCall call) {
        String k = call.getString("k", "save");
        String v = call.getString("v", "");
        boolean ok = prefs().edit().putString(k, v).commit();
        JSObject r = new JSObject();
        r.put("ok", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void saveGet(PluginCall call) {
        String k = call.getString("k", "save");
        String v = prefs().getString(k, "");
        JSObject r = new JSObject();
        r.put("v", v);
        call.resolve(r);
    }

    private boolean installed(PackageManager pm, String pkg) {
        try {
            pm.getPackageInfo(pkg, 0);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        JSArray bad = new JSArray();
        try {
            Context ctx = getContext();
            PackageManager pm = ctx.getPackageManager();
            java.util.HashSet<String> seen = new java.util.HashSet<>();
            for (String[] c : CHEATS) {
                if (!seen.contains(c[1]) && installed(pm, c[0])) {
                    seen.add(c[1]);
                    bad.put(c[1]);
                }
            }
            String installer = null;
            try {
                if (Build.VERSION.SDK_INT >= 30) installer = pm.getInstallSourceInfo(ctx.getPackageName()).getInstallingPackageName();
                else installer = pm.getInstallerPackageName(ctx.getPackageName());
            } catch (Exception ignored) {}
            r.put("installer", installer == null ? "" : installer);
            r.put("debuggable", (ctx.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        } catch (Exception ignored) {}
        r.put("bad", bad);
        call.resolve(r);
    }

    private File writeCache(String b64) throws Exception {
        byte[] png = Base64.decode(b64, Base64.DEFAULT);
        File dir = new File(getContext().getCacheDir(), "share");
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("no dir");
        File f = new File(dir, "anta-coach-card.png");
        FileOutputStream o = new FileOutputStream(f);
        try {
            o.write(png);
        } finally {
            o.close();
        }
        return f;
    }

    @PluginMethod
    public void shareImage(PluginCall call) {
        try {
            File f = writeCache(call.getString("b64", ""));
            Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("image/png");
            i.putExtra(Intent.EXTRA_STREAM, u);
            String text = call.getString("text", "");
            if (text != null && text.length() > 0) i.putExtra(Intent.EXTRA_TEXT, text);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent ch = Intent.createChooser(i, "شارك الكارت");
            ch.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(ch);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void saveImage(PluginCall call) {
        JSObject r = new JSObject();
        if (Build.VERSION.SDK_INT < 29) {
            r.put("saved", false);
            call.resolve(r);
            return;
        }
        try {
            byte[] png = Base64.decode(call.getString("b64", ""), Base64.DEFAULT);
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, "anta-coach-card-" + System.currentTimeMillis() + ".png");
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MasiretNagm");
            Uri u = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (u == null) throw new Exception("insert failed");
            OutputStream o = getContext().getContentResolver().openOutputStream(u);
            if (o == null) throw new Exception("no stream");
            try {
                o.write(png);
            } finally {
                o.close();
            }
            r.put("saved", true);
            call.resolve(r);
        } catch (Exception e) {
            r.put("saved", false);
            r.put("err", String.valueOf(e.getMessage()));
            call.resolve(r);
        }
    }

    @PluginMethod
    public void checkUpdate(PluginCall call) {
        try {
            AppUpdateManager m = AppUpdateManagerFactory.create(getContext());
            m.getAppUpdateInfo()
                .addOnSuccessListener(info -> {
                    JSObject r = new JSObject();
                    r.put("available", info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE);
                    r.put("code", info.availableVersionCode());
                    r.put("immediate", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
                    call.resolve(r);
                })
                .addOnFailureListener(e -> {
                    JSObject r = new JSObject();
                    r.put("available", false);
                    r.put("err", String.valueOf(e.getMessage()));
                    call.resolve(r);
                });
        } catch (Exception e) {
            JSObject r = new JSObject();
            r.put("available", false);
            call.resolve(r);
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) { call.reject("bad url"); return; }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("no app", e);
        }
    }

    @PluginMethod
    public void startUpdate(PluginCall call) {
        try {
            AppUpdateManager m = AppUpdateManagerFactory.create(getContext());
            m.getAppUpdateInfo()
                .addOnSuccessListener(info -> {
                    try {
                        if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                            m.startUpdateFlowForResult(info, getActivity(), AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(), 7101);
                        } else {
                            openStore();
                        }
                    } catch (Exception ex) {
                        openStore();
                    }
                    call.resolve();
                })
                .addOnFailureListener(e -> {
                    openStore();
                    call.resolve();
                });
        } catch (Exception e) {
            openStore();
            call.resolve();
        }
    }

    private void openStore() {
        String p = getContext().getPackageName();
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + p));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + p));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            } catch (Exception ignored) {}
        }
    }
}
