# M-PESA Tracker

A private, offline-first Android application that tracks your M-PESA transactions and organizes your spending into clean, categorized financial dashboards with Material You theming.

![M-PESA Tracker Banner](docs/assets/favicon.svg)

## Features

- **Automatic SMS tracking**: Reads only M-PESA confirmation SMS (with your permission), imports history from your inbox, and captures new transactions live in the background.
- **Real dashboard**: Balance card with month spend, daily activity chart, trend chip, mini income/expense stats — all computed from *your* data. The app starts on a clean, zero-mock ledger.
- **Material You Dynamic Theming**: Light and dark mode support with Safaricom-inspired brand green (`#0f7b3a`), circular icon bubbles and crisp inline SVG icons (no webfonts, zero text bleed).
- **CSV export via the file manager**: One tap pops Android's Storage Access Framework picker — choose exactly where the file is saved. (Runtime storage permission only on Android 9 and below.)
- **Optional Gemini AI reports**: Paste your own Gemini API key to generate an AI-categorized CSV statement with monthly totals and insights. **This is the app's only online feature** and is entirely optional.
- **Profile photo with cropping**: Upload a picture, drag & zoom to crop it into a circle, stored on-device only.
- **Privacy**: Transactions live in the app's private sandbox via `localStorage`. `android.permission.INTERNET` is declared solely for the optional Gemini report; nothing else touches the network.

---

## Download APK

Pre-built signed release APKs are hosted on GitHub Releases:

👉 **[Download Latest APK from Releases](https://github.com/SaintM254/Mpesa-Tracker/releases)**

### Installation Instructions
1. Download `app-release.apk` on your Android phone.
2. If prompted, tap **Settings** and allow *Install unknown apps* for your browser or file manager.
3. Tap **Install** to complete setup.

---

## Building Locally

### Prerequisites
- Node.js >= 22.0.0
- JDK 21
- Android Studio / Android SDK (API 34+)

```bash
git clone https://github.com/SaintM254/Mpesa-Tracker.git
cd Mpesa-Tracker
npm install
npx cap sync android
cd android && ./gradlew assembleRelease
```
The resulting signed release APK will be in:
`android/app/build/outputs/apk/release/app-release.apk`

---

## License

MIT License. Open-source educational project. Not affiliated with Safaricom PLC. M-PESA is a registered trademark of Safaricom PLC.
