# M-PESA Tracker

A private, 100% offline Android application that tracks your M-PESA transactions and organizes your spending into clean, categorized financial dashboards with Material You theming.

![M-PESA Tracker Banner](docs/assets/favicon.svg)

## Features

- **Exact Mockup Interface**: The app interface matches the screenshot from the website — showing Good morning Brian Otieno, monthly balance cards (KSh 14,820), weekly visual canvas bars, 3-pill income/expense breakdown, color-coded transaction categories, and the 5-item bottom dock navigation.
- **Material You Dynamic Theming**: Light and dark mode support with Safaricom-inspired brand green (`#0f7b3a`) and high-contrast accessibility across both palettes.
- **SMS Parser & Simulator**: Paste real M-PESA confirmation SMS messages (Till numbers, Paybill, P2P Send Money, Received Funds, Airtime purchases) and watch them instantly parse, extract reference codes, amounts, merchants, and auto-categorize.
- **Category Analytics**: Instant spend breakdown for Food & drinks, Transport, Utilities, Airtime, Shopping, Rent, Savings, and Income.
- **Offline Data & Privacy**: All transactions are stored locally on your device via `localStorage`. The app declares **zero Internet permissions** (`android.permission.INTERNET` is completely absent), guaranteeing that your financial records never leave your phone.
- **CSV Export**: Export your entire transaction ledger to CSV with one tap.

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
