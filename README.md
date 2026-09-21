# M-PESA Tracker

A private, offline Android application that tracks your M-PESA transactions and organizes your spending into clean, categorized financial dashboards with dynamic theming.
Contains optional AI features that are only vailable if one uses their own Private API key to generate summaries, Transaction costs and chat with your wallet

![M-PESA Tracker Banner](docs/assets/favicon.svg)

## Features
- **Dynamic Theming**: Light and dark mode support with Safaricom-inspired brand green (`#0f7b3a`) and high-contrast accessibility across both palettes.
- **SMS Parser & Simulator**: Paste real M-PESA confirmation SMS messages (Till numbers, Paybill, P2P Send Money, Received Funds, Airtime purchases) and watch them instantly parse, extract reference codes, amounts, merchants, and auto-categorize.
- **Category Analytics**: Instant spend breakdown for Food & drinks, Transport, Utilities, Airtime, Shopping, Rent, Savings, and Income.
- **Offline Data & Privacy**: All transactions are stored locally on your device via `localStorage`. The app declares **zero Internet permissions** (`android.permission.INTERNET` is completely absent), guaranteeing that your financial records never leave your phone.
- **CSV Export**: Export your entire transaction ledger to CSV with one tap.
- **Otional AI features** :only vailable if one uses their own Private API key to generate summaries, Transaction costs and chat with your wallet

---

## Download APK

**[Download Latest APK from Releases](https://github.com/SaintM254/Mpesa-Tracker/releases)**

### Installation Instructions
1. Download `app-release.apk` on your Android phone.
2. If prompted, tap **Settings** and allow *Install unknown apps* for your browser or file manager.
3. Tap **Install** to complete setup.


## License

MIT License. Open-source educational project. Not affiliated with Safaricom PLC. M-PESA is a registered trademark of Safaricom PLC.
