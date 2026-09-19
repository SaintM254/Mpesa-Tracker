# M-PESA Tracker

An Android app that **automatically reads M-PESA transaction SMS messages**
and turns them into a clean, categorised, offline expense dashboard.

> The Android app is a native Capacitor WebView shell that loads this repo's
> landing page (`docs/index.html`) — the same site that powers the project's
> optional GitHub Pages deployment.

- 100% offline — **no accounts, no cloud, no analytics** (the app declares
  `INTERNET` permission as deliberately absent)
- Reads M-PESA SMS automatically via the `RECEIVE_SMS` permission
- Material You-inspired light + dark themes
- Poppins typography, Material Icons Round (no outlined / emoji icons)

> **M-PESA** is a registered trademark of Safaricom PLC. This project is not
> affiliated with Safaricom. Just an open-source student / hobbyist build.

---

## Download

Pre-built signed APKs are published on the
[Releases page](https://github.com/SaintM254/Mpesa-Tracker/releases).

| Latest release | APK size |
| --- | --- |
| [`v0.0.0+<sha>-YYYYMMDD-HHMM`](https://github.com/SaintM254/Mpesa-Tracker/releases) | ~3 MB |

> The exact filename is `app-release.apk`. SHA-256 hashes are next to it in
> `SHA256SUMS.txt`.

### Installing an unsigned / sideloaded APK

1. Download `app-release.apk` from the link above.
2. On your Android phone, allow *Install unknown apps* for the browser/file
   manager you used to download it.
3. Tap the APK and choose **Install**.

---

## Project layout

```
.
├── android/                     Capacitor-generated Android project (Gradle)
│   └── app/build/outputs/apk    Signed APK output
├── docs/                        Landing page (HTML/CSS/JS)
│   ├── index.html               Wrapped inside the APK
│   └── assets/                  styles, favicon
├── capacitor.config.json        Capacitor app config (package id, name)
├── package.json                 Web build entry points
└── .github/workflows/
    ├── release.yml              Capacitor APK build + GitHub Release
    └── pages.yml                docs/ → GitHub Pages
```

## Local web preview

```bash
cd docs
python3 -m http.server 4173
# open http://localhost:4173
```

## Build the Android APK locally

```bash
npm install
npx cap sync android
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

To sign with your own key:

```bash
keytool -genkeypair -keystore release.jks -alias mpesatracker \
  -keyalg RSA -keysize 2048 -validity 10000

cat > android/keystore.properties <<EOF
storeFile=signing/release.jks
storePassword=YOUR_STORE_PASS
keyAlias=mpesatracker
keyPassword=YOUR_KEY_PASS
EOF

# Place the keystore relative to the app module:
cp release.jks android/app/signing/release.jks

cd android && ./gradlew assembleRelease
```

## CI

Every push to `main` runs `.github/workflows/release.yml`:

1. Sets up Node 22 + JDK 21 (Capacitor 8 requirements)
2. Generates an ephemeral signing keystore (override with the
   `KEYSTORE_BASE64`, `KEYSTORE_PASS`, `KEY_ALIAS`, `KEY_PASS` repo
   secrets to keep a stable signing identity)
3. Runs `npx cap sync android`, `gradlew assembleRelease`
4. Verifies the signature with `apksigner verify`
5. Uploads `app-release.apk` + `SHA256SUMS.txt` as a GitHub Release

A separate `pages.yml` workflow deploys `docs/` to GitHub Pages (requires
the repo owner to enable GitHub Pages first via repo Settings).

## Privacy

The shipped APK declares **no** `INTERNET` permission. All transaction history
is stored in the app's private folder on the device and never leaves it.
