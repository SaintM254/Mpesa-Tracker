# M-PESA Tracker

An Android app that automatically reads M-PESA transaction SMS messages and
turns them into a clean, categorised, offline expense dashboard.

> The app is a native Android WebView shell that loads this repo's
> landing page (`docs/index.html`) — the same site that powers the project's
> GitHub Pages.

- 100% offline — no accounts, no cloud, no analytics
- Reads M-PESA SMS automatically via the `RECEIVE_SMS` permission
- Material You-style light + dark themes
- Touch-friendly, Poppins typography, solid Material icons

---

## Download

Pre-built signed APKs are published on the
[Releases page](https://github.com/SaintM254/Mpesa-Tracker/releases).

## Project layout

```
.
├── android/                     Capacitor-generated Android project
│   └── app/build/outputs/apk    Signed APK output
├── docs/                        Landing page (HTML/CSS/JS)
│   ├── index.html               Wrapped inside the APK
│   └── assets/                  Poppins fonts, styles, favicon
├── capacitor.config.json        Capacitor app config
└── package.json                 Web build scripts
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

## Privacy

The shipped APK declares **no** `INTERNET` permission. All transaction history
is stored in the app's private folder on the device and never leaves it.

M-PESA is a registered trademark of Safaricom PLC. This project is not
affiliated with Safaricom.
