(function () {
  'use strict';

  // ========================================================
  // M-PESA TRACKER — OFFLINE M-PESA SMS EXPENSE ENGINE
  // ========================================================

  const STORAGE_KEY_TX = 'mpesa_tracker_tx_db_v3';
  const STORAGE_KEY_THEME = 'mpesa_tracker_theme';
  const STORAGE_KEY_USER = 'mpesa_tracker_user_name';
  const STORAGE_KEY_RULES = 'mpesa_tracker_cat_rules';
  const STORAGE_KEY_PERM_DISMISSED = 'mpesa_tracker_perm_dismissed';

  // Available Categories (Solid rounded Material Icons Round)
  const CATEGORIES = {
    food:          { key: 'food',          name: 'Food & drinks',   icon: 'restaurant',     class: 'tx-icon--food',       color: '#ef6c00' },
    transport:     { key: 'transport',     name: 'Transport',       icon: 'directions_bus', class: 'tx-icon--transport',  color: '#1e88e5' },
    airtime:       { key: 'airtime',       name: 'Airtime',         icon: 'phone_android',  class: 'tx-icon--airtime',    color: '#8e24aa' },
    utilities:     { key: 'utilities',     name: 'Utilities',       icon: 'bolt',           class: 'tx-icon--utilities',  color: '#fbc02d' },
    shopping:      { key: 'shopping',      name: 'Shopping',        icon: 'shopping_bag',   class: 'tx-icon--shopping',   color: '#d81b60' },
    rent:          { key: 'rent',          name: 'Rent & housing',  icon: 'home',           class: 'tx-icon--rent',       color: '#00897b' },
    savings:       { key: 'savings',       name: 'Savings',         icon: 'savings',        class: 'tx-icon--savings',    color: '#3949ab' },
    income:        { key: 'income',        name: 'Income',          icon: 'arrow_downward', class: 'tx-icon--received',   color: '#2e7d32' },
    needs_review:  { key: 'needs_review',  name: 'Needs review',    icon: 'help_outline',   class: 'tx-icon--review',     color: '#78909c' }
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

  // Seed sample transactions if DB is completely fresh
  const SEED_TRANSACTIONS = [
    {
      code: 'UHK1A2B3C1',
      amount: 850,
      type: 'sent',
      category: 'food',
      counterparty: 'Java House — Westlands',
      datetime: 'Today 12:42 PM',
      timestamp: Date.now() - (2 * 3600 * 1000),
      balance: 4120,
      cost: 0
    },
    {
      code: 'UHK1A2B3C2',
      amount: 100,
      type: 'sent',
      category: 'transport',
      counterparty: 'Matatu · Kenyatta Ave',
      datetime: 'Today 08:15 AM',
      timestamp: Date.now() - (6 * 3600 * 1000),
      balance: 4970,
      cost: 0
    },
    {
      code: 'UHK1A2B3C3',
      amount: 200,
      type: 'airtime',
      category: 'airtime',
      counterparty: 'Safaricom airtime',
      datetime: 'Yesterday 19:08',
      timestamp: Date.now() - (24 * 3600 * 1000),
      balance: 5070,
      cost: 0
    },
    {
      code: 'UHK1A2B3C4',
      amount: 45000,
      type: 'received',
      category: 'income',
      counterparty: 'Salary — Acme Ltd',
      datetime: 'Yesterday 09:01',
      timestamp: Date.now() - (30 * 3600 * 1000),
      balance: 5270,
      cost: 0
    },
    {
      code: 'UHK1A2B3C5',
      amount: 1500,
      type: 'sent',
      category: 'utilities',
      counterparty: 'KPLC prepaid tokens',
      datetime: '02 Sep 16:20',
      timestamp: Date.now() - (5 * 86400 * 1000),
      balance: 38270,
      cost: 23
    },
    {
      code: 'UHK1A2B3C6',
      amount: 3450,
      type: 'sent',
      category: 'shopping',
      counterparty: 'Naivas Supermarket',
      datetime: '01 Sep 14:10',
      timestamp: Date.now() - (7 * 86400 * 1000),
      balance: 39770,
      cost: 0
    }
  ];

  // In-Memory App State
  let db = [];
  let userCategoryRules = {};

  // ========================================================
  // PERSISTENCE & LOCAL DATABASE (Indexed by code for deduplication)
  // ========================================================
  function loadDatabase() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TX);
      if (stored) {
        db = JSON.parse(stored);
      } else {
        db = [...SEED_TRANSACTIONS];
        saveDatabase();
      }
    } catch (_) {
      db = [...SEED_TRANSACTIONS];
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
    if (!plugin) return 0;
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
    }
    return 0;
  }

  function listenForLiveSms() {
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
    } catch (_) {}
  }

  // ========================================================
  // UI RENDERING ENGINE
  // ========================================================
  function renderAllViews() {
    renderDashboard();
    renderAnalytics();
    renderCategoriesGrid();
  }

  function renderDashboard() {
    let totalExpense = 0;
    let totalIncome = 0;

    db.forEach(t => {
      if (t.type === 'received') {
        totalIncome += Number(t.amount || 0);
      } else {
        totalExpense += Number(t.amount || 0);
      }
    });

    const net = totalIncome - totalExpense;

    // Balance Card
    const totalSpentEl = document.getElementById('dashTotalSpent');
    if (totalSpentEl) totalSpentEl.innerHTML = `KSh <span>${formatKsh(totalExpense)}</span>`;

    const netEl = document.getElementById('dashNetTotal');
    if (netEl) netEl.textContent = `Net: ${net >= 0 ? '+' : '−'}KSh ${formatKsh(Math.abs(net))}`;

    // Mini Stats
    const miniIncome = document.getElementById('miniIncome');
    if (miniIncome) miniIncome.textContent = `+KSh ${formatKsh(totalIncome)}`;

    const miniExpenses = document.getElementById('miniExpenses');
    if (miniExpenses) miniExpenses.textContent = `−KSh ${formatKsh(totalExpense)}`;

    const miniCount = document.getElementById('miniCount');
    if (miniCount) miniCount.textContent = `${db.length} items`;

    // Transaction List
    const listEl = document.getElementById('dashboardTxList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const recents = db.slice(0, 15);
    if (!recents.length) {
      listEl.innerHTML = '<li class="empty-state">No M-PESA transactions found. Scan your inbox or paste an SMS.</li>';
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
          <span class="material-icons-round">${cat.icon}</span>
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

  function renderAnalytics() {
    let totalExpense = 0;
    let totalIncome = 0;
    const catTotals = {};

    db.forEach(t => {
      if (t.type === 'received') {
        totalIncome += Number(t.amount || 0);
      } else {
        totalExpense += Number(t.amount || 0);
        catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount || 0);
      }
    });

    const net = totalIncome - totalExpense;

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
            <span class="tx-icon ${cat.class} cat-bar-badge"><span class="material-icons-round">${cat.icon}</span></span>
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
        <div class="tx-icon ${c.class}"><span class="material-icons-round">${c.icon}</span></div>
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
        <span class="tx-icon ${c.class} cat-bar-badge"><span class="material-icons-round">${c.icon}</span></span>
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
  // PERMISSION MODAL & ONBOARDING
  // ========================================================
  function initPermissionScreen() {
    const banner = document.getElementById('permBanner');
    const modal = document.getElementById('permModal');
    const grantBtn = document.getElementById('grantPermBtn');
    const scanBtn = document.getElementById('scanInboxBtn');
    const bannerScanBtn = document.getElementById('bannerScanBtn');
    const bannerDismissBtn = document.getElementById('bannerDismissBtn');
    const modalCloseBtn = document.getElementById('permModalClose');

    const plugin = getSmsPlugin();

    // Check permissions and show friendly prompt
    async function checkAndPrompt() {
      if (!plugin) {
        if (banner) banner.style.display = 'none';
        return;
      }

      const status = await checkNativeSmsPermissions();
      if (!status.granted) {
        const dismissed = localStorage.getItem(STORAGE_KEY_PERM_DISMISSED);
        if (!dismissed && modal) {
          modal.classList.add('is-open');
        } else if (banner) {
          banner.style.display = 'flex';
        }
      } else {
        if (banner) banner.style.display = 'none';
        if (modal) modal.classList.remove('is-open');
        listenForLiveSms();
      }
    }

    if (grantBtn) {
      grantBtn.addEventListener('click', async () => {
        if (modal) modal.classList.remove('is-open');
        const granted = await requestNativeSmsPermissions();
        if (granted) {
          showToast('SMS permission granted. Scanning M-PESA messages...');
          listenForLiveSms();
          const count = await scanMpesaInbox();
          renderAllViews();
          showToast(`Imported ${count} M-PESA transactions`);
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

    if (scanBtn) {
      scanBtn.addEventListener('click', async () => {
        if (!plugin) {
          showToast('SMS reading is available inside the Android APK.');
          return;
        }
        const status = await checkNativeSmsPermissions();
        if (!status.granted) {
          if (modal) modal.classList.add('is-open');
          return;
        }
        showToast('Scanning inbox for M-PESA messages...');
        const count = await scanMpesaInbox();
        renderAllViews();
        showToast(`Scan complete: ${count} new M-PESA transactions imported.`);
      });
    }

    checkAndPrompt();
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

  function initUser() {
    const savedName = localStorage.getItem(STORAGE_KEY_USER) || 'Brian Otieno';
    const nameEl = document.getElementById('userGreeting');
    const avatarEl = document.getElementById('avatarBtn');
    const inputEl = document.getElementById('nameInput');

    function updateName(name) {
      const safe = name.trim() || 'Brian Otieno';
      if (nameEl) nameEl.textContent = safe;
      if (inputEl) inputEl.value = safe;
      const initials = safe.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'BO';
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

    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset transactions to default sample state?')) {
          db = [...SEED_TRANSACTIONS];
          userCategoryRules = { ...DEFAULT_RULES };
          saveDatabase();
          saveRules();
          renderAllViews();
          showToast('Demo data restored.');
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

  // Self-test with user-provided examples
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
    initPermissionScreen();
  });

})();
