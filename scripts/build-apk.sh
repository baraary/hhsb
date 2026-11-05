#!/usr/bin/env bash
set -e

echo "=== Building Signed Android APK (hamhesab.apk) ==="

DIST_DIR="$(pwd)/dist"
WORK_DIR="$(pwd)/.apk-build"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/res/mipmap-xxxhdpi" "$WORK_DIR/res/values" "$WORK_DIR/src/ir/hamhesab/app" "$WORK_DIR/classes" "$WORK_DIR/dex" "$WORK_DIR/assets/www"

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

# Copy built web app into APK assets/www for instant offline support
cp -r "$DIST_DIR/"* "$WORK_DIR/assets/www/" 2>/dev/null || true

# Copy 512x512 PNG icon as launcher icon
cp "$(pwd)/public/pwa-512x512.png" "$WORK_DIR/res/mipmap-xxxhdpi/ic_launcher.png"

# Create strings.xml for Persian App Name
cat > "$WORK_DIR/res/values/strings.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">هم‌حساب</string>
</resources>
EOF

# Create AndroidManifest.xml
cat > "$WORK_DIR/AndroidManifest.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="ir.hamhesab.app"
    android:versionCode="3"
    android:versionName="3.0">

    <uses-sdk android:minSdkVersion="23" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout|uiMode"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# Create MainActivity.java
cat > "$WORK_DIR/src/ir/hamhesab/app/MainActivity.java" << 'EOF'
package ir.hamhesab.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView webView;
    private BroadcastReceiver smsReceiver;
    private static final String LIVE_URL = "https://baraary.github.io/hhsb/";
    private static final String LOCAL_FALLBACK = "file:///android_asset/www/index.html";
    private static final int SMS_PERMISSION_REQ_CODE = 101;

    public class SmsJsBridge {
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
                requestPermissions(
                    new String[]{"android.permission.READ_SMS", "android.permission.RECEIVE_SMS"},
                    SMS_PERMISSION_REQ_CODE
                );
            }
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
                    int maxScan = Math.max(limit * 4, 120);
                    int scanned = 0;
                    while (cursor.moveToNext() && count < limit && scanned < maxScan) {
                        scanned++;
                        String id = cursor.getString(0);
                        String address = cursor.getString(1);
                        String body = cursor.getString(2);
                        long date = cursor.getLong(3);
                        if (body != null && (
                            body.contains("برداشت") ||
                            body.contains("واریز") ||
                            body.contains("واريز") ||
                            body.contains("خرید") ||
                            body.contains("مانده") ||
                            body.contains("موجودی") ||
                            body.contains("حساب") ||
                            body.contains("ریال") ||
                            body.contains("ريال") ||
                            body.contains("بلو")
                        )) {
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
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#0f172a"));
            window.setNavigationBarColor(Color.parseColor("#0f172a"));
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0f172a"));

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
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    view.loadUrl(LOCAL_FALLBACK);
                }
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                view.loadUrl(LOCAL_FALLBACK);
            }
        });

        setContentView(webView);
        webView.loadUrl(LIVE_URL);

        // Live SMS BroadcastReceiver while app is active
        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                try {
                    Bundle bundle = intent.getExtras();
                    if (bundle != null) {
                        Object[] pdus = (Object[]) bundle.get("pdus");
                        String format = bundle.getString("format");
                        if (pdus != null && pdus.length > 0) {
                            StringBuilder fullBody = new StringBuilder();
                            String sender = "";
                            for (Object pdu : pdus) {
                                SmsMessage msg = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                                    ? SmsMessage.createFromPdu((byte[]) pdu, format)
                                    : SmsMessage.createFromPdu((byte[]) pdu);
                                if (msg != null) {
                                    sender = msg.getOriginatingAddress();
                                    fullBody.append(msg.getMessageBody());
                                }
                            }
                            JSONObject obj = new JSONObject();
                            obj.put("id", String.valueOf(System.currentTimeMillis()));
                            obj.put("address", sender != null ? sender : "");
                            obj.put("body", fullBody.toString());
                            obj.put("date", System.currentTimeMillis());
                            final String payload = obj.toString();
                            if (webView != null) {
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
                    }
                } catch (Exception ignored) {
                }
            }
        };
        try {
            IntentFilter filter = new IntentFilter("android.provider.Telephony.SMS_RECEIVED");
            registerReceiver(smsReceiver, filter);
        } catch (Exception ignored) {
        }
    }

    @Override
    protected void onDestroy() {
        try {
            if (smsReceiver != null) {
                unregisterReceiver(smsReceiver);
            }
        } catch (Exception ignored) {
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
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
