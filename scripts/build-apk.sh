#!/usr/bin/env bash
set -e

echo "=== Building Enhanced Hybrid-Native Signed Android APK (hamhesab.apk v5.0) ==="

DIST_DIR="$(pwd)/dist"
WORK_DIR="$(pwd)/.apk-build"
rm -rf "$WORK_DIR"
mkdir -p \
  "$WORK_DIR/res/mipmap-xxxhdpi" \
  "$WORK_DIR/res/values" \
  "$WORK_DIR/res/values-night" \
  "$WORK_DIR/res/drawable" \
  "$WORK_DIR/res/layout" \
  "$WORK_DIR/res/xml" \
  "$WORK_DIR/src/ir/hamhesab/app" \
  "$WORK_DIR/classes" \
  "$WORK_DIR/dex" \
  "$WORK_DIR/assets/www"

# Locate Android SDK tools on GitHub Actions ubuntu-latest
SDK_ROOT="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
if [ -z "$SDK_ROOT" ] || [ ! -d "$SDK_ROOT" ]; then
  SDK_ROOT="/usr/local/lib/android/sdk"
fi

BUILD_TOOLS=$(ls -d "$SDK_ROOT/build-tools/"* | sort -V | tail -n 1)
PLATFORM=$(ls -d "$SDK_ROOT/platforms/android-"* | sort -V | tail -n 1)
ANDROID_JAR="$PLATFORM/android.jar"

echo "Using Build Tools: $BUILD_TOOLS"
echo "Using Platform: $ANDROID_JAR"

# Copy built web app into APK assets/www for instant offline-first startup
cp -r "$DIST_DIR/"* "$WORK_DIR/assets/www/" 2>/dev/null || true

# Copy 512x512 PNG icon as launcher icon
cp "$(pwd)/public/pwa-512x512.png" "$WORK_DIR/res/mipmap-xxxhdpi/ic_launcher.png"

# Create strings.xml and DayNight styles.xml so WebView follows phone Light/Dark mode accurately
cat > "$WORK_DIR/res/values/strings.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">هم‌حساب</string>
    <string name="widget_description">نمایش سریع موجودی و ثبت فوری خرج در هم‌حساب</string>
</resources>
EOF

cat > "$WORK_DIR/res/values/styles.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.DeviceDefault.Light.NoActionBar" />
</resources>
EOF

cat > "$WORK_DIR/res/values-night/styles.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.DeviceDefault.NoActionBar" />
</resources>
EOF

# Widget Drawables
cat > "$WORK_DIR/res/drawable/widget_bg.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#EE0F172A" />
    <corners android:radius="22dp" />
    <stroke android:width="1dp" android:color="#33FFFFFF" />
</shape>
EOF

cat > "$WORK_DIR/res/drawable/widget_btn_primary.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#10B981" />
    <corners android:radius="14dp" />
</shape>
EOF

cat > "$WORK_DIR/res/drawable/widget_btn_secondary.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#26FFFFFF" />
    <corners android:radius="14dp" />
    <stroke android:width="1dp" android:color="#33FFFFFF" />
</shape>
EOF

# Home Screen Widget Layout (RTL Persian)
cat > "$WORK_DIR/res/layout/widget_hamhesab.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="14dp"
    android:background="@drawable/widget_bg"
    android:layoutDirection="rtl">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_title"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="هم‌حساب"
            android:textColor="#10B981"
            android:textSize="13sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_user"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="حساب شخصی"
            android:textColor="#94A3B8"
            android:textSize="11sp" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_balance"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="برای مشاهده موجودی لمس کنید"
        android:textColor="#FFFFFF"
        android:textSize="17sp"
        android:textStyle="bold"
        android:singleLine="true"
        android:ellipsize="end" />

    <TextView
        android:id="@+id/widget_subtitle"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:text="خرج امروز: ۰ | این ماه: ۰"
        android:textColor="#CBD5E1"
        android:textSize="11sp"
        android:singleLine="true"
        android:ellipsize="end" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="10dp"
        android:orientation="horizontal">

        <TextView
            android:id="@+id/widget_btn_add_tx"
            android:layout_width="0dp"
            android:layout_height="34dp"
            android:layout_weight="1"
            android:layout_marginEnd="8dp"
            android:background="@drawable/widget_btn_primary"
            android:gravity="center"
            android:text="+ ثبت خرج"
            android:textColor="#FFFFFF"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_btn_sms"
            android:layout_width="0dp"
            android:layout_height="34dp"
            android:layout_weight="1"
            android:background="@drawable/widget_btn_secondary"
            android:gravity="center"
            android:text="پیامک بانکی"
            android:textColor="#F8FAFC"
            android:textSize="12sp"
            android:textStyle="bold" />
    </LinearLayout>
</LinearLayout>
EOF

# Widget Provider Metadata
cat > "$WORK_DIR/res/xml/hamhesab_widget_info.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_hamhesab"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
EOF

# Create AndroidManifest.xml
cat > "$WORK_DIR/AndroidManifest.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="ir.hamhesab.app"
    android:versionCode="6"
    android:versionName="5.0">

    <uses-sdk android:minSdkVersion="23" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout|uiMode"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Static Background Bank SMS Receiver (works even when app is closed) -->
        <receiver
            android:name=".BankSmsReceiver"
            android:exported="true">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

        <!-- Home Screen Widget -->
        <receiver
            android:name=".HamHesabWidgetProvider"
            android:exported="true"
            android:label="ویجت هم‌حساب">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/hamhesab_widget_info" />
        </receiver>
    </application>
</manifest>
EOF

# Create BankSmsReceiver.java (Background Bank SMS listener + Rich Persian Notification)
cat > "$WORK_DIR/src/ir/hamhesab/app/BankSmsReceiver.java" << 'EOF'
package ir.hamhesab.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import org.json.JSONArray;
import org.json.JSONObject;

public class BankSmsReceiver extends BroadcastReceiver {
    public static final String PREFS_NAME = "hamhesab_native_prefs";
    public static final String KEY_PENDING_SMS = "pending_bank_sms_queue";
    public static final String CHANNEL_ID = "hamhesab_bank_sms_channel";
    public static final String EXTRA_PENDING_SMS_JSON = "extra_pending_sms_json";

    public static boolean isLikelyIranianBankSms(String body) {
        if (body == null || body.trim().length() < 8) return false;
        return body.contains("برداشت") ||
            body.contains("واریز") ||
            body.contains("واريز") ||
            body.contains("خرید") ||
            body.contains("خريد") ||
            body.contains("مانده") ||
            body.contains("موجودی") ||
            body.contains("موجودي") ||
            body.contains("حساب") ||
            body.contains("ریال") ||
            body.contains("ريال") ||
            body.contains("تومان") ||
            body.contains("بلو");
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }
        try {
            Bundle bundle = intent.getExtras();
            if (bundle == null) return;
            Object[] pdus = (Object[]) bundle.get("pdus");
            String format = bundle.getString("format");
            if (pdus == null || pdus.length == 0) return;

            StringBuilder fullBody = new StringBuilder();
            String sender = "";
            for (Object pdu : pdus) {
                SmsMessage msg = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? SmsMessage.createFromPdu((byte[]) pdu, format)
                    : SmsMessage.createFromPdu((byte[]) pdu);
                if (msg != null) {
                    if (msg.getOriginatingAddress() != null) {
                        sender = msg.getOriginatingAddress();
                    }
                    if (msg.getMessageBody() != null) {
                        fullBody.append(msg.getMessageBody());
                    }
                }
            }

            String bodyStr = fullBody.toString().trim();
            if (!isLikelyIranianBankSms(bodyStr)) {
                return;
            }

            long now = System.currentTimeMillis();
            JSONObject obj = new JSONObject();
            obj.put("id", String.valueOf(now));
            obj.put("address", sender != null ? sender : "");
            obj.put("body", bodyStr);
            obj.put("date", now);
            String payload = obj.toString();

            // If MainActivity is currently open in foreground, deliver directly to WebView
            if (MainActivity.deliverLiveSmsIfForeground(payload)) {
                return;
            }

            // Otherwise queue in SharedPreferences so it's never lost, and post a quick-action Notification
            enqueuePendingSms(context, obj);
            showBankSmsNotification(context, bodyStr, payload, (int) (now % 100000));
        } catch (Exception ignored) {
        }
    }

    private void enqueuePendingSms(Context context, JSONObject smsObj) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existingRaw = prefs.getString(KEY_PENDING_SMS, "[]");
            JSONArray arr = new JSONArray(existingRaw);
            JSONArray next = new JSONArray();
            next.put(smsObj);
            int max = Math.min(arr.length(), 19);
            for (int i = 0; i < max; i++) {
                next.put(arr.get(i));
            }
            prefs.edit().putString(KEY_PENDING_SMS, next.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    private void showBankSmsNotification(Context context, String bodyStr, String payloadJson, int notifId) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "پیامک‌های بانکی هم‌حساب",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("اطلاع‌رسانی فوری برای ثبت تراکنش‌های بانکی دریافتی");
                nm.createNotificationChannel(channel);
            }

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openIntent.putExtra(EXTRA_PENDING_SMS_JSON, payloadJson);

            int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                piFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, notifId, openIntent, piFlags);

            boolean isIncome = bodyStr.contains("واریز") || bodyStr.contains("واريز");
            String title = isIncome
                ? "واریز بانکی جدید شناسایی شد"
                : "برداشت / خرید بانکی جدید شناسایی شد";
            String preview = bodyStr.replace("\n", " ");
            if (preview.length() > 140) {
                preview = preview.substring(0, 140) + "...";
            }

            Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);

            builder.setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(preview)
                .setStyle(new Notification.BigTextStyle().bigText(bodyStr))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .addAction(0, "ثبت در هم‌حساب", pendingIntent);

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                builder.setPriority(Notification.PRIORITY_HIGH);
            }

            nm.notify(notifId, builder.build());
        } catch (Exception ignored) {
        }
    }
}
EOF

# Create HamHesabWidgetProvider.java (Home Screen Widget)
cat > "$WORK_DIR/src/ir/hamhesab/app/HamHesabWidgetProvider.java" << 'EOF'
package ir.hamhesab.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

public class HamHesabWidgetProvider extends AppWidgetProvider {
    public static final String KEY_WIDGET_USER = "widget_user_name";
    public static final String KEY_WIDGET_BALANCE = "widget_balance_text";
    public static final String KEY_WIDGET_SUBTITLE = "widget_subtitle_text";
    public static final String EXTRA_QUICK_ACTION = "extra_quick_action";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateSingleWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, HamHesabWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(thisWidget);
            if (ids != null && ids.length > 0) {
                for (int id : ids) {
                    updateSingleWidget(context, manager, id);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private static PendingIntent buildActionIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (action != null && !action.isEmpty()) {
            intent.putExtra(EXTRA_QUICK_ACTION, action);
        }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    private static void updateSingleWidget(Context context, AppWidgetManager manager, int widgetId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(BankSmsReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            String userName = prefs.getString(KEY_WIDGET_USER, "حساب شخصی");
            String balanceText = prefs.getString(KEY_WIDGET_BALANCE, "برای مشاهده موجودی لمس کنید");
            String subtitleText = prefs.getString(KEY_WIDGET_SUBTITLE, "ثبت سریع دخل و خرج با یک لمس");

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_hamhesab);
            views.setTextViewText(R.id.widget_user, "حساب " + userName);
            views.setTextViewText(R.id.widget_balance, balanceText);
            views.setTextViewText(R.id.widget_subtitle, subtitleText);

            views.setOnClickPendingIntent(R.id.widget_root, buildActionIntent(context, "", 200));
            views.setOnClickPendingIntent(R.id.widget_btn_add_tx, buildActionIntent(context, "add_tx", 201));
            views.setOnClickPendingIntent(R.id.widget_btn_sms, buildActionIntent(context, "bank_sms", 202));

            manager.updateAppWidget(widgetId, views);
        } catch (Exception ignored) {
        }
    }
}
EOF

# Create MainActivity.java (Offline-First Asset Interceptor + Background OTA Cache + Native Biometric + Haptics + Smart Back)
cat > "$WORK_DIR/src/ir/hamhesab/app/MainActivity.java" << 'EOF'
package ir.hamhesab.app;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.database.Cursor;
import android.graphics.Color;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executor;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String LIVE_HOST = "baraary.github.io";
    private static final String LIVE_BASE_PATH = "/hhsb/";
    private static final String LIVE_URL = "https://baraary.github.io/hhsb/";
    private static final String LOCAL_FALLBACK = "file:///android_asset/www/index.html";
    private static final String APK_BUILD_VERSION = "5.0";
    private static final int SMS_PERMISSION_REQ_CODE = 101;
    private static final int NOTIF_PERMISSION_REQ_CODE = 102;

    private static volatile MainActivity activeInstance = null;
    private static volatile boolean isForeground = false;

    private WebView webView;
    private String pendingQuickAction = "";
    private String pendingSingleSmsJson = "";
    private long lastBackPressAt = 0L;

    public static boolean deliverLiveSmsIfForeground(final String smsJson) {
        final MainActivity act = activeInstance;
        if (act != null && isForeground && act.webView != null) {
            act.webView.post(new Runnable() {
                @Override
                public void run() {
                    act.webView.evaluateJavascript(
                        "if(window.onNativeBankSmsReceived){window.onNativeBankSmsReceived(" + JSONObject.quote(smsJson) + ");}",
                        null
                    );
                }
            });
            return true;
        }
        return false;
    }

    private void sendBiometricResultToJs(final boolean success, final String errorMsg) {
        if (webView != null) {
            webView.post(new Runnable() {
                @Override
                public void run() {
                    String safeErr = errorMsg != null ? JSONObject.quote(errorMsg) : "\"\"";
                    webView.evaluateJavascript(
                        "if(window.onNativeBiometricResult){window.onNativeBiometricResult(" + (success ? "true" : "false") + "," + safeErr + ");}",
                        null
                    );
                }
            });
        }
    }

    private boolean detectNightMode(Configuration config) {
        int nightModeFlags = config.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightModeFlags == Configuration.UI_MODE_NIGHT_YES;
    }

    private void notifyJsSystemTheme(final boolean isDark) {
        if (webView != null) {
            webView.post(new Runnable() {
                @Override
                public void run() {
                    webView.evaluateJavascript(
                        "if(window.onNativeSystemThemeChanged){window.onNativeSystemThemeChanged(" + (isDark ? "true" : "false") + ");}",
                        null
                    );
                }
            });
        }
    }

    private void dispatchIntentExtrasToJs(Intent intent) {
        if (intent == null) return;
        String smsJson = intent.getStringExtra(BankSmsReceiver.EXTRA_PENDING_SMS_JSON);
        if (smsJson != null && !smsJson.isEmpty()) {
            pendingSingleSmsJson = smsJson;
            intent.removeExtra(BankSmsReceiver.EXTRA_PENDING_SMS_JSON);
            if (webView != null) {
                final String payload = smsJson;
                webView.post(new Runnable() {
                    @Override
                    public void run() {
                        webView.evaluateJavascript(
                            "if(window.onNativeBankSmsReceived){window.onNativeBankSmsReceived(" + JSONObject.quote(payload) + ");}",
                            null
                        );
                    }
                });
            }
        }

        String quickAction = intent.getStringExtra(HamHesabWidgetProvider.EXTRA_QUICK_ACTION);
        if (quickAction != null && !quickAction.isEmpty()) {
            pendingQuickAction = quickAction;
            intent.removeExtra(HamHesabWidgetProvider.EXTRA_QUICK_ACTION);
            if (webView != null) {
                final String actStr = quickAction;
                webView.post(new Runnable() {
                    @Override
                    public void run() {
                        webView.evaluateJavascript(
                            "if(window.onNativeQuickAction){window.onNativeQuickAction(" + JSONObject.quote(actStr) + ");}",
                            null
                        );
                    }
                });
            }
        }
    }

    private String guessMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    private boolean isTextMime(String mime) {
        return mime.startsWith("text/") ||
            mime.equals("application/javascript") ||
            mime.equals("application/json") ||
            mime.equals("image/svg+xml");
    }

    private File getActiveCacheDir() {
        return new File(getFilesDir(), "web_cache_active");
    }

    private boolean isOtaCacheValidForCurrentApk() {
        try {
            File dir = getActiveCacheDir();
            File ready = new File(dir, "ready.flag");
            File verFile = new File(dir, "apk_version.txt");
            if (!ready.exists() || !verFile.exists()) return false;
            String ver = new String(readAllBytes(new FileInputStream(verFile)), "UTF-8").trim();
            return APK_BUILD_VERSION.equals(ver);
        } catch (Exception e) {
            return false;
        }
    }

    private WebResourceResponse tryServeLocalAsset(String relPath) {
        if (relPath == null || relPath.contains("..") || relPath.endsWith(".apk") || relPath.startsWith("data/")) {
            return null;
        }
        String normalized = relPath.trim();
        if (normalized.isEmpty() || normalized.endsWith("/")) {
            normalized = "index.html";
        }
        String mime = guessMimeType(normalized);
        String encoding = isTextMime(mime) ? "UTF-8" : null;
        Map<String, String> headers = new HashMap<String, String>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Cache-Control", "no-cache");

        // 1. Prefer verified OTA cache (if newer than APK and matching APK build version)
        try {
            if (isOtaCacheValidForCurrentApk()) {
                File cached = new File(getActiveCacheDir(), normalized);
                if (cached.exists() && cached.isFile()) {
                    return new WebResourceResponse(mime, encoding, 200, "OK", headers, new FileInputStream(cached));
                }
            }
        } catch (Exception ignored) {
        }

        // 2. Fallback to instant bundled APK assets/www/
        try {
            InputStream assetStream = getAssets().open("www/" + normalized);
            return new WebResourceResponse(mime, encoding, 200, "OK", headers, assetStream);
        } catch (Exception ignored) {
        }

        return null;
    }

    private byte[] readAllBytes(InputStream is) throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[8192];
        int nRead;
        try {
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
        } finally {
            try { is.close(); } catch (Exception ignored) {}
        }
        return buffer.toByteArray();
    }

    private byte[] fetchUrlBytes(String urlStr) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setConnectTimeout(7000);
        conn.setReadTimeout(12000);
        conn.setUseCaches(false);
        conn.setRequestProperty("Cache-Control", "no-cache");
        int code = conn.getResponseCode();
        if (code != 200) {
            conn.disconnect();
            return null;
        }
        byte[] bytes = readAllBytes(conn.getInputStream());
        conn.disconnect();
        return bytes;
    }

    private void deleteRecursive(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File c : children) {
                    deleteRecursive(c);
                }
            }
        }
        file.delete();
    }

    private void startBackgroundOtaSync() {
        Thread t = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Thread.sleep(2500);
                    byte[] remoteHtmlBytes = fetchUrlBytes(LIVE_URL + "index.html?t=" + System.currentTimeMillis());
                    if (remoteHtmlBytes == null || remoteHtmlBytes.length < 150) return;
                    String remoteHtml = new String(remoteHtmlBytes, "UTF-8");
                    if (!remoteHtml.contains("id=\"root\"")) return;

                    // Compare with currently active index.html
                    String currentHtml = "";
                    try {
                        if (isOtaCacheValidForCurrentApk()) {
                            File f = new File(getActiveCacheDir(), "index.html");
                            if (f.exists()) currentHtml = new String(readAllBytes(new FileInputStream(f)), "UTF-8");
                        } else {
                            currentHtml = new String(readAllBytes(getAssets().open("www/index.html")), "UTF-8");
                        }
                    } catch (Exception ignored) {
                    }
                    if (remoteHtml.equals(currentHtml)) {
                        return; // Already up to date
                    }

                    // Extract referenced ./assets/... files
                    Set<String> assetPaths = new HashSet<String>();
                    Pattern p = Pattern.compile("(?:src|href)=[\"']\\./(assets/[^\"']+)[\"']");
                    Matcher m = p.matcher(remoteHtml);
                    while (m.find()) {
                        assetPaths.add(m.group(1));
                    }
                    if (assetPaths.isEmpty()) return;

                    File staging = new File(getFilesDir(), "web_cache_staging");
                    deleteRecursive(staging);
                    staging.mkdirs();

                    // Download all referenced assets
                    for (String rel : assetPaths) {
                        byte[] assetData = fetchUrlBytes(LIVE_URL + rel);
                        if (assetData == null || assetData.length == 0) {
                            deleteRecursive(staging);
                            return;
                        }
                        File target = new File(staging, rel);
                        File parent = target.getParentFile();
                        if (parent != null && !parent.exists()) parent.mkdirs();
                        FileOutputStream fos = new FileOutputStream(target);
                        fos.write(assetData);
                        fos.close();
                    }

                    // Write index.html, apk_version.txt, and ready.flag
                    FileOutputStream htmlOut = new FileOutputStream(new File(staging, "index.html"));
                    htmlOut.write(remoteHtmlBytes);
                    htmlOut.close();

                    FileOutputStream verOut = new FileOutputStream(new File(staging, "apk_version.txt"));
                    verOut.write(APK_BUILD_VERSION.getBytes("UTF-8"));
                    verOut.close();

                    FileOutputStream readyOut = new FileOutputStream(new File(staging, "ready.flag"));
                    readyOut.write("ok".getBytes("UTF-8"));
                    readyOut.close();

                    // Swap staging -> active
                    File active = getActiveCacheDir();
                    deleteRecursive(active);
                    staging.renameTo(active);
                } catch (Exception ignored) {
                }
            }
        });
        t.setPriority(Thread.MIN_PRIORITY);
        t.start();
    }

    public class SmsJsBridge {
        @JavascriptInterface
        public String getNativeAppVersion() {
            return APK_BUILD_VERSION;
        }

        @JavascriptInterface
        public boolean hasSmsPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                return checkSelfPermission("android.permission.READ_SMS") == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestSmsPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Build.VERSION.SDK_INT >= 33) {
                    requestPermissions(
                        new String[]{
                            "android.permission.READ_SMS",
                            "android.permission.RECEIVE_SMS",
                            "android.permission.POST_NOTIFICATIONS"
                        },
                        SMS_PERMISSION_REQ_CODE
                    );
                } else {
                    requestPermissions(
                        new String[]{"android.permission.READ_SMS", "android.permission.RECEIVE_SMS"},
                        SMS_PERMISSION_REQ_CODE
                    );
                }
            }
        }

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                return checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                requestPermissions(
                    new String[]{"android.permission.POST_NOTIFICATIONS"},
                    NOTIF_PERMISSION_REQ_CODE
                );
            }
        }

        @JavascriptInterface
        public String consumePendingBankSms() {
            JSONArray out = new JSONArray();
            Set<String> seenIds = new HashSet<String>();
            try {
                if (pendingSingleSmsJson != null && !pendingSingleSmsJson.isEmpty()) {
                    JSONObject single = new JSONObject(pendingSingleSmsJson);
                    String sid = single.optString("id", "");
                    if (!sid.isEmpty()) seenIds.add(sid);
                    out.put(single);
                    pendingSingleSmsJson = "";
                }
                SharedPreferences prefs = getSharedPreferences(BankSmsReceiver.PREFS_NAME, Context.MODE_PRIVATE);
                String raw = prefs.getString(BankSmsReceiver.KEY_PENDING_SMS, "[]");
                JSONArray queued = new JSONArray(raw);
                for (int i = 0; i < queued.length(); i++) {
                    JSONObject item = queued.optJSONObject(i);
                    if (item != null) {
                        String qid = item.optString("id", "");
                        if (qid.isEmpty() || !seenIds.contains(qid)) {
                            if (!qid.isEmpty()) seenIds.add(qid);
                            out.put(item);
                        }
                    }
                }
                prefs.edit().putString(BankSmsReceiver.KEY_PENDING_SMS, "[]").apply();
            } catch (Exception ignored) {
            }
            return out.toString();
        }

        @JavascriptInterface
        public String consumePendingQuickAction() {
            String act = pendingQuickAction != null ? pendingQuickAction : "";
            pendingQuickAction = "";
            return act;
        }

        @JavascriptInterface
        public void updateWidgetData(
            final String userName,
            final String totalBalanceText,
            final String todayExpenseText,
            final String monthExpenseText,
            final boolean privacyMode
        ) {
            try {
                SharedPreferences prefs = getSharedPreferences(BankSmsReceiver.PREFS_NAME, Context.MODE_PRIVATE);
                String safeBalance = privacyMode ? "موجودی مخفی است (حالت حریم خصوصی)" : totalBalanceText;
                String safeSubtitle = privacyMode
                    ? "برای ثبت یا مشاهده لمس کنید"
                    : "امروز: " + todayExpenseText + "  |  این ماه: " + monthExpenseText;
                prefs.edit()
                    .putString(HamHesabWidgetProvider.KEY_WIDGET_USER, userName != null ? userName : "کاربر")
                    .putString(HamHesabWidgetProvider.KEY_WIDGET_BALANCE, safeBalance)
                    .putString(HamHesabWidgetProvider.KEY_WIDGET_SUBTITLE, safeSubtitle)
                    .apply();
                HamHesabWidgetProvider.updateAllWidgets(MainActivity.this);
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void vibrateHaptic(final int style) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (style == 2) {
                        v.vibrate(VibrationEffect.createWaveform(new long[]{0, 35, 45, 40}, -1));
                    } else if (style == 1) {
                        v.vibrate(VibrationEffect.createOneShot(26, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(VibrationEffect.createOneShot(12, 80));
                    }
                } else {
                    v.vibrate(style == 2 ? 60 : (style == 1 ? 25 : 12));
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void clearWebCacheAndReload() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        deleteRecursive(getActiveCacheDir());
                        if (webView != null) {
                            webView.clearCache(true);
                            webView.loadUrl(LIVE_URL + "?refresh=" + System.currentTimeMillis());
                        }
                        startBackgroundOtaSync();
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public boolean isBiometricSupported() {
            if (Build.VERSION.SDK_INT < 28) return false;
            try {
                if (Build.VERSION.SDK_INT >= 30) {
                    BiometricManager bm = (BiometricManager) getSystemService(Context.BIOMETRIC_SERVICE);
                    if (bm != null) {
                        int res = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK);
                        return res == BiometricManager.BIOMETRIC_SUCCESS;
                    }
                }
            } catch (Exception ignored) {
            }
            return true;
        }

        @JavascriptInterface
        public boolean isSystemDarkMode() {
            return detectNightMode(getResources().getConfiguration());
        }

        @JavascriptInterface
        public void setSystemBarsColor(final String hexColor, final boolean darkIcons) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        int parsedColor = Color.parseColor(hexColor != null && !hexColor.isEmpty() ? hexColor : "#020617");
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            Window window = getWindow();
                            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
                            window.setStatusBarColor(parsedColor);
                            window.setNavigationBarColor(parsedColor);
                            if (Build.VERSION.SDK_INT >= 28) {
                                window.setNavigationBarDividerColor(parsedColor);
                            }
                            View decorView = window.getDecorView();
                            if (decorView != null) {
                                int flags = decorView.getSystemUiVisibility();
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    if (darkIcons) {
                                        flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                                    } else {
                                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                                    }
                                }
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    if (darkIcons) {
                                        flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                                    } else {
                                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                                    }
                                }
                                decorView.setSystemUiVisibility(flags);
                            }
                        }
                        if (webView != null) {
                            webView.setBackgroundColor(parsedColor);
                        }
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public void authenticateBiometric(final String reason) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (Build.VERSION.SDK_INT >= 28) {
                        try {
                            Executor mainExecutor = new Executor() {
                                @Override
                                public void execute(Runnable command) {
                                    runOnUiThread(command);
                                }
                            };
                            BiometricPrompt.Builder builder = new BiometricPrompt.Builder(MainActivity.this)
                                .setTitle("تأیید هویت بیومتریک هم‌حساب")
                                .setSubtitle(reason != null && !reason.isEmpty() ? reason : "سنسور اثر انگشت گوشی را لمس کنید")
                                .setNegativeButton("انصراف", mainExecutor, new DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(DialogInterface dialog, int which) {
                                        sendBiometricResultToJs(false, "عملیات اثر انگشت توسط کاربر لغو شد.");
                                    }
                                });

                            if (Build.VERSION.SDK_INT >= 30) {
                                builder.setAllowedAuthenticators(
                                    BiometricManager.Authenticators.BIOMETRIC_STRONG |
                                    BiometricManager.Authenticators.BIOMETRIC_WEAK
                                );
                            }

                            BiometricPrompt prompt = builder.build();
                            CancellationSignal cancelSignal = new CancellationSignal();
                            prompt.authenticate(cancelSignal, mainExecutor, new BiometricPrompt.AuthenticationCallback() {
                                @Override
                                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                                    super.onAuthenticationSucceeded(result);
                                    vibrateHaptic(1);
                                    sendBiometricResultToJs(true, "");
                                }

                                @Override
                                public void onAuthenticationError(int errorCode, CharSequence errString) {
                                    super.onAuthenticationError(errorCode, errString);
                                    sendBiometricResultToJs(false, errString != null ? errString.toString() : "تأیید اثر انگشت لغو شد.");
                                }

                                @Override
                                public void onAuthenticationFailed() {
                                    super.onAuthenticationFailed();
                                    vibrateHaptic(2);
                                }
                            });
                        } catch (Exception e) {
                            sendBiometricResultToJs(false, e.getMessage() != null ? e.getMessage() : "خطا در اجرای سنسور اثر انگشت");
                        }
                    } else {
                        sendBiometricResultToJs(false, "نسخه اندروید از BiometricPrompt پشتیبانی نمی‌کند.");
                    }
                }
            });
        }

        @JavascriptInterface
        public String getRecentBankSms(int limit) {
            JSONArray result = new JSONArray();
            if (!hasSmsPermission()) {
                return result.toString();
            }
            Cursor cursor = null;
            try {
                Uri inboxUri = Uri.parse("content://sms/inbox");
                cursor = getContentResolver().query(
                    inboxUri,
                    new String[]{"_id", "address", "body", "date"},
                    null,
                    null,
                    "date DESC"
                );
                if (cursor != null) {
                    int count = 0;
                    int maxScan = Math.max(limit * 6, 800);
                    int scanned = 0;
                    while (cursor.moveToNext() && count < limit && scanned < maxScan) {
                        scanned++;
                        String id = cursor.getString(0);
                        String address = cursor.getString(1);
                        String body = cursor.getString(2);
                        long date = cursor.getLong(3);
                        if (BankSmsReceiver.isLikelyIranianBankSms(body)) {
                            JSONObject obj = new JSONObject();
                            obj.put("id", id != null ? id : String.valueOf(date));
                            obj.put("address", address != null ? address : "");
                            obj.put("body", body);
                            obj.put("date", date);
                            result.put(obj);
                            count++;
                        }
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
            return result.toString();
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        activeInstance = this;
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        boolean isInitialDark = detectNightMode(getResources().getConfiguration());
        int initialBgColor = Color.parseColor(isInitialDark ? "#020617" : "#F8FAFC");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(initialBgColor);
            window.setNavigationBarColor(initialBgColor);
            if (!isInitialDark && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decor = window.getDecorView();
                if (decor != null) {
                    int flags = decor.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                    decor.setSystemUiVisibility(flags);
                }
            }
        }

        webView = new WebView(this);
        webView.setBackgroundColor(initialBgColor);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.addJavascriptInterface(new SmsJsBridge(), "AndroidSmsBridge");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                try {
                    if (request != null && "GET".equalsIgnoreCase(request.getMethod())) {
                        Uri uri = request.getUrl();
                        if (uri != null && LIVE_HOST.equalsIgnoreCase(uri.getHost())) {
                            String path = uri.getPath();
                            String query = uri.getQuery();
                            // Allow explicit force-refresh bypass
                            if (query != null && query.contains("refresh=")) {
                                return super.shouldInterceptRequest(view, request);
                            }
                            if (path != null && (path.equals("/hhsb") || path.startsWith(LIVE_BASE_PATH))) {
                                String relPath = path.equals("/hhsb") ? "index.html" : path.substring(LIVE_BASE_PATH.length());
                                WebResourceResponse local = tryServeLocalAsset(relPath);
                                if (local != null) {
                                    return local;
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                notifyJsSystemTheme(detectNightMode(getResources().getConfiguration()));
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    view.loadUrl(LOCAL_FALLBACK);
                }
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                    view.loadUrl(LOCAL_FALLBACK);
                }
            }
        });

        setContentView(webView);
        dispatchIntentExtrasToJs(getIntent());
        webView.loadUrl(LIVE_URL);
        startBackgroundOtaSync();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        dispatchIntentExtrasToJs(intent);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        notifyJsSystemTheme(detectNightMode(newConfig));
    }

    @Override
    protected void onResume() {
        super.onResume();
        isForeground = true;
        activeInstance = this;
        notifyJsSystemTheme(detectNightMode(getResources().getConfiguration()));
    }

    @Override
    protected void onPause() {
        isForeground = false;
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (activeInstance == this) {
            activeInstance = null;
        }
        isForeground = false;
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                "(function(){ return window.onNativeAndroidBackPressed ? window.onNativeAndroidBackPressed() : 'exit'; })()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (value != null && value.contains("handled")) {
                            return;
                        }
                        long now = System.currentTimeMillis();
                        if (now - lastBackPressAt < 2200) {
                            MainActivity.super.onBackPressed();
                        } else {
                            lastBackPressAt = now;
                            Toast.makeText(
                                MainActivity.this,
                                "برای خروج از هم‌حساب دوباره دکمه بازگشت را بزنید",
                                Toast.LENGTH_SHORT
                            ).show();
                        }
                    }
                }
            );
        } else {
            super.onBackPressed();
        }
    }
}
EOF

# 1. Compile and link resources with aapt2
"$BUILD_TOOLS/aapt2" compile --dir "$WORK_DIR/res" -o "$WORK_DIR/compiled_res.zip"
"$BUILD_TOOLS/aapt2" link \
  -o "$WORK_DIR/unsigned.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$WORK_DIR/AndroidManifest.xml" \
  -R "$WORK_DIR/compiled_res.zip" \
  --auto-add-overlay \
  --java "$WORK_DIR/src"

# 2. Compile Java sources to Java 8 bytecode
javac --release 8 \
  -encoding UTF-8 \
  -cp "$ANDROID_JAR" \
  -d "$WORK_DIR/classes" \
  "$WORK_DIR/src/ir/hamhesab/app/R.java" \
  "$WORK_DIR/src/ir/hamhesab/app/BankSmsReceiver.java" \
  "$WORK_DIR/src/ir/hamhesab/app/HamHesabWidgetProvider.java" \
  "$WORK_DIR/src/ir/hamhesab/app/MainActivity.java"

# 3. Convert .class files to classes.dex using d8
"$BUILD_TOOLS/d8" \
  --lib "$ANDROID_JAR" \
  --output "$WORK_DIR/dex" \
  "$WORK_DIR/classes/ir/hamhesab/app/"*.class

# 4. Package classes.dex and offline web assets into unsigned.apk
cp "$WORK_DIR/dex/classes.dex" "$WORK_DIR/classes.dex"
(cd "$WORK_DIR" && zip -q -r unsigned.apk classes.dex assets/)

# 5. Align APK
"$BUILD_TOOLS/zipalign" -f -p 4 "$WORK_DIR/unsigned.apk" "$WORK_DIR/aligned.apk"

# 6. Generate signing key and sign APK (v1 + v2 signatures)
keytool -genkeypair \
  -keystore "$WORK_DIR/release.keystore" \
  -alias hamhesab \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass hamhesab123 \
  -keypass hamhesab123 \
  -dname "CN=HamHesab, OU=Finance, O=HootanFatemeh, L=Tehran, S=Tehran, C=IR"

"$BUILD_TOOLS/apksigner" sign \
  --ks "$WORK_DIR/release.keystore" \
  --ks-key-alias hamhesab \
  --ks-pass pass:hamhesab123 \
  --key-pass pass:hamhesab123 \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --out "$DIST_DIR/hamhesab.apk" \
  "$WORK_DIR/aligned.apk"

rm -rf "$WORK_DIR"
echo "=== Successfully built $DIST_DIR/hamhesab.apk ==="
ls -lh "$DIST_DIR/hamhesab.apk"
