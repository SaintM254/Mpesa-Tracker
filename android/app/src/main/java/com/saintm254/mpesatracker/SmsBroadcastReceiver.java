package com.saintm254.mpesatracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

public class SmsBroadcastReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
            if (messages != null && messages.length > 0) {
                StringBuilder fullBody = new StringBuilder();
                String sender = null;
                long timestamp = System.currentTimeMillis();

                for (SmsMessage msg : messages) {
                    if (msg != null) {
                        if (sender == null) {
                            sender = msg.getDisplayOriginatingAddress();
                            if (sender == null) {
                                sender = msg.getOriginatingAddress();
                            }
                            timestamp = msg.getTimestampMillis();
                        }
                        String bodyPart = msg.getDisplayMessageBody();
                        if (bodyPart == null) {
                            bodyPart = msg.getMessageBody();
                        }
                        if (bodyPart != null) {
                            fullBody.append(bodyPart);
                        }
                    }
                }

                if (sender != null && fullBody.length() > 0) {
                    SmsPlugin.onSmsReceived(sender, fullBody.toString(), timestamp);
                }
            }
        }
    }
}
