(function () {
  'use strict';

  // ========================================================
  // M-PESA TRACKER v5.1 — OFFLINE-FIRST M-PESA SMS ENGINE
  // Zero-mock ledger · SAF CSV export · optional Gemini AI · photo cropping
  // Glassmorphism UI · Floating pill dock · Apple-style polish
  // Gemini model fallback · Fees & Fuliza leakage audit · Wallet chat
  // v3.1.1: boot hardening — isolated init steps
  // v4.4: live model chain (1.5/2.0 retired 2025-26) · typing-dots
  // loading · avatar tap inert · fluid glass motion
  // v5.0: DEEP inbox paging (first-ever message, not last 500) · AMOLED
  // theme w/ AA contrast · theme control lives in Settings only
  // ========================================================

  const STORAGE_KEY_TX = 'mpesa_tracker_tx_db_v4'; // fresh namespace: no legacy mock data
  const STORAGE_KEY_THEME = 'mpesa_tracker_theme';
  const STORAGE_KEY_USER = 'mpesa_tracker_user_name';
  const STORAGE_KEY_RULES = 'mpesa_tracker_cat_rules';
  const STORAGE_KEY_PERM_DISMISSED = 'mpesa_tracker_perm_dismissed';
  const STORAGE_KEY_PHOTO = 'mpesa_tracker_user_photo';
  const STORAGE_KEY_GEMINI = 'mpesa_tracker_gemini_key';

  const DEFAULT_USER_NAME = 'M-PESA User';

  // Gemini: standard v1beta endpoint + ordered fallback chain. If the primary
  // model is retired/renamed (HTTP 404) we roll cleanly to the next one.
  const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
  // Sept 2026 reality: gemini-1.5-* retired Sept 2025 and the gemini-2.0-*
  // family shut down 1 June 2026 — the old chain 404'd everywhere, which is
  // the "Gemini AI feature failed" users saw. This chain holds only models
  // alive today; any 404 still rolls cleanly to the next.
  const GEMINI_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash'
  ];
  const GEMINI_TIMEOUT_MS = 30000;

  // ========================================================
  // INLINE SVG ICON SYSTEM (no webfont — crisp vectors, zero text bleed)
  // ========================================================
  const ICON_PATHS = {
    food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
    transport: '<rect x="4" y="3" width="16" height="13" rx="2.5"/><path d="M4 10h16"/><path d="M7 16v3"/><path d="M17 16v3"/><path d="M8 13h.01"/><path d="M16 13h.01"/>',
    airtime: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    utilities: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    shopping: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    rent: '<path d="M3 9.5 12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22v-8h6v8"/>',
    savings: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    income: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12l4 4 4-4"/>',
    needs_review: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    tag: '<path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42z"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>',
    trending_up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    trending_down: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>'
  };

  function icon(name, extraClass) {
    const paths = ICON_PATHS[name] || ICON_PATHS.needs_review;
    return '<svg class="ic' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  // Available Categories (inline SVG glyph keys)
  const CATEGORIES = {
    food:          { key: 'food',         name: 'Food & drinks',  icon: 'food',         class: 'tx-icon--food',      color: '#ef6c00' },
    transport:     { key: 'transport',    name: 'Transport',      icon: 'transport',    class: 'tx-icon--transport', color: '#1e88e5' },
    airtime:       { key: 'airtime',      name: 'Airtime',        icon: 'airtime',      class: 'tx-icon--airtime',   color: '#8e24aa' },
    utilities:     { key: 'utilities',    name: 'Utilities',      icon: 'utilities',    class: 'tx-icon--utilities', color: '#fbc02d' },
    shopping:      { key: 'shopping',     name: 'Shopping',       icon: 'shopping',     class: 'tx-icon--shopping',  color: '#d81b60' },
    rent:          { key: 'rent',         name: 'Rent & housing', icon: 'rent',         class: 'tx-icon--rent',      color: '#00897b' },
    savings:       { key: 'savings',      name: 'Savings',        icon: 'savings',      class: 'tx-icon--savings',   color: '#3949ab' },
    income:        { key: 'income',       name: 'Income',         icon: 'income',       class: 'tx-icon--received',  color: '#2e7d32' },
    needs_review:  { key: 'needs_review', name: 'Needs review',   icon: 'needs_review', class: 'tx-icon--review',    color: '#78909c' }
  };

  // Default initial rules for category guessing based on counterparty / keyword
  const DEFAULT_RULES = {
    'JAVA': 'food', 'KFC': 'food', 'BURGER': 'food', 'PIZZA': 'food', 'ARTCAFFE': 'food', 'CAFE': 'food',
    'RESTAURANT': 'food', 'COFFEE': 'food', 'CHOMA': 'food', 'BAKERY': 'food', 'CHEF': 'food',
    'MATATU': 'transport', 'KENYATTA': 'transport', 'UBER': 'transport', 'BOLT': 'transport',
    'METRO': 'transport', 'BUS': 'transport', 'FARE': 'transport', 'TRANS': 'transport', 'TOTAL': 'transport',
    'SAFARICOM AIRTIME': 'airtime', 'AIRTIME': 'airtime', 'BUNDLE': 'airtime', 'DATA': 'airtime',
    'KPLC': 'utilities', 'PREPAID': 'utilities', 'TOKENS': 'utilities', 'WATER': 'utilities', 'POWER': 'utilities',
    'NAIVAS': 'shopping', 'CARREFOUR': 'shopping', 'QUICKMART': 'shopping', 'SUPERMARKET': 'shopping', 'MALL': 'shopping',
    'LANDLORD': 'rent', 'RENT': 'rent', 'APARTMENT': 'rent', 'HOUSING': 'rent',
    'SAVINGS': 'savings', 'MSHWARI': 'savings', 'KCB': 'savings', 'LOCK': 'savings'
  };

  // In-Memory App State — always starts empty unless the user's own data exists
  let db = [];
  let userCategoryRules = {};
  let inboxScanInProgress = false;
  let liveSmsListenerAttached = false;

  // UI state (persists across re-renders & tab switches, in-memory only)
  let selectedWeekDayKey = null;      // tapped bar in the weekly chart
  const txGroupState = {};            // month/year accordion: key -> collapsed
  const tabScroll = {};               // per-tab scroll position
  let activeTabId = 'view-dashboard';

  // ========================================================
  // PERSISTENCE & LOCAL DATABASE (Indexed by code for deduplication)
  // ========================================================
  function loadDatabase() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TX);
      if (stored) {
        const parsed = JSON.parse(stored);
        db = Array.isArray(parsed) ? parsed : [];
      } else {
        db = [];
      }
    } catch (_) {
      db = [];
    }

    try {
      const storedRules = localStorage.getItem(STORAGE_KEY_RULES);
      userCategoryRules = storedRules ? JSON.parse(storedRules) : { ...DEFAULT_RULES };
    } catch (_) {
      userCategoryRules = { ...DEFAULT_RULES };
    }
  }

  function saveDatabase() {
    try {
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(db));
    } catch (_) {}
  }

  function saveRules() {
    try {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(userCategoryRules));
    } catch (_) {}
  }

  // Deduplicating insert: returns true if inserted, false if already exists
  function insertTransaction(tx) {
    if (!tx || !tx.code) return false;
    const exists = db.some(item => item.code.toUpperCase() === tx.code.toUpperCase());
    if (exists) return false;

    db.unshift(tx);
    // Sort descending by timestamp
    db.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    saveDatabase();
    return true;
  }

  // ========================================================
  // M-PESA SMS PARSER ENGINE (Robust regex, variations)
  // ========================================================
  function parseMpesaMessage(rawBody, fallbackTimestamp) {
    if (!rawBody || typeof rawBody !== 'string') return null;
    const body = rawBody.trim();

    // 1. Transaction code: 10 alphanumeric characters at or near the start
    const codeMatch = body.match(/\b([A-Z0-9]{10})\b/);
    if (!codeMatch) return null;
    const code = codeMatch[1].toUpperCase();

    // 2. Amount: "Ksh500.00", "Ksh 500.00", "Ksh1,500.00", "KSh500", "KES 500"
    const amountMatch = body.match(/(?:Ksh|KSh|KES)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!amountMatch) {
      // Cannot understand amount -> save under "Needs review"
      return {
        code: code,
        amount: 0,
        type: 'other',
        category: 'needs_review',
        counterparty: 'Unrecognized transaction',
        datetime: formatFriendlyDate(fallbackTimestamp || Date.now()),
        timestamp: fallbackTimestamp || Date.now(),
        balance: null,
        cost: null,
        phone: null
      };
    }
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // 3. Balance: "New M-PESA balance is Ksh2,000.00"
    let balance = null;
    const balMatch = body.match(/balance is\s+(?:Ksh|KSh|KES)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (balMatch) {
      balance = parseFloat(balMatch[1].replace(/,/g, ''));
    }

    // 4. Transaction Cost: "Transaction cost, Ksh7.00"
    let cost = null;
    // Covers "Transaction cost, Ksh23.00", "Transaction cost was Ksh10.00",
    // and spacing/case variants
    const costMatch = body.match(/cost[^0-9]{0,12}(?:Ksh|KSh|KES)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (costMatch) {
      cost = parseFloat(costMatch[1].replace(/,/g, ''));
    }

    // 4b. Phone number (e.g. recipient MSISDN) — stored for the CSV only,
    // never included in AI snapshots
    let phone = null;
    const phoneMatch = body.match(/(\+?254|0)\d{9}(?!\d)/);
    if (phoneMatch) {
      phone = phoneMatch[0];
    }

    // 5. Date & Time from message: "on 20/9/26 at 11:50 AM"
    let datetimeStr = '';
    const dateMatch = body.match(/on\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\s+at\s+([0-9]{1,2}:[0-9]{2}(?:\s*[AP]M)?)/i);
    if (dateMatch) {
      datetimeStr = `${dateMatch[1]} ${dateMatch[2]}`;
    } else {
      datetimeStr = formatFriendlyDate(fallbackTimestamp || Date.now());
    }

    // 6. Type & Counterparty
    let type = 'sent';
    let counterparty = 'M-PESA Merchant';
    let category = 'shopping';

    const isReceived = /received|deposited|cashback/i.test(body) && !/sent to|paid to/i.test(body);
    const isAirtime = /airtime/i.test(body);
    const isWithdraw = /withdraw/i.test(body);
    const isFuliza = /fuliza/i.test(body);

    if (isReceived) {
      type = 'received';
      category = 'income';
      const fromMatch = body.match(/from\s+([A-Z0-9\s.,'&-]+?)(?:\s+on|\s+\d{10}|\s+New|\.|$)/i);
      counterparty = fromMatch ? cleanCounterparty(fromMatch[1]) : 'Funds Received';
    } else if (isAirtime) {
      type = 'airtime';
      category = 'airtime';
      counterparty = 'Safaricom airtime';
    } else if (isWithdraw) {
      type = 'withdraw';
      category = 'utilities';
      const agentMatch = body.match(/(?:from agent|from)\s+([A-Z0-9\s.,'&-]+?)(?:\s+on|\s+New|\.|$)/i);
      counterparty = agentMatch ? cleanCounterparty(agentMatch[1]) : 'M-PESA Agent Withdrawal';
    } else if (isFuliza) {
      type = 'fee';
      category = 'utilities';
      counterparty = 'Fuliza M-PESA Charge';
    } else {
      // Sent to or Paid to (Till / Paybill / P2P)
      type = 'sent';
      const toMatch = body.match(/(?:paid to|sent to|transferred to)\s+([A-Z0-9\s.,'&-]+?)(?:\s+on|\s+\d{4,}|\s+for|\s+New|\.|$)/i);
      counterparty = toMatch ? cleanCounterparty(toMatch[1]) : 'M-PESA Payment';
    }

    // 7. Auto-categorize based on rules
    if (type !== 'received') {
      category = guessCategory(counterparty, body);
    }

    return {
      code,
      amount,
      type,
      category,
      counterparty,
      datetime: datetimeStr,
      timestamp: fallbackTimestamp || Date.now(),
      balance,
      cost,
      phone
    };
  }

  function cleanCounterparty(str) {
    if (!str) return 'M-PESA Merchant';
    return str.replace(/\s+/g, ' ')
              .replace(/(?:account|acc\b|for|on\b|at\b).*/i, '')
              .replace(/[0-9]{10,}/g, '')
              .trim() || 'M-PESA Merchant';
  }

  function guessCategory(counterparty, fullBody) {
    const cpUpper = (counterparty || '').toUpperCase();
    const bodyUpper = (fullBody || '').toUpperCase();

    // Check user-remembered rules first
    for (const [key, cat] of Object.entries(userCategoryRules)) {
      if (cpUpper.includes(key.toUpperCase())) {
        return cat;
      }
    }

    // Built-in keyword fallbacks
    if (/JAVA|KFC|BURGER|PIZZA|ARTCAFFE|CAFE|RESTAURANT|CHOMA|COFFEE|BAKERY|FOOD|GRILL/i.test(bodyUpper)) return 'food';
    if (/MATATU|KENYATTA|UBER|BOLT|SUPER METRO|TRANS|BUS|FARE/i.test(bodyUpper)) return 'transport';
    if (/KPLC|POWER|TOKENS|WATER|ELECTRIC/i.test(bodyUpper)) return 'utilities';
    if (/SAFARICOM|AIRTIME|BUNDLE|DATA/i.test(bodyUpper)) return 'airtime';
    if (/NAIVAS|CARREFOUR|QUICKMART|SUPERMARKET|MALL|MART|STORE/i.test(bodyUpper)) return 'shopping';
    if (/RENT|LANDLORD|APARTMENT|HOUSING|ESTATE/i.test(bodyUpper)) return 'rent';
    if (/SAVINGS|MSHWARI|KCB|LOCK/i.test(bodyUpper)) return 'savings';

    return 'shopping';
  }

  function updateCategoryForTransaction(code, newCat) {
    const tx = db.find(t => t.code === code);
    if (!tx) return;
    tx.category = newCat;
    saveDatabase();

    // Remember choice for this counterparty for future messages
    if (tx.counterparty && tx.counterparty !== 'M-PESA Merchant') {
      const keyword = tx.counterparty.split(' ')[0].toUpperCase();
      if (keyword.length >= 3) {
        userCategoryRules[keyword] = newCat;
        saveRules();
      }
    }
  }

  function formatFriendlyDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return 'Recent';
    }
  }

  function formatKsh(amt) {
    return Number(amt || 0).toLocaleString('en-KE');
  }

  // ========================================================
  // NATIVE SMS CAPACITOR PLUGIN INTEGRATION
  // ========================================================
  function getSmsPlugin() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SmsPlugin) {
      return window.Capacitor.Plugins.SmsPlugin;
    }
    return null;
  }

  function getExportPlugin() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ExportPlugin) {
      return window.Capacitor.Plugins.ExportPlugin;
    }
    return null;
  }

  async function checkNativeSmsPermissions() {
    const plugin = getSmsPlugin();
    if (!plugin) return { available: false, granted: false };
    try {
      const res = await plugin.checkSmsPermissions();
      return { available: true, granted: !!res.granted };
    } catch (e) {
      return { available: true, granted: false };
    }
  }

  async function requestNativeSmsPermissions() {
    const plugin = getSmsPlugin();
    if (!plugin) return false;
    try {
      const res = await plugin.requestSmsPermissions();
      return !!res.granted;
    } catch (e) {
      return false;
    }
  }

  // opts.deep=false  -> newest-page only (fast path, used at startup)
  // opts.deep=true   -> walk offset pages of the WHOLE inbox, back to the
  //                     very first M-PESA message ever received (v5.0)
  // opts.onProgress -> optional (importedCount, pagesRead) progress hook
  async function scanMpesaInbox(opts) {
    const plugin = getSmsPlugin();
    if (!plugin || inboxScanInProgress) return 0;
    inboxScanInProgress = true;
    const deep = !!(opts && opts.deep);
    const onProgress = (opts && typeof opts.onProgress === 'function') ? opts.onProgress : null;
    const PAGE = 350;
    let imported = 0;
    try {
      if (!deep) {
        const res = await plugin.readMpesaInbox({ limit: 500, offset: 0 });
        if (res && Array.isArray(res.messages)) {
          res.messages.forEach(msg => {
            const parsed = parseMpesaMessage(msg.body, msg.timestamp);
            if (parsed && insertTransaction(parsed)) imported++;
          });
        }
      } else {
        // The native layer sorts the whole SMS table newest-first; hasMore
        // stays true while a page was completely full — i.e. history goes on.
        for (let offset = 0, guard = 0; guard < 300; guard++, offset += PAGE) {
          const res = await plugin.readMpesaInbox({ limit: PAGE, offset });
          if (!res || !Array.isArray(res.messages)) break;
          res.messages.forEach(msg => {
            const parsed = parseMpesaMessage(msg.body, msg.timestamp);
            if (parsed && insertTransaction(parsed)) imported++;
          });
          if (onProgress) onProgress(imported, guard + 1);
          if (!res.hasMore) break; // reached the oldest SMS in the inbox
        }
      }
      return imported;
    } catch (e) {
      // Never write message content to logs
      return imported;
    } finally {
      inboxScanInProgress = false;
    }
  }

  function listenForLiveSms() {
    if (liveSmsListenerAttached) return;
    const plugin = getSmsPlugin();
    if (!plugin || !plugin.addListener) return;
    try {
      plugin.addListener('onNewMpesaSms', data => {
        if (data && data.body) {
          const parsed = parseMpesaMessage(data.body, data.timestamp || Date.now());
          if (parsed) {
            const added = insertTransaction(parsed);
            if (added) {
              renderAllViews();
              showToast(`New M-PESA: ${parsed.type === 'received' ? '+' : '−'}KSh ${formatKsh(parsed.amount)} (${parsed.counterparty})`);
            }
          }
        }
      });
      liveSmsListenerAttached = true;
    } catch (_) {}
  }

  // Silent startup sync: import anything received while the app was closed
  async function autoSyncOnStartup() {
    const count = await scanMpesaInbox();
    if (count > 0) {
      renderAllViews();
      showToast(`Synced ${count} new M-PESA transaction${count === 1 ? '' : 's'} from your inbox.`);
    }
  }

  // ========================================================
  // UI RENDERING ENGINE
  // ========================================================
  function renderAllViews() {
    renderDashboard();
    renderAnalytics();
    renderCategoriesGrid();
    renderTransactions();
  }

  // Shared transaction row — used by Dashboard and the All Transactions screen,
  // so edits made on either screen stay in sync (both render from the same db).
  function buildTxRow(tx) {
    const cat = CATEGORIES[tx.category] || CATEGORIES.shopping;
    const isIn = tx.type === 'received';
    const sign = isIn ? '+' : '−';
    const amtClass = isIn ? 'tx-amount--in' : 'tx-amount--out';

    const li = document.createElement('li');
    li.className = 'tx';
    li.innerHTML = `
      <div class="tx-icon ${cat.class}">
        ${icon(cat.icon)}
      </div>
      <div class="tx-body">
        <p class="tx-title">${escapeHtml(tx.counterparty)}</p>
        <p class="tx-meta">${escapeHtml(cat.name)} · ${escapeHtml(tx.datetime || '')}</p>
      </div>
      <div class="tx-amount ${amtClass}">${sign} KSh ${formatKsh(tx.amount)}</div>
    `;

    // Tap any row -> change category popup (same dialog on every screen)
    li.addEventListener('click', () => openCategoryPicker(tx));
    return li;
  }

  function totals() {
    let totalExpense = 0;
    let totalIncome = 0;
    db.forEach(t => {
      if (t.type === 'received') {
        totalIncome += Number(t.amount || 0);
      } else {
        totalExpense += Number(t.amount || 0);
      }
    });
    return { totalExpense, totalIncome, net: totalIncome - totalExpense };
  }

  function renderDashboard() {
    const { totalExpense, totalIncome, net } = totals();

    // Balance Card
    const totalSpentEl = document.getElementById('dashTotalSpent');
    if (totalSpentEl) totalSpentEl.innerHTML = `KSh <span>${formatKsh(totalExpense)}</span>`;

    const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });
    const monthLabel = document.getElementById('dashMonthLabel');
    if (monthLabel) monthLabel.textContent = `Total spent · ${monthName}`;

    const netEl = document.getElementById('dashNetTotal');
    if (netEl) netEl.textContent = `Net: ${net >= 0 ? '+' : '−'}KSh ${formatKsh(Math.abs(net))}`;

    // Trend chip: this month vs last month (only shown with real data)
    renderTrendChip();

    // Weekly bars from real daily expenses (last 7 days)
    renderWeeklyBars();

    // Mini Stats
    const miniIncome = document.getElementById('miniIncome');
    if (miniIncome) miniIncome.textContent = `+KSh ${formatKsh(totalIncome)}`;

    const miniExpenses = document.getElementById('miniExpenses');
    if (miniExpenses) miniExpenses.textContent = `−KSh ${formatKsh(totalExpense)}`;

    const miniCount = document.getElementById('miniCount');
    if (miniCount) miniCount.textContent = `${db.length} item${db.length === 1 ? '' : 's'}`;

    // Transaction List (recent, newest first — unchanged behavior)
    const listEl = document.getElementById('dashboardTxList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const recents = db.slice(0, 15);
    if (!recents.length) {
      listEl.innerHTML = '<li class="empty-state">No M-PESA transactions yet. Grant SMS access to start tracking.</li>';
      return;
    }

    recents.forEach(tx => listEl.appendChild(buildTxRow(tx)));
  }

  function renderTrendChip() {
    const trendEl = document.getElementById('dashTrend');
    if (!trendEl) return;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    let thisMonth = 0;
    let lastMonth = 0;
    db.forEach(t => {
      if (t.type === 'received') return;
      const ts = Number(t.timestamp || 0);
      const amt = Number(t.amount || 0);
      if (ts >= thisMonthStart) thisMonth += amt;
      else if (ts >= lastMonthStart) lastMonth += amt;
    });

    // Hide in a zero-mock state (nothing to compare yet)
    if (thisMonth === 0 && lastMonth === 0) {
      trendEl.style.display = 'none';
      return;
    }

    const lastMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toLocaleDateString('en-GB', { month: 'short' });

    let chip;
    if (lastMonth === 0) {
      chip = `${icon('trending_up', 'ic-xs')}<span>new this month</span>`;
    } else {
      const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
      const up = pct >= 0;
      chip = `${icon(up ? 'trending_up' : 'trending_down', 'ic-xs')}<span>${up ? '+' : ''}${pct}% vs ${lastMonthName}</span>`;
    }
    trendEl.innerHTML = chip;
    trendEl.style.display = 'inline-flex';
  }

  function renderWeeklyBars() {
    const barsEl = document.getElementById('weeklyBars');
    const readoutEl = document.getElementById('weeklyReadout');
    if (!barsEl) return;

    // Build the last 7 days ending today
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        dow: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        label: d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }),
        start: d.getTime(),
        end: d.getTime() + 86400000,
        total: 0
      });
    }

    db.forEach(t => {
      if (t.type === 'received') return;
      const ts = Number(t.timestamp || 0);
      const amt = Number(t.amount || 0);
      for (const day of days) {
        if (ts >= day.start && ts < day.end) {
          day.total += amt;
          break;
        }
      }
    });

    // Keep the tapped day selected across re-renders; default = today
    if (!selectedWeekDayKey || !days.some(d => d.key === selectedWeekDayKey)) {
      selectedWeekDayKey = days[days.length - 1].key;
    }

    const maxTotal = Math.max(...days.map(d => d.total), 0);
    barsEl.innerHTML = '';
    days.forEach(day => {
      const col = document.createElement('button');
      col.type = 'button';
      col.className = 'week-col' + (day.key === selectedWeekDayKey ? ' is-selected' : '');
      const pct = maxTotal === 0 ? 6 : Math.max(6, Math.round((day.total / maxTotal) * 100));
      col.innerHTML = `<span class="week-bar" style="--h:${pct}%"></span><span class="week-day">${escapeHtml(day.dow)}</span>`;
      col.setAttribute('aria-label', `${day.label}: KSh ${formatKsh(day.total)}`);
      col.addEventListener('click', () => {
        selectedWeekDayKey = day.key;
        renderWeeklyBars();
      });
      barsEl.appendChild(col);
    });

    const sel = days.find(d => d.key === selectedWeekDayKey);
    if (readoutEl && sel) {
      readoutEl.textContent = sel.total > 0
        ? `${sel.label} · KSh ${formatKsh(sel.total)} spent`
        : `${sel.label} · no spend recorded`;
    }
  }

  function renderAnalytics() {
    const { totalExpense, totalIncome, net } = totals();
    const catTotals = {};

    db.forEach(t => {
      if (t.type !== 'received') {
        catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount || 0);
      }
    });

    const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });
    const analyticsMonthLabel = document.getElementById('analyticsMonthLabel');
    if (analyticsMonthLabel) analyticsMonthLabel.textContent = `${monthName} breakdown`;

    const totalEl = document.getElementById('analyticsTotal');
    if (totalEl) totalEl.textContent = `KSh ${formatKsh(totalExpense)}`;

    const inEl = document.getElementById('analyticsIn');
    if (inEl) inEl.textContent = `KSh ${formatKsh(totalIncome)}`;

    const outEl = document.getElementById('analyticsOut');
    if (outEl) outEl.textContent = `KSh ${formatKsh(totalExpense)}`;

    const netEl = document.getElementById('analyticsNet');
    if (netEl) netEl.textContent = `${net >= 0 ? '+' : '−'}KSh ${formatKsh(Math.abs(net))}`;

    const barsList = document.getElementById('categoryBarsList');
    if (!barsList) return;
    barsList.innerHTML = '';

    const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const maxVal = entries.length ? Math.max(...entries.map(e => e[1])) : 1;

    entries.forEach(([catKey, total]) => {
      const cat = CATEGORIES[catKey] || CATEGORIES.shopping;
      const percent = Math.min(100, Math.round((total / maxVal) * 100));

      const row = document.createElement('div');
      row.className = 'cat-bar-row';
      row.innerHTML = `
        <div class="cat-bar-header">
          <span class="cat-bar-name">
            <span class="tx-icon ${cat.class} cat-bar-badge">${icon(cat.icon, 'ic-xs')}</span>
            ${escapeHtml(cat.name)}
          </span>
          <strong class="cat-bar-amount">KSh ${formatKsh(total)}</strong>
        </div>
        <div class="cat-progress-track">
          <div class="cat-progress-fill" style="width: ${percent}%; background: ${cat.color};"></div>
        </div>
      `;
      barsList.appendChild(row);
    });

    if (!entries.length) {
      barsList.innerHTML = '<p class="empty-hint">No expenses recorded yet.</p>';
    }
  }

  function renderCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.entries(CATEGORIES).forEach(([key, c]) => {
      if (key === 'needs_review' && !db.some(t => t.category === 'needs_review')) {
        return; // Only show needs_review if items exist
      }
      const items = db.filter(t => t.category === key);
      const count = items.length;
      const sum = items.reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
        <div class="tx-icon ${c.class}">${icon(c.icon)}</div>
        <h4>${escapeHtml(c.name)}</h4>
        <p class="category-meta">${count} item${count === 1 ? '' : 's'}</p>
        <p class="category-total">KSh ${formatKsh(sum)}</p>
      `;
      grid.appendChild(card);
    });
  }

  // ========================================================
  // ALL TRANSACTIONS SCREEN — accordion grouped by month & year
  // ========================================================
  function renderTransactions() {
    const host = document.getElementById('transactionsGroups');
    if (!host) return;
    host.innerHTML = '';

    if (!db.length) {
      host.innerHTML = '<div class="empty-state empty-state--card">No transactions yet. Sync your SMS inbox from Settings, or paste an SMS below.</div>';
      return;
    }

    // Group chronologically by Year-Month
    const groups = new Map();
    db.forEach(t => {
      const d = new Date(Number(t.timestamp || Date.now()));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          items: [],
          spend: 0,
          count: 0
        });
      }
      const g = groups.get(key);
      g.items.push(t);
      g.count++;
      if (t.type !== 'received') g.spend += Number(t.amount || 0);
    });

    const sortedKeys = [...groups.keys()].sort().reverse(); // newest month first

    sortedKeys.forEach((key, idx) => {
      const g = groups.get(key);
      // Default: only the latest month expanded; choice remembered across renders
      const collapsed = (key in txGroupState) ? txGroupState[key] : (idx !== 0);

      const wrap = document.createElement('div');
      wrap.className = 'tx-group' + (collapsed ? ' is-collapsed' : '');

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'tx-group-header';
      header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      header.innerHTML = `
        <span class="tx-group-title">${escapeHtml(g.label)}</span>
        <span class="tx-group-meta" data-month-total>−KSh ${formatKsh(g.spend)} · ${g.count} item${g.count === 1 ? '' : 's'}</span>
        <svg class="ic ic-sm tx-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      `;
      header.addEventListener('click', () => {
        const nowCollapsed = !wrap.classList.contains('is-collapsed');
        txGroupState[key] = nowCollapsed;
        wrap.classList.toggle('is-collapsed', nowCollapsed);
        header.setAttribute('aria-expanded', String(!nowCollapsed));
      });

      const body = document.createElement('div');
      body.className = 'tx-group-body';
      const ul = document.createElement('ul');
      ul.className = 'tx-list tx-list--plain';
      g.items.forEach(tx => ul.appendChild(buildTxRow(tx)));
      body.appendChild(ul);

      wrap.appendChild(header);
      wrap.appendChild(body);
      host.appendChild(wrap);
    });
  }

  // Category Picker Modal
  function openCategoryPicker(tx) {
    const modal = document.getElementById('categoryModal');
    const nameEl = document.getElementById('modalTxName');
    const optionsEl = document.getElementById('modalCatOptions');
    if (!modal || !nameEl || !optionsEl) return;

    nameEl.textContent = `${tx.counterparty} (KSh ${formatKsh(tx.amount)})`;
    optionsEl.innerHTML = '';

    Object.values(CATEGORIES).forEach(c => {
      const btn = document.createElement('button');
      btn.className = `cat-option-btn ${tx.category === c.key ? 'is-selected' : ''}`;
      btn.innerHTML = `
        <span class="tx-icon ${c.class} cat-bar-badge">${icon(c.icon, 'ic-xs')}</span>
        <span>${escapeHtml(c.name)}</span>
      `;
      btn.addEventListener('click', () => {
        updateCategoryForTransaction(tx.code, c.key);
        modal.classList.remove('is-open');
        renderAllViews();
        showToast(`Category updated to ${c.name}`);
      });
      optionsEl.appendChild(btn);
    });

    modal.classList.add('is-open');
  }

  // ========================================================
  // PERMISSION MODAL & FIRST-RUN ONBOARDING
  // ========================================================
  function initPermissionScreen() {
    const banner = document.getElementById('permBanner');
    const modal = document.getElementById('permModal');
    const grantBtn = document.getElementById('grantPermBtn');
    const bannerScanBtn = document.getElementById('bannerScanBtn');
    const bannerDismissBtn = document.getElementById('bannerDismissBtn');
    const modalCloseBtn = document.getElementById('permModalClose');

    const plugin = getSmsPlugin();

    // Check permissions and show the first-run popup
    async function checkAndPrompt() {
      if (!plugin) {
        if (banner) banner.style.display = 'none';
        return;
      }

      const status = await checkNativeSmsPermissions();
      if (!status.granted) {
        const dismissed = localStorage.getItem(STORAGE_KEY_PERM_DISMISSED);
        if (!dismissed && modal) {
          // First run: ask up-front for SMS access
          modal.classList.add('is-open');
        } else if (banner) {
          banner.style.display = 'flex';
        }
      } else {
        if (banner) banner.style.display = 'none';
        if (modal) modal.classList.remove('is-open');
        listenForLiveSms();
        autoSyncOnStartup();
      }
    }

    if (grantBtn) {
      grantBtn.addEventListener('click', async () => {
        if (modal) modal.classList.remove('is-open');
        const granted = await requestNativeSmsPermissions();
        if (granted) {
          showToast('SMS permission granted. Deep scanning your full inbox…');
          listenForLiveSms();
          const count = await scanMpesaInbox({ deep: true });
          renderAllViews();
          showToast(count > 0
            ? `Imported ${count} M-PESA transaction${count === 1 ? '' : 's'} — full history restored.`
            : 'No M-PESA messages found in this inbox yet.');
        } else {
          showToast('Permission not granted. You can enable SMS access anytime from Settings.');
          if (banner) banner.style.display = 'flex';
        }
      });
    }

    if (modalCloseBtn && modal) {
      modalCloseBtn.addEventListener('click', () => {
        modal.classList.remove('is-open');
        localStorage.setItem(STORAGE_KEY_PERM_DISMISSED, 'true');
        if (banner) banner.style.display = 'flex';
      });
    }

    if (bannerScanBtn) {
      bannerScanBtn.addEventListener('click', () => {
        if (modal) modal.classList.add('is-open');
      });
    }

    if (bannerDismissBtn && banner) {
      bannerDismissBtn.addEventListener('click', () => {
        banner.style.display = 'none';
        localStorage.setItem(STORAGE_KEY_PERM_DISMISSED, 'true');
      });
    }

    checkAndPrompt();
  }

  // ========================================================
  // SETTINGS: SYNC SMS INBOX TOOL
  // ========================================================
  function initInboxSync() {
    const syncBtn = document.getElementById('syncInboxBtn');
    const syncLabel = document.getElementById('syncInboxLabel');
    const syncIcon = document.getElementById('syncInboxIcon');
    const modal = document.getElementById('permModal');
    if (!syncBtn) return;

    syncBtn.addEventListener('click', async () => {
      const plugin = getSmsPlugin();
      if (!plugin) {
        showToast('Inbox sync works inside the Android APK.');
        return;
      }

      const status = await checkNativeSmsPermissions();
      if (!status.granted) {
        if (modal) {
          modal.classList.add('is-open');
        } else {
          showToast('Grant SMS permission first.');
        }
        return;
      }

      // Busy state + live progress while the deep scan walks the inbox
      syncBtn.disabled = true;
      if (syncLabel) syncLabel.textContent = 'Deep scanning…';
      if (syncIcon) syncIcon.classList.add('ic-spin');

      try {
        const count = await scanMpesaInbox({
          deep: true,
          onProgress: n => { if (syncLabel) syncLabel.textContent = `Scanning… ${n} found`; }
        });
        renderAllViews();
        if (count > 0) {
          showToast(`Sync complete: ${count} new M-PESA transaction${count === 1 ? '' : 's'} imported.`);
        } else {
          showToast('Sync complete: ledger already up to date.');
        }
      } finally {
        syncBtn.disabled = false;
        if (syncLabel) syncLabel.textContent = 'Sync';
        if (syncIcon) syncIcon.classList.remove('ic-spin');
      }
    });
  }

  // ========================================================
  // THEME & USER SETTINGS
  // ========================================================
  function initTheme() {
    const html = document.documentElement;
    const THEMES = ['light', 'dark', 'amoled'];

    function apply(theme) {
      if (!THEMES.includes(theme)) theme = 'light';
      html.setAttribute('data-theme', theme);
      // Instant pivot — no palette tween (v4.4's cross-fade caused the
      // "choppy and awful" theme switch by re-painting every glass blur).
      document.querySelectorAll('.theme-seg-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-theme') === theme);
      });
    }

    let t = localStorage.getItem(STORAGE_KEY_THEME);
    if (!t || !THEMES.includes(t)) {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    apply(t);

    // The header quick-toggle was removed in v5.0 — the Settings segmented
    // control is the single source of truth.
    const seg = document.getElementById('themeSeg');
    if (seg) {
      seg.querySelectorAll('.theme-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const next = btn.getAttribute('data-theme');
          if (!THEMES.includes(next)) return;
          apply(next);
          localStorage.setItem(STORAGE_KEY_THEME, next);
        });
      });
    }
  }

  function timeBasedGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  function initUser() {
    const savedName = localStorage.getItem(STORAGE_KEY_USER) || DEFAULT_USER_NAME;
    const nameEl = document.getElementById('userGreeting');
    const helloEl = document.getElementById('helloLine');
    const avatarEl = document.getElementById('avatarBtn');
    const inputEl = document.getElementById('nameInput');

    if (helloEl) helloEl.textContent = timeBasedGreeting();

    function updateName(name) {
      const safe = name.trim() || DEFAULT_USER_NAME;
      if (nameEl) nameEl.textContent = safe;
      if (inputEl) inputEl.value = safe;
      currentInitials = safe.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'MU';
      renderAvatar(); // shows the stored photo if one exists, else initials
      localStorage.setItem(STORAGE_KEY_USER, safe);
    }

    updateName(savedName);

    if (inputEl) {
      inputEl.addEventListener('change', () => updateName(inputEl.value));
    }
  }

  function initTabs() {
    const dock = document.getElementById('bottomDock');
    if (!dock) return;

    const items = dock.querySelectorAll('.dock-item');
    const views = document.querySelectorAll('.app-tab-view');

    function switchTab(targetId) {
      // Remember where the user scrolled on the current tab…
      tabScroll[activeTabId] = window.scrollY || document.documentElement.scrollTop || 0;

      items.forEach(btn => btn.classList.toggle('is-active', btn.getAttribute('data-tab') === targetId));
      views.forEach(v => v.classList.toggle('is-active', v.id === targetId));

      // …and restore it on return (new tabs start at the top)
      window.scrollTo({ top: tabScroll[targetId] || 0, behavior: 'auto' });
      activeTabId = targetId;
    }
    window.__switchTab = switchTab; // used by in-page shortcuts

    items.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    // "View all" on the dashboard routes to the All Transactions screen,
    // auto-highlighting the Transactions dock tab
    const seeAll = document.getElementById('seeAllBtn');
    if (seeAll) seeAll.addEventListener('click', () => switchTab('view-transactions'));

    // Back shortcut from All Transactions to Home
    const backBtn = document.getElementById('transactionsBackBtn');
    if (backBtn) backBtn.addEventListener('click', () => switchTab('view-dashboard'));
  }

  // ========================================================
  // CSV EXPORT (native Storage Access Framework + browser fallback)
  // ========================================================
  function csvEscapeCell(v) {
    const s = String(v === null || v === undefined || v === '' ? '-' : v);
    return `"${s.replace(/"/g, '""')}"`;
  }

  // Date & time are ALWAYS filled: parse the SMS "dd/mm/yy hh:mm AM" string,
  // falling back to the message timestamp so no cell is ever empty.
  function csvDateTime(t) {
    const m = String(t.datetime || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
    const pad = n => String(n).padStart(2, '0');
    if (m) {
      let dd = m[1], mm = m[2], yy = m[3], hh = parseInt(m[4], 10);
      const min = m[5], ap = (m[6] || '').toUpperCase();
      if (ap === 'PM' && hh < 12) hh += 12;
      if (ap === 'AM' && hh === 12) hh = 0;
      if (yy.length === 2) yy = '20' + yy;
      return { date: `${yy}-${pad(mm)}-${pad(dd)}`, time: `${pad(hh)}:${min}` };
    }
    const d = new Date(Number(t.timestamp || Date.now()));
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
  }

  function buildCsvText() {
    let csv = 'Code,Date,Time,Type,Category,Counterparty,Phone,Amount (KSh),Cost (KSh),Balance (KSh)\n';
    db.forEach(t => {
      const dt = csvDateTime(t);
      const catName = (CATEGORIES[t.category] || {}).name || t.category || '-';
      const amount = Number(t.amount || 0).toFixed(2);
      const cost = (t.cost !== null && t.cost !== undefined) ? Number(t.cost).toFixed(2) : '-';
      const balance = (t.balance !== null && t.balance !== undefined) ? Number(t.balance).toFixed(2) : '-';
      csv += [
        csvEscapeCell(t.code), csvEscapeCell(dt.date), csvEscapeCell(dt.time),
        csvEscapeCell(t.type), csvEscapeCell(catName), csvEscapeCell(t.counterparty),
        csvEscapeCell(t.phone), `"${amount}"`, `"${cost}"`, `"${balance}"`
      ].join(',') + '\n';
    });
    return csv;
  }

  // Saves CSV: in the APK it pops the Android file manager (document picker)
  // so the user chooses the folder; in a plain browser it downloads the blob.
  async function saveCsvEverywhere(fileName, contents) {
    const plugin = getExportPlugin();
    if (plugin) {
      try {
        const perm = await plugin.requestStorageAccess();
        if (!perm || !perm.granted) {
          showToast('Storage permission denied — CSV was not saved.');
          return false;
        }
      } catch (_) { /* storage permission not needed on this Android version */ }

      try {
        const res = await plugin.saveCsvToStorage({ fileName, contents });
        if (res && res.saved) {
          showToast(`Saved ${fileName} to the location you picked.`);
          return true;
        }
        showToast('Save cancelled — no file written.');
        return false;
      } catch (e) {
        showToast('Could not save the CSV file.');
        return false;
      }
    }

    // Browser fallback: classic blob download
    try {
      const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${fileName}.`);
      return true;
    } catch (e) {
      showToast('Could not save the CSV file.');
      return false;
    }
  }

  function todaySlug() {
    return new Date().toISOString().slice(0, 10);
  }

  function initSettingsActions() {
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        if (!db.length) {
          showToast('No transactions to export yet. Sync your SMS inbox first.');
          return;
        }
        await saveCsvEverywhere(`mpesa-ledger-${todaySlug()}.csv`, buildCsvText());
      });
    }

    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Permanently delete all tracked transactions and learned category rules from this device?')) {
          db = [];
          userCategoryRules = { ...DEFAULT_RULES };
          saveDatabase();
          saveRules();
          renderAllViews();
          showToast('All transaction data cleared.');
        }
      });
    }

    const modalClose = document.getElementById('modalCloseBtn');
    const modal = document.getElementById('categoryModal');
    if (modalClose && modal) {
      modalClose.addEventListener('click', () => modal.classList.remove('is-open'));
    }
  }

  // ========================================================
  // GEMINI AI REPORT (optional — the app's only online feature)
  // ========================================================
  // --------------------------------------------------------
  // AI CORE — guarded, fallible, never blocking local features
  // --------------------------------------------------------
  function isOnline() {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  }

  function getGeminiKey() {
    return (localStorage.getItem(STORAGE_KEY_GEMINI) || '').trim();
  }

  // Feature flag: AI only runs when the user opted in with their own key
  function isGeminiEnabled() {
    return getGeminiKey().length > 0;
  }

  // Non-blocking badge next to the AI controls when connectivity drops
  function updateAiOfflineBadge() {
    const badge = document.getElementById('aiOfflineBadge');
    if (badge) badge.classList.toggle('is-visible', !isOnline());
  }

  // Capture the precise HTTP failure body (never a fabricated cause)
  async function readGeminiErrorBody(resp) {
    let raw = '';
    try { raw = await resp.text(); } catch (_) { /* noop */ }
    let message = '';
    try {
      const parsed = JSON.parse(raw);
      message = (parsed && parsed.error && parsed.error.message) ? parsed.error.message : '';
    } catch (_) { /* not JSON */ }
    if (!message) message = (raw || '').slice(0, 160);
    return { status: resp.status, message, raw };
  }

  // One gateway for every Gemini call: dynamic model fallback on 404,
  // precise error capture, hard timeout — and it never throws.
  async function callGemini(prompt, opts) {
    // Offline-first guardrails: feature flag + connectivity check up front
    if (!isGeminiEnabled()) return { ok: false, reason: 'no-key' };
    if (!isOnline()) return { ok: false, reason: 'offline' };

    const key = getGeminiKey();
    const cfg = Object.assign({ temperature: 0.2, maxOutputTokens: 4096 }, opts || {});
    let lastHttpError = null;

    for (const model of GEMINI_MODELS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), cfg.timeout || GEMINI_TIMEOUT_MS);
      try {
        const resp = await fetch(
          `${GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: cfg.temperature, maxOutputTokens: cfg.maxOutputTokens }
            })
          }
        );
        clearTimeout(timer);

        if (!resp.ok) {
          const err = await readGeminiErrorBody(resp);
          console.warn(`[Gemini] ${model} -> HTTP ${err.status}: ${err.message}`);
          if (err.status === 404) { lastHttpError = err; continue; } // retired model: clean fallback
          if (err.status === 400 || err.status === 403) return { ok: false, reason: 'bad-key', status: err.status };
          if (err.status === 429) return { ok: false, reason: 'quota', status: err.status };
          return { ok: false, reason: 'http', status: err.status, detail: err.message };
        }

        const data = await resp.json();
        const parts = ((((data || {}).candidates || [])[0] || {}).content || {}).parts || [];
        const text = (parts[0] && parts[0].text) ? String(parts[0].text).trim() : '';
        if (!text) return { ok: false, reason: 'empty' };
        return { ok: true, text, model };
      } catch (e) {
        clearTimeout(timer);
        if (e && e.name === 'AbortError') return { ok: false, reason: 'timeout' };
        return { ok: false, reason: 'network' };
      }
    }

    return { ok: false, reason: 'model-404', status: 404, detail: lastHttpError ? lastHttpError.message : '' };
  }

  // Honest, specific failure toasts — never the misleading
  // "check your internet connection" for an upstream 404.
  function toastGeminiFailure(res) {
    if (!res) return;
    switch (res.reason) {
      case 'no-key':  showToast('Add your Gemini API key first — AI features are optional.'); break;
      case 'bad-key': showToast('Gemini rejected the API key — get a fresh one at aistudio.google.com'); break;
      case 'quota':   showToast('Gemini quota exhausted — try again later.'); break;
      default: {
        const suffix = res.status ? ` (Google returned HTTP ${res.status})` : '';
        showToast(`Gemini AI feature failed${suffix}. Local features remain unaffected.`);
      }
    }
  }

  // Compact, privacy-preserving snapshot shared by all AI features:
  // date/type/category/counterparty/amount/fee — NEVER codes, phones or balances.
  function aiSnapshot(rows, limit) {
    return rows.slice(0, limit || 120).map(t => ({
      d: t.datetime || '',
      t: t.type || 'sent',
      c: t.category || 'shopping',
      p: (t.counterparty || '').slice(0, 40),
      a: Number(t.amount || 0),
      f: Number(t.cost || 0)
    }));
  }

  // --------------------------------------------------------
  // AI STATEMENT CSV (Gemini)
  // --------------------------------------------------------
  function initAiExport() {
    const keyInput = document.getElementById('geminiKeyInput');
    const aiBtn = document.getElementById('exportAiBtn');
    const aiLabel = document.getElementById('exportAiLabel');

    if (keyInput) {
      keyInput.value = localStorage.getItem(STORAGE_KEY_GEMINI) || '';
      keyInput.addEventListener('change', () => {
        localStorage.setItem(STORAGE_KEY_GEMINI, keyInput.value.trim());
        showToast(keyInput.value.trim() ? 'Gemini API key saved on this device.' : 'Gemini API key removed.');
      });
    }

    if (!aiBtn) return;

    aiBtn.addEventListener('click', async () => {
      if (!isGeminiEnabled()) {
        toastGeminiFailure({ reason: 'no-key' });
        if (keyInput) keyInput.focus();
        return;
      }
      if (!db.length) {
        showToast('No transactions to analyze yet. Sync your SMS inbox first.');
        return;
      }
      if (!isOnline()) {
        toastGeminiFailure({ reason: 'offline' });
        return;
      }

      const prompt =
        'You are a personal-finance CSV generator. Here is my M-PESA transaction ledger as JSON. ' +
        'Each entry: d=date&time, t=type, c=category, p=counterparty, a=amount KES, f=fee KES.\n' +
        JSON.stringify(aiSnapshot(db, 150)) +
        '\n\nProduce a UTF-8 CSV report with EXACTLY these sections in order:\n' +
        '1) Header row: Section,Month,Category,Transactions Count,Total (KSh),Share of Spend %,Insight\n' +
        '2) One row per category per calendar month summarized from the data (Section=Monthly)\n' +
        '3) Total rows per month (Section=Total)\n' +
        '4) A final overall row (Section=Overall)\n' +
        'The Insight column gets a short practical tip (max 12 words). ' +
        'Use plain numbers without thousands separators inside the CSV. ' +
        'Respond with ONLY the CSV content — no commentary, no markdown fences.';

      aiBtn.disabled = true;
      aiBtn.classList.add('btn-loading');
      if (aiLabel) aiLabel.textContent = 'Generating…';

      const res = await callGemini(prompt, { temperature: 0.2, maxOutputTokens: 4096 });

      aiBtn.disabled = false;
      aiBtn.classList.remove('btn-loading');
      if (aiLabel) aiLabel.textContent = 'Generate AI Report CSV';

      if (!res.ok) {
        toastGeminiFailure(res);
        return;
      }

      // Strip stray markdown fences the model may add
      let text = res.text.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
      if (!text || !/^["A-Za-z]/.test(text)) {
        showToast('Gemini returned an unusable response. Try again.');
        return;
      }
      await saveCsvEverywhere(`mpesa-ai-report-${todaySlug()}.csv`, text);
    });
  }

  // --------------------------------------------------------
  // FEES & FULIZA LEAKAGE AUDIT (30 days)
  // --------------------------------------------------------
  function leakageWindowRows() {
    const cutoff = Date.now() - 30 * 86400000;
    const rows = db.filter(t => Number(t.timestamp || 0) >= cutoff);
    return rows.length ? rows : db.slice(0, 200); // newest-first db; fall back to latest slice
  }

  // Offline fallback: plain local arithmetic on the parsed "Transaction cost"
  // fields and Fuliza-tagged entries. Always available — key or no key.
  function computeLocalLeakage(rows) {
    let transferFees = 0, airtimeFees = 0, fulizaFees = 0;
    rows.forEach(t => {
      if (t.type === 'received') return;
      const cost = Number(t.cost || 0);
      const isFuliza = /fuliza/i.test(t.counterparty || '') || t.type === 'fee';
      if (isFuliza) {
        fulizaFees += Number(t.amount || 0) + cost;
        return;
      }
      if (t.category === 'airtime') airtimeFees += cost;
      else transferFees += cost;
    });
    return { transferFees, airtimeFees, fulizaFees, total: transferFees + airtimeFees + fulizaFees };
  }

  function renderLeakageLocal(resultEl, rows, noteHtml) {
    const L = computeLocalLeakage(rows);
    resultEl.classList.add('is-open');
    resultEl.innerHTML =
      '<span class="ai-panel-badge ai-panel-badge--local">Local estimate · works offline</span>' +
      '<ul class="ai-panel-list">' +
      `<li><span>Transfer &amp; Paybill costs</span><strong>KSh ${formatKsh(L.transferFees)}</strong></li>` +
      `<li><span>Airtime purchase fees</span><strong>KSh ${formatKsh(L.airtimeFees)}</strong></li>` +
      `<li><span>Fuliza fees &amp; interest</span><strong>KSh ${formatKsh(L.fulizaFees)}</strong></li>` +
      '</ul>' +
      `<p class="ai-panel-total">Total 30-day leakage: <strong>KSh ${formatKsh(L.total)}</strong></p>` +
      (noteHtml || '');
  }

  function initLeakageAudit() {
    const btn = document.getElementById('leakageBtn');
    const label = document.getElementById('leakageLabel');
    const resultEl = document.getElementById('leakageResult');
    if (!btn || !resultEl) return;

    btn.addEventListener('click', async () => {
      if (!db.length) {
        showToast('No transactions yet — sync your SMS inbox first.');
        return;
      }
      const rows = leakageWindowRows();

      // Guardrails first: offline or no key -> instant local arithmetic,
      // the audit never hard-fails
      if (!isOnline() || !isGeminiEnabled()) {
        renderLeakageLocal(resultEl, rows,
          `<p class="ai-panel-note">${!isOnline() ? 'You are offline. ' : 'No Gemini key set. '}` +
          'Go online with a key for the full AI breakdown &amp; savings tips.</p>');
        return;
      }

      btn.disabled = true;
      btn.classList.add('btn-loading');
      if (label) label.textContent = 'Auditing with Gemini…';

      const prompt =
        'You are an M-PESA cost auditor. Below are my M-PESA transactions from roughly the last 30 days as JSON.\n' +
        'Each entry: d=date&time, t=type (sent/received/airtime/withdraw/fee), c=category, p=counterparty, a=amount KES, f=explicit transaction cost KES.\n' +
        JSON.stringify(aiSnapshot(rows, 150)) + '\n' +
        'TASKS:\n' +
        '1) Compute the TOTAL "leakage" — money spent purely on M-PESA charges: every f (send/Paybill/agent/ATM costs), Fuliza access fees & interest (p contains FULIZA or t=fee), and airtime purchase costs.\n' +
        '2) Give 2-4 short breakdown lines with KES amounts (Transaction costs · Fuliza fees/interest · Agent/ATM charges as applicable).\n' +
        '3) End with ONE concrete saving tip including an estimated KES saving for next month.\n' +
        'Format EXACTLY:\nTotal 30-day leakage: KES X\n• line\n• line\nTip: ...\n' +
        'Plain text only, under 90 words.';

      const res = await callGemini(prompt, { temperature: 0.15, maxOutputTokens: 700 });

      btn.disabled = false;
      btn.classList.remove('btn-loading');
      if (label) label.textContent = 'Audit My M-PESA Fees';

      if (res.ok) {
        resultEl.classList.add('is-open');
        resultEl.innerHTML =
          `<span class="ai-panel-badge ai-panel-badge--gemini">Gemini · ${escapeHtml(res.model)}</span>` +
          `<p class="ai-panel-text">${escapeHtml(res.text).replace(/\n/g, '<br>')}</p>`;
      } else {
        // Graceful degradation: local arithmetic, plus an honest toast
        renderLeakageLocal(resultEl, rows,
          '<p class="ai-panel-note">Gemini unreachable — computed locally from your parsed fee fields.</p>');
        toastGeminiFailure(res);
      }
    });
  }

  // --------------------------------------------------------
  // CHAT WITH YOUR WALLET (natural-language M-PESA querying)
  // --------------------------------------------------------
  function appendChatBubble(logEl, kind, text) {
    const div = document.createElement('div');
    div.className = 'chat-bubble chat-bubble--' + kind;
    div.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
    logEl.appendChild(div);
    while (logEl.children.length > 12) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
    return div;
  }

  function initWalletChat() {
    const logEl = document.getElementById('chatLog');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    if (!logEl || !input || !sendBtn) return;

    document.querySelectorAll('.ai-chip[data-suggest]').forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.getAttribute('data-suggest') || '';
        input.focus();
      });
    });

    async function ask() {
      const question = input.value.trim();
      if (!question) return;
      if (!db.length) {
        showToast('No transactions yet — sync your SMS inbox first.');
        return;
      }
      if (!isGeminiEnabled()) {
        toastGeminiFailure({ reason: 'no-key' });
        return;
      }
      if (!isOnline()) {
        toastGeminiFailure({ reason: 'offline' });
        return;
      }

      input.value = '';
      appendChatBubble(logEl, 'user', question);
      // Apple-style typing indicator — three soft-pulsing dots in the AI
      // bubble (no more spinning send icon).
      const thinking = appendChatBubble(logEl, 'ai', '…');
      thinking.classList.add('chat-bubble--thinking');
      thinking.innerHTML = '<span class="chat-typing"><i></i><i></i><i></i></span>';
      thinking.setAttribute('aria-label', 'Waiting for Gemini');

      sendBtn.disabled = true;

      const prompt =
        'You are the user’s private M-PESA wallet assistant (Kenya, currency KES). ' +
        'Answer the question using ONLY the JSON transaction history below. ' +
        'Each entry: d=date&time, t=type, c=category, p=counterparty, a=amount KES, f=fee KES.\n' +
        'Rules: compute totals exactly; format amounts like "KES 1,250"; dates in d are DD/MM/YY HH:MM AM/PM; ' +
        'if several people share a first name, say which names matched; if the data is insufficient, state plainly what is missing. ' +
        'Max 100 words. Plain text only.\n' +
        'HISTORY: ' + JSON.stringify(aiSnapshot(db, 140)) + '\nQUESTION: ' + question;

      const res = await callGemini(prompt, { temperature: 0.25, maxOutputTokens: 800 });

      sendBtn.disabled = false;
      thinking.classList.remove('chat-bubble--thinking');

      if (res.ok) {
        thinking.innerHTML = escapeHtml(res.text).replace(/\n/g, '<br>');
      } else {
        thinking.textContent = 'Gemini AI feature failed. Local features remain unaffected.';
        thinking.classList.add('chat-bubble--error');
        toastGeminiFailure(res);
      }
    }

    sendBtn.addEventListener('click', ask);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
  }

  // --------------------------------------------------------
  // AI umbrella: badge wiring + all optional features
  // --------------------------------------------------------
  function initAiFeatures() {
    updateAiOfflineBadge();
    window.addEventListener('online', updateAiOfflineBadge);
    window.addEventListener('offline', updateAiOfflineBadge);
    initAiExport();
    initLeakageAudit();
    initWalletChat();
  }

  // ========================================================
  // PROFILE PHOTO (upload → crop circle → localStorage)
  // ========================================================
  let currentInitials = 'MU';

  function renderAvatar() {
    const stored = localStorage.getItem(STORAGE_KEY_PHOTO);
    const els = [document.getElementById('avatarBtn'), document.getElementById('settingsAvatarPreview')];
    els.forEach(el => {
      if (!el) return;
      if (stored) {
        el.innerHTML = `<img src="${stored}" alt="Profile photo" />`;
      } else {
        el.textContent = currentInitials;
      }
    });
    const removeBtn = document.getElementById('removePhotoBtn');
    if (removeBtn) removeBtn.style.display = stored ? 'inline-flex' : 'none';
  }

  function initProfilePhoto() {
    const photoInput = document.getElementById('photoInput');
    const changeBtn = document.getElementById('changePhotoBtn');
    const removeBtn = document.getElementById('removePhotoBtn');
    const modal = document.getElementById('photoModal');

    // Header avatar is display-only (v4.4): tapping it does nothing.
    // Changing the photo is reserved for Settings > Profile Photo.
    if (changeBtn && photoInput) {
      changeBtn.addEventListener('click', () => photoInput.click());
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY_PHOTO);
        renderAvatar();
        showToast('Profile photo removed.');
      });
    }

    if (!photoInput || !modal) return;

    // --- Crop session state ---
    const viewport = document.getElementById('cropViewport');
    const img = document.getElementById('cropImage');
    const zoom = document.getElementById('cropZoom');
    const saveBtn = document.getElementById('cropSaveBtn');
    const cancelBtn = document.getElementById('cropCancelBtn');
    const V = 240; // viewport css px (must match .crop-viewport)
    let crop = null; // {nw, nh, base, scale, cx, cy}

    function applyTransform() {
      if (!crop) return;
      img.style.transform = `translate(${crop.cx}px, ${crop.cy}px) scale(${crop.scale})`;
    }

    function clampPan() {
      if (!crop) return;
      const w = crop.nw * crop.scale;
      const h = crop.nh * crop.scale;
      crop.cx = Math.min(0, Math.max(V - w, crop.cx));
      crop.cy = Math.min(0, Math.max(V - h, crop.cy));
    }

    photoInput.addEventListener('change', () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        showToast('Please choose an image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const probe = new Image();
        probe.onload = () => {
          crop = {
            nw: probe.naturalWidth,
            nh: probe.naturalHeight,
            base: Math.max(V / probe.naturalWidth, V / probe.naturalHeight),
            scale: 1, cx: 0, cy: 0
          };
          crop.scale = crop.base;
          crop.cx = (V - crop.nw * crop.scale) / 2;
          crop.cy = (V - crop.nh * crop.scale) / 2;
          img.src = dataUrl;
          if (zoom) zoom.value = 100;
          applyTransform();
          clampPan();
          modal.classList.add('is-open');
        };
        probe.onerror = () => showToast('Could not read that image.');
        probe.src = dataUrl;
      };
      reader.readAsDataURL(file);
      photoInput.value = '';
    });

    // Drag to pan (pointer events cover mouse + touch)
    let dragging = null;
    if (viewport) {
      viewport.addEventListener('pointerdown', e => {
        if (!crop) return;
        dragging = { x: e.clientX, y: e.clientY, cx: crop.cx, cy: crop.cy };
        viewport.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      viewport.addEventListener('pointermove', e => {
        if (!dragging || !crop) return;
        crop.cx = dragging.cx + (e.clientX - dragging.x);
        crop.cy = dragging.cy + (e.clientY - dragging.y);
        clampPan();
        applyTransform();
      });
      const stop = () => { dragging = null; };
      viewport.addEventListener('pointerup', stop);
      viewport.addEventListener('pointercancel', stop);
    }

    // Zoom slider (100% = cover viewport), anchored at viewport center
    if (zoom) {
      zoom.addEventListener('input', () => {
        if (!crop) return;
        const newScale = crop.base * (Number(zoom.value) / 100);
        const midX = (V / 2 - crop.cx) / crop.scale; // content point at viewport center
        const midY = (V / 2 - crop.cy) / crop.scale;
        crop.scale = newScale;
        crop.cx = V / 2 - midX * newScale;
        crop.cy = V / 2 - midY * newScale;
        clampPan();
        applyTransform();
      });
    }

    function closeModal() {
      modal.classList.remove('is-open');
      crop = null;
      img.removeAttribute('src');
    }

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!crop) return;
        const OUT = 256;
        const canvas = document.createElement('canvas');
        canvas.width = OUT;
        canvas.height = OUT;
        const ctx = canvas.getContext('2d');
        const f = OUT / V;
        ctx.beginPath();
        ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, crop.cx * f, crop.cy * f, crop.nw * crop.scale * f, crop.nh * crop.scale * f);
        try {
          const dataUrl = canvas.toDataURL('image/png');
          localStorage.setItem(STORAGE_KEY_PHOTO, dataUrl);
          renderAvatar();
          showToast('Profile photo saved.');
        } catch (e) {
          showToast('Not enough storage to keep that photo.');
        }
        closeModal();
      });
    }

    renderAvatar();
  }

  function showToast(msg) {
    const t = document.getElementById('appToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 3500);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Self-test with canonical Safaricom SMS formats
  function runSelfTests() {
    const test1 = 'UHK1A2B3C4 Confirmed. Ksh500.00 sent to JOHN DOE 0712345678 on 20/9/26 at 11:50 AM. New M-PESA balance is Ksh2,000.00. Transaction cost, Ksh7.00.';
    const p1 = parseMpesaMessage(test1);
    const pass1 = p1 && p1.code === 'UHK1A2B3C4' && p1.amount === 500 && p1.balance === 2000 && p1.cost === 7;

    const test2 = 'UHK1A2B3C4 Confirmed. Ksh850.00 paid to JAVA HOUSE. on 20/9/26 at 12:42 PM.';
    const p2 = parseMpesaMessage(test2);
    const pass2 = p2 && p2.code === 'UHK1A2B3C4' && p2.amount === 850 && p2.category === 'food';

    const test3 = 'UHK1A2B3C4 Confirmed. You have received Ksh2,000.00 from JANE DOE 0722000000 on 20/9/26 at 9:01 AM.';
    const p3 = parseMpesaMessage(test3);
    const pass3 = p3 && p3.code === 'UHK1A2B3C4' && p3.amount === 2000 && p3.type === 'received' && p3.category === 'income';

    if (!pass1 || !pass2 || !pass3) {
      console.warn('Parser self-test check failed');
    }
  }

  // --- INITIALIZE ---
  document.addEventListener('DOMContentLoaded', () => {
    // Isolated boot steps: an exception in one initializer can never
    // silently starve the rest (v3.1.1 hardening).
    [
      runSelfTests, loadDatabase, initTheme, initUser, initProfilePhoto,
      renderAllViews, initTabs, initSettingsActions, initAiFeatures,
      initInboxSync, initPermissionScreen
    ].forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.warn('Init step failed:', fn && fn.name, e && e.message);
      }
    });
  });

})();
