package com.saintm254.mpesatracker;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * ExportPlugin — saves CSV reports using the Android Storage Access Framework
 * (ACTION_CREATE_DOCUMENT), which pops the device's default file manager so the
 * user picks exactly where the file is stored.
 *
 * On Android 10+ (API 29+) SAF requires no permission at all. On Android 9 and
 * below we runtime-request WRITE_EXTERNAL_STORAGE first.
 */
@CapacitorPlugin(
    name = "ExportPlugin",
    permissions = {
        @Permission(
            alias = "storage",
            strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }
        )
    }
)
public class ExportPlugin extends Plugin {

    private boolean wantsLegacyStoragePermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q;
    }

    @PluginMethod
    public void checkStorageAccess(PluginCall call) {
        boolean granted = !wantsLegacyStoragePermission() ||
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("requiresLegacyPermission", wantsLegacyStoragePermission());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestStorageAccess(PluginCall call) {
        if (!wantsLegacyStoragePermission()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("storage", call, "storagePermCallback");
    }

    @PermissionCallback
    private void storagePermCallback(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    /**
     * Pops the system file manager (Storage Access Framework) so the user can
     * choose the destination folder & filename, then writes the CSV contents.
     */
    @PluginMethod
    public void saveCsvToStorage(PluginCall call) {
        String contents = call.getString("contents");
        String fileName = call.getString("fileName");
        if (contents == null || fileName == null || fileName.trim().isEmpty()) {
            call.reject("Missing contents or fileName");
            return;
        }
        if (!fileName.toLowerCase().endsWith(".csv")) {
            fileName = fileName + ".csv";
        }

        try {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("text/csv");
            intent.putExtra(Intent.EXTRA_TITLE, fileName);
            startActivityForResult(call, intent, "csvSaveCallback");
        } catch (Exception e) {
            call.reject("Could not open the file manager: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void csvSaveCallback(PluginCall call, ActivityResult result) {
        JSObject ret = new JSObject();
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) {
            ret.put("saved", false);
            call.resolve(ret);
            return;
        }

        Uri uri = result.getData().getData();
        if (uri == null) {
            ret.put("saved", false);
            call.resolve(ret);
            return;
        }

        String contents = call.getString("contents", "");
        OutputStream out = null;
        try {
            out = getContext().getContentResolver().openOutputStream(uri, "wt");
            if (out == null) {
                call.reject("Could not open destination for writing");
                return;
            }
            out.write(contents.getBytes(StandardCharsets.UTF_8));
            out.flush();
            ret.put("saved", true);
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed writing CSV: " + e.getMessage());
        } finally {
            if (out != null) {
                try { out.close(); } catch (Exception ignored) {}
            }
        }
    }
}
