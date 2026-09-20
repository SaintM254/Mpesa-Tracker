(function () {
  'use strict';

  // ========================================================
  // M-PESA TRACKER v2.0.0 — OFFLINE M-PESA SMS EXPENSE ENGINE
  // Zero-mock: the app always starts on a clean, empty ledger.
  // ========================================================

  const STORAGE_KEY_TX = 'mpesa_tracker_tx_db_v4'; // fresh namespace: no legacy mock data
  const STORAGE_KEY_THEME = 'mpesa_tracker_theme';
  const STORAGE_KEY_USER = 'mpesa_tracker_user_name';
  const STORAGE_KEY_RULES = 'mpesa_tracker_cat_rules';
  const STORAGE_KEY_PERM_DISMISSED = 'mpesa_tracker_perm_dismissed';

  const DEFAULT_USER_NAME = 'M-PESA User';

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
        cost: null
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
    const costMatch = body.match(/cost[,\s]+(?:Ksh|KSh|KES)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (costMatch) {
      cost = parseFloat(costMatch[1].replace(/,/g, ''));
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

    const isReceived = /received|from|cashback/i.test(body) && !/sent to|paid to/i.test(body);
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
      const toMatch = body.match(/(?:paid to|sent to)\s+([A-Z0-9\s.,'&-]+?)(?:\s+on|\s+\d{4,}|\s+for|\s+New|\.|$)/i);
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
      cost
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

  async function scanMpesaInbox() {
    const plugin = getSmsPlugin();
    if (!plugin || inboxScanInProgress) return 0;
    inboxScanInProgress = true;
    try {
      const res = await plugin.readMpesaInbox({ limit: 500 });
      if (res && res.messages && Array.isArray(res.messages)) {
        let imported = 0;
        res.messages.forEach(msg => {
          const parsed = parseMpesaMessage(msg.body, msg.timestamp);
          if (parsed) {
            if (insertTransaction(parsed)) {
              imported++;
            }
          }
        });
        return imported;
      }
    } catch (e) {
      // Never write message content to logs
    } finally {
      inboxScanInProgress = false;
    }
    return 0;
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

    // Transaction List
    const listEl = document.getElementById('dashboardTxList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const recents = db.slice(0, 15);
    if (!recents.length) {
      listEl.innerHTML = '<li class="empty-state">No M-PESA transactions yet. Grant SMS access or use Settings → Sync SMS Inbox.</li>';
      return;
    }

    recents.forEach(tx => {
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

      // Allow tap to change category
      li.addEventListener('click', () => openCategoryPicker(tx));
      listEl.appendChild(li);
    });
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
    if (!barsEl) return;

    // Build the last 7 days ending today
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({
        label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
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

    const maxTotal = Math.max(...days.map(d => d.total), 0);
    barsEl.innerHTML = '';
    days.forEach(day => {
      const span = document.createElement('span');
      const pct = maxTotal === 0 ? 6 : Math.max(6, Math.round((day.total / maxTotal) * 100));
      span.style.setProperty('--h', pct + '%');
      span.title = `${day.label}: KSh ${formatKsh(day.total)}`;
      barsEl.appendChild(span);
    });
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
          showToast('SMS permission granted. Importing M-PESA messages...');
          listenForLiveSms();
          const count = await scanMpesaInbox();
          renderAllViews();
          showToast(`Imported ${count} M-PESA transaction${count === 1 ? '' : 's'}.`);
        } else {
          showToast('Permission not granted. You can still paste SMS messages manually.');
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

      // Busy state
      syncBtn.disabled = true;
      if (syncLabel) syncLabel.textContent = 'Syncing…';
      if (syncIcon) syncIcon.classList.add('ic-spin');

      try {
        const count = await scanMpesaInbox();
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
  // PARSE MANUAL SMS TAB
  // ========================================================
  function initSmsTab() {
    const parseBtn = document.getElementById('parseSmsBtn');
    const inputEl = document.getElementById('smsInputText');
    const sample1Btn = document.getElementById('sample1Btn');
    const sample2Btn = document.getElementById('sample2Btn');
    const sample3Btn = document.getElementById('sample3Btn');

    if (sample1Btn && inputEl) {
      sample1Btn.addEventListener('click', () => {
        inputEl.value = 'UHK1A2B3C4 Confirmed. Ksh500.00 sent to JOHN DOE 0712345678 on 20/9/26 at 11:50 AM. New M-PESA balance is Ksh2,000.00. Transaction cost, Ksh7.00.';
        inputEl.focus();
      });
    }

    if (sample2Btn && inputEl) {
      sample2Btn.addEventListener('click', () => {
        inputEl.value = 'UHK1A2B3C4 Confirmed. Ksh850.00 paid to JAVA HOUSE. on 20/9/26 at 12:42 PM.';
        inputEl.focus();
      });
    }

    if (sample3Btn && inputEl) {
      sample3Btn.addEventListener('click', () => {
        inputEl.value = 'UHK1A2B3C4 Confirmed. You have received Ksh2,000.00 from JANE DOE 0722000000 on 20/9/26 at 9:01 AM.';
        inputEl.focus();
      });
    }

    if (parseBtn && inputEl) {
      parseBtn.addEventListener('click', () => {
        const text = inputEl.value.trim();
        if (!text) {
          showToast('Please paste an M-PESA SMS text first.');
          return;
        }

        const parsed = parseMpesaMessage(text, Date.now());
        if (!parsed) {
          showToast('Could not find 10-character transaction code. Please check SMS.');
          return;
        }

        const added = insertTransaction(parsed);
        renderAllViews();
        inputEl.value = '';

        if (added) {
          showToast(`Saved: ${parsed.type === 'received' ? '+' : '−'}KSh ${formatKsh(parsed.amount)} (${parsed.counterparty})`);
        } else {
          showToast(`Transaction ${parsed.code} was already in your database (no duplicate added).`);
        }

        // Switch to dashboard
        const dashBtn = document.querySelector('[data-tab="view-dashboard"]');
        if (dashBtn) dashBtn.click();
      });
    }
  }

  // ========================================================
  // THEME & USER SETTINGS
  // ========================================================
  function initTheme() {
    const html = document.documentElement;

    function apply(theme) {
      html.setAttribute('data-theme', theme);
      const sw = document.getElementById('themeSwitch');
      if (sw) sw.checked = theme === 'dark';
    }

    let t = localStorage.getItem(STORAGE_KEY_THEME);
    if (!t) {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    apply(t);

    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        apply(next);
        localStorage.setItem(STORAGE_KEY_THEME, next);
      });
    }

    const sw = document.getElementById('themeSwitch');
    if (sw) {
      sw.addEventListener('change', () => {
        const next = sw.checked ? 'dark' : 'light';
        apply(next);
        localStorage.setItem(STORAGE_KEY_THEME, next);
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
      const initials = safe.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'MU';
      if (avatarEl) avatarEl.textContent = initials;
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
      items.forEach(btn => btn.classList.toggle('is-active', btn.getAttribute('data-tab') === targetId));
      views.forEach(v => v.classList.toggle('is-active', v.id === targetId));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    items.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    const seeAll = document.getElementById('seeAllBtn');
    if (seeAll) seeAll.addEventListener('click', () => switchTab('view-analytics'));
  }

  function initSettingsActions() {
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (!db.length) {
          showToast('No transactions to export.');
          return;
        }

        let csv = 'Code,Type,Category,Counterparty,Amount (KSh),Balance (KSh),Cost (KSh),Date\n';
        db.forEach(t => {
          csv += `"${t.code || ''}","${t.type || ''}","${t.category || ''}","${(t.counterparty || '').replace(/"/g, '""')}",${t.amount || 0},${t.balance !== null ? t.balance : ''},${t.cost !== null ? t.cost : ''},"${t.datetime || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mpesa-statement-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV statement exported.');
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
    runSelfTests();
    loadDatabase();
    initTheme();
    initUser();
    renderAllViews();
    initTabs();
    initSmsTab();
    initSettingsActions();
    initInboxSync();
    initPermissionScreen();
  });

})();
