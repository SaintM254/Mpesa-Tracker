# M-PESA Tracker

A private, **offline-first** Android app that turns your M-PESA confirmation SMS into a clean, categorized spending ledger — no accounts, no servers, no mock data. Your financial history never leaves your phone unless you explicitly ask the optional AI for help.

![M-PESA Tracker](docs/assets/favicon.svg)

---

## ✨ Features

### 📥 Automatic SMS tracking
- **Reads only M-PESA confirmation SMS** (with your permission) — nothing else in your inbox is touched.
- **Deep inbox scan**: walks your entire SMS history in paged batches, back to the first M-PESA message you ever received — not just the last 500.
- **First-run setup progress**: a floating progress card shows how many transactions have been found, and explains this full scan happens **only once** — after setup, everything is instant.
- **Silent startup sync** imports anything received while the app was closed; a **live listener** captures new M-PESA SMS in the background.
- **Deduplication by transaction code** — re-scan as often as you like, never a duplicate entry.
- Imports are **batched** (one sort + one save per 150 messages) so the UI stays responsive even with years of history.

### 📊 Dashboard & analytics
- **Monthly headline figures** — Total Spent is the current calendar month only; full history lives in All Transactions.
- **Weekly activity bars** for the last 7 days — tap any day for its total.
- **Trend chip** comparing this month vs last month.
- Mini stats: monthly income, monthly expenses, lifetime captured count.
- **Analytics view**: monthly income/expense/net summary plus category breakdown bars.
- **All Transactions**: every record grouped into month/year accordions — collapsed months carry zero DOM, so years of history open instantly.

### 🏷️ Smart categories (fully editable)
- **11 categories**: Food & drinks · Transport · Airtime · Utilities (KPLC, water, TV, internet) · Shopping · Rent & housing · Savings · Income · **Send Money** · **Miscellaneous** · **Needs review**.
- Auto-categorization matches the **counterparty only** (never the SMS body — no more "transferred" making everything Transport).
- **Person-to-person payments default to Needs review** instead of being mis-labelled — tap any transaction anywhere to recategorize it in one tap, and the app **learns that counterparty** (people by full name) for the future.
- **Interactive Categories tab**: tap a category card to expand its items inline, review and reassign — the card stays open while you work through the list.

### 🤖 Optional Gemini AI (your own key)
All AI features are **opt-in** and work with a free Gemini API key — the app's only online features:
- **Chat with your Wallet** — ask anything: totals per person, years, months, categories, fees. The AI receives a **complete statistical summary of your entire ledger** (coverage range, per-year/month sent, received, fees & Fuliza, category-per-year spend, **every counterparty indexed**, largest expenses pre-computed) plus raw recent rows — so answers are exact, never "that person doesn't exist".
- **Fees & Fuliza Leakage audit** — full-history audit of every parsed M-PESA charge: lifetime totals, per-year breakdown, trend, Fuliza share and a saving tip. A **local fallback** computes the same math with zero internet.
- **AI Statement CSV** — rewrites your ledger into a categorized report with monthly summaries.
- **Resilient by design**: automatic fallback across the live Gemini model lineup on 404/429/5xx, plus a final primary-model retry; failures state the real HTTP status.
- **Privacy-preserving snapshots**: only date, type, category, counterparty name, amount and fee are shared — transaction codes, phone numbers and balances **never** leave the device.

### 📤 Export & backup
- One-tap **CSV export** (date, time, type, category, counterparty, amount, fee, balance, code) — saved where *you* choose.
- **Clear All Data** in Settings wipes the on-device ledger completely.

### 🎨 Personalization
- **Three themes** — Light, Dark and true-black **AMOLED** (OLED battery saving; green accents become bold white for accessibility). Theme control lives in Settings; no header clutter.
- **Display name** greeting and **profile photo** with built-in drag-and-zoom circle cropper — stored on-device only.
- **Instant, v3.1-class touch response**: no motion tax — recategorize taps acknowledge in the same tick, lists render lazily, glass blur is kept only where it's cheap.
- **No spinning loaders anywhere** — typing-dots in AI chat, live counters elsewhere.

### 🔒 Privacy & offline-first
- The entire ledger lives in the app's **private on-device storage** (`localStorage` sandbox).
- No accounts, no analytics, no trackers, no background network calls.
- The app is **fully functional offline** — AI features degrade gracefully and announce why (offline, key missing, quota, or upstream HTTP status).

---

## 📲 Download

Pre-built **signed release APKs** are published on GitHub Releases:

👉 **[Download the latest APK](https://github.com/SaintM254/Mpesa-Tracker/releases)**

**Install:**
1. Download `app-release.apk` on your Android phone.
2. Allow *Install unknown apps* for your browser/file manager if prompted.
3. Install (it installs on top of older versions, data preserved), open, and **grant SMS permission** when asked.
4. *(Optional)* In **Settings → AI Statement**, paste a free Gemini API key from [aistudio.google.com](https://aistudio.google.com) to unlock chat, reports and the fee audit.

---

## 🛠 Tech stack

| Layer | Tech |
|---|---|
| App shell | Capacitor (WebView) — UI is the plain HTML/CSS/JS in `docs/` |
| Native plugins | `SmsPlugin` (paged inbox read, permissions, live SMS listener), `ExportPlugin` (Storage Access Framework export) |
| Persistence | `localStorage` on-device ledger (inserts batched, dedupe by code) |
| AI | Gemini REST (`v1beta`) with 5-model rolling fallback chain |
| CI/CD | GitHub Actions — every push builds, signs and publishes a tagged release with SHA-256 checksums |
| Dependencies | None at runtime — zero webfonts, zero CDNs; all icons are inline SVG |

### Build from source
```bash
npm ci
npx cap sync android
# open android/ in Android Studio, or let .github/workflows/release.yml build the signed APK
```

---

## 🔐 Permissions & what they're for

| Permission | Why |
|---|---|
| `READ_SMS` / `RECEIVE_SMS` | Read M-PESA confirmations (initial + incremental import) and capture new ones live |
| `INTERNET` | Used **only** by the optional Gemini features you trigger yourself |
| `POST_NOTIFICATIONS` *(if requested)* | Optional sync/failure notices |

Everything else stays off. Delete the app = delete the data.

---

*Current release: **v5.7** — see [Releases](https://github.com/SaintM254/Mpesa-Tracker/releases) for the full changelog.*
