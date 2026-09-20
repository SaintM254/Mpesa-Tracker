package com.saintm254.mpesatracker;

import android.Manifest;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Telephony;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "SmsPlugin",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS
            }
        )
    }
)
public class SmsPlugin extends Plugin {

    private SmsBroadcastReceiver smsReceiver;
    private static SmsPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
        registerLiveReceiver();
    }

    private void registerLiveReceiver() {
        try {
            if (smsReceiver == null) {
                smsReceiver = new SmsBroadcastReceiver();
                IntentFilter filter = new IntentFilter("android.provider.Telephony.SMS_RECEIVED");
                filter.setPriority(999);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    getContext().registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED);
                } else {
                    getContext().registerReceiver(smsReceiver, filter);
                }
            }
        } catch (Exception e) {
            // Log ignored - privacy requirement: never write to logs
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (smsReceiver != null) {
            try {
                getContext().unregisterReceiver(smsReceiver);
            } catch (Exception ignored) {}
            smsReceiver = null;
        }
        if (instance == this) {
            instance = null;
        }
    }

    public static void onSmsReceived(String sender, String body, long timestamp) {
        if (instance != null && instance.isMpesaSender(sender)) {
            JSObject data = new JSObject();
            data.put("sender", sender);
            data.put("body", body);
            data.put("timestamp", timestamp);
            instance.notifyListeners("onNewMpesaSms", data);
        }
    }

    private boolean isMpesaSender(String sender) {
        if (sender == null) return false;
        String s = sender.trim().toUpperCase();
        return s.contains("MPESA") || s.contains("M-PESA");
    }

    @PluginMethod
    public void checkSmsPermissions(PluginCall call) {
        boolean hasRead = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
        boolean hasReceive = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        
        JSObject ret = new JSObject();
        ret.put("granted", hasRead && hasReceive);
        ret.put("hasReadSms", hasRead);
        ret.put("hasReceiveSms", hasReceive);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestSmsPermissions(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            requestPermissionForAlias("sms", call, "smsPermsCallback");
        }
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        boolean hasRead = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
        boolean hasReceive = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", hasRead && hasReceive);
        call.resolve(ret);
    }

    @PluginMethod
    public void readMpesaInbox(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("READ_SMS permission not granted");
            return;
        }

        int limit = call.getInt("limit", 500);
        int offset = call.getInt("offset", 0);
        JSArray results = new JSArray();

        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = Telephony.Sms.CONTENT_URI;
        String[] projection = new String[] {
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE
        };

        // Filter by sender containing MPESA or fetch and filter in memory
        String selection = null;
        String[] selectionArgs = null;
        String sortOrder = Telephony.Sms.DATE + " DESC LIMIT " + limit + " OFFSET " + offset;
        int rawCount = 0;

        Cursor cursor = null;
        try {
            cursor = resolver.query(uri, projection, selection, selectionArgs, sortOrder);
            if (cursor != null && cursor.moveToFirst()) {
                int addressIdx = cursor.getColumnIndex(Telephony.Sms.ADDRESS);
                int bodyIdx = cursor.getColumnIndex(Telephony.Sms.BODY);
                int dateIdx = cursor.getColumnIndex(Telephony.Sms.DATE);

                do {
                    rawCount++;
                    String sender = cursor.getString(addressIdx);
                    if (isMpesaSender(sender)) {
                        String body = cursor.getString(bodyIdx);
                        long date = cursor.getLong(dateIdx);

                        JSObject smsObj = new JSObject();
                        smsObj.put("sender", sender);
                        smsObj.put("body", body);
                        smsObj.put("timestamp", date);
                        results.put(smsObj);
                    }
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            call.reject("Error reading SMS: " + e.getMessage());
            return;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        JSObject res = new JSObject();
        res.put("messages", results);
        res.put("count", results.length());
        // True when the raw page was completely full → older SMS still exist
        res.put("hasMore", rawCount >= limit);
        call.resolve(res);
    }
}
