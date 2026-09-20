(function () {
  'use strict';

  // ========================================================
  // M-PESA TRACKER — NATIVE WEBVIEW APP ENGINE
  // ========================================================

  const STORAGE_KEY_TX = 'mpesa_tracker_transactions_v2';
  const STORAGE_KEY_THEME = 'mpesa-tracker-theme';
  const STORAGE_KEY_USER = 'mpesa_tracker_user_name';

  // Seed default transactions matching the screenshot exactly
  const DEFAULT_TRANSACTIONS = [
    {
      id: 'tx-1',
      code: 'RK48A109K1',
      type: 'sent',
      category: 'food',
      merchant: 'Java House — Westlands',
      meta: 'Food & drinks · Today 12:42',
      amount: 850,
      balance: 4120,
      date: '2026-09-20T12:42:00'
    },
    {
      id: 'tx-2',
      code: 'RK47C882L0',
      type: 'sent',
      category: 'transport',
      merchant: 'Matatu · Kenyatta Ave',
      meta: 'Transport · Today 08:15',
      amount: 100,
      balance: 4970,
      date: '2026-09-20T08:15:00'
    },
    {
      id: 'tx-3',
      code: 'RK45Z199M2',
      type: 'sent',
      category: 'airtime',
      merchant: 'Safaricom airtime',
      meta: 'Airtime · Yesterday 19:08',
      amount: 200,
      balance: 5070,
      date: '2026-09-19T19:08:00'
    },
    {
      id: 'tx-4',
      code: 'RK44Y012N8',
      type: 'received',
      category: 'income',
      merchant: 'Salary — Acme Ltd',
      meta: 'Income · Yesterday 09:01',
      amount: 45000,
      balance: 5270,
      date: '2026-09-19T09:01:00'
    },
    {
      id: 'tx-5',
      code: 'RK42P993Q5',
      type: 'sent',
      category: 'utilities',
      merchant: 'KPLC prepaid tokens',
      meta: 'Utilities · 02 Sep',
      amount: 1500,
      balance: 38270,
      date: '2026-09-02T16:20:00'
    },
    {
      id: 'tx-6',
      code: 'RK39B118W4',
      type: 'sent',
      category: 'shopping',
      merchant: 'Naivas Supermarket',
      meta: 'Shopping · 01 Sep',
      amount: 3450,
      balance: 39770,
      date: '2026-09-01T14:10:00'
    },
    {
      id: 'tx-7',
      code: 'RK37K441R7',
      type: 'sent',
      category: 'rent',
      merchant: 'Landlord — Apt 4B',
      meta: 'Rent & housing · 01 Sep',
      amount: 8720,
      balance: 43220,
      date: '2026-09-01T08:00:00'
    }
  ];

  const CATEGORIES = {
    food:       { name: 'Food & drinks', icon: 'restaurant', class: 'tx-icon--food', color: '#ef6c00' },
    transport:  { name: 'Transport',     icon: 'directions_bus', class: 'tx-icon--transport', color: '#1e88e5' },
    utilities:  { name: 'Utilities',     icon: 'bolt', class: 'tx-icon--utilities', color: '#fbc02d' },
    airtime:    { name: 'Airtime',       icon: 'phone_android', class: 'tx-icon--airtime', color: '#8e24aa' },
    shopping:   { name: 'Shopping',      icon: 'shopping_bag', class: 'tx-icon--shopping', color: '#d81b60' },
    rent:       { name: 'Rent',          icon: 'home', class: 'tx-icon--rent', color: '#00897b' },
    savings:    { name: 'Savings',       icon: 'savings', class: 'tx-icon--savings', color: '#3949ab' },
    income:     { name: 'Income',        icon: 'arrow_downward', class: 'tx-icon--received', color: '#2e7d32' }
  };

  // State
  let transactions = [];

  function loadTransactions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TX);
      if (stored) {
        transactions = JSON.parse(stored);
      } else {
        transactions = [...DEFAULT_TRANSACTIONS];
        saveTransactions();
      }
    } catch (_) {
      transactions = [...DEFAULT_TRANSACTIONS];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
    } catch (_) {}
  }

  // --- THEME ---
  const html = document.documentElement;

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    const sw = document.getElementById('themeSwitch');
    if (sw) sw.checked = theme === 'dark';
  }

  function initTheme() {
    let t = localStorage.getItem(STORAGE_KEY_THEME);
    if (!t) {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyTheme(t);

    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(STORAGE_KEY_THEME, next);
      });
    }

    const sw = document.getElementById('themeSwitch');
    if (sw) {
      sw.addEventListener('change', () => {
        const next = sw.checked ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem(STORAGE_KEY_THEME, next);
      });
    }
  }

  // --- USER PROFILE ---
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

  // --- FORMATTERS ---
  function formatKsh(amt) {
    return Number(amt || 0).toLocaleString('en-KE');
  }

  // --- RENDER DASHBOARD ---
  function renderDashboard() {
    const listEl = document.getElementById('dashboardTxList');
    if (!listEl) return;

    let totalExpense = 0;
    let totalIncome = 0;

    transactions.forEach(t => {
      if (t.type === 'received') {
        totalIncome += Number(t.amount || 0);
      } else {
        totalExpense += Number(t.amount || 0);
      }
    });

    const net = totalIncome - totalExpense;

    // Update balance card
    const totalSpentEl = document.getElementById('dashTotalSpent');
    if (totalSpentEl) totalSpentEl.innerHTML = `KSh <span>${formatKsh(totalExpense)}</span>`;

    const netEl = document.getElementById('dashNetTotal');
    if (netEl) netEl.textContent = `Net: ${net >= 0 ? '+' : '−'}KSh ${formatKsh(Math.abs(net))}`;

    const miniIncome = document.getElementById('miniIncome');
    if (miniIncome) miniIncome.textContent = `+KSh ${formatKsh(totalIncome)}`;

    const miniExpenses = document.getElementById('miniExpenses');
    if (miniExpenses) miniExpenses.textContent = `−KSh ${formatKsh(totalExpense)}`;

    const miniCount = document.getElementById('miniCount');
    if (miniCount) miniCount.textContent = `${transactions.length} items`;

    // Render Recent Transactions
    listEl.innerHTML = '';
    const recents = transactions.slice(0, 6);

    recents.forEach(tx => {
      const cat = CATEGORIES[tx.category] || CATEGORIES.shopping;
      const li = document.createElement('li');
      li.className = 'tx';

      const isIn = tx.type === 'received';
      const sign = isIn ? '+' : '−';
      const amtClass = isIn ? 'tx-amount--in' : 'tx-amount--out';

      li.innerHTML = `
        <span class="tx-icon ${cat.class}">
          <span class="material-icons-round">${cat.icon}</span>
        </span>
        <div class="tx-body">
          <p class="tx-title">${escapeHtml(tx.merchant)}</p>
          <p class="tx-meta">${escapeHtml(tx.meta || (cat.name + ' · ' + (tx.code || '')))}</p>
        </div>
        <div class="tx-amount ${amtClass}">${sign} KSh ${formatKsh(tx.amount)}</div>
      `;
      listEl.appendChild(li);
    });

    // Update Analytics view as well
    renderAnalytics(totalIncome, totalExpense, net);
  }

  function renderAnalytics(income, expenses, net) {
    const totalEl = document.getElementById('analyticsTotal');
    if (totalEl) totalEl.textContent = `KSh ${formatKsh(expenses)}`;

    const inEl = document.getElementById('analyticsIn');
    if (inEl) inEl.textContent = `KSh ${formatKsh(income)}`;

    const outEl = document.getElementById('analyticsOut');
    if (outEl) outEl.textContent = `KSh ${formatKsh(expenses)}`;

    const netEl = document.getElementById('analyticsNet');
    if (netEl) netEl.textContent = `${net >= 0 ? '+' : '−'}KSh ${formatKsh(Math.abs(net))}`;

    // Category breakdown
    const barsList = document.getElementById('categoryBarsList');
    if (!barsList) return;
    barsList.innerHTML = '';

    const catTotals = {};
    transactions.forEach(tx => {
      if (tx.type !== 'received') {
        catTotals[tx.category] = (catTotals[tx.category] || 0) + Number(tx.amount || 0);
      }
    });

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
            ${cat.name}
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
      barsList.innerHTML = '<p class="empty-hint">No expense data recorded yet.</p>';
    }
  }

  // --- RENDER CATEGORIES TAB ---
  function renderCategoriesTab() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.entries(CATEGORIES).forEach(([key, c]) => {
      const count = transactions.filter(t => t.category === key).length;
      const sum = transactions.filter(t => t.category === key).reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
        <span class="tx-icon ${c.class}"><span class="material-icons-round">${c.icon}</span></span>
        <h4>${c.name}</h4>
        <p class="category-meta">${count} item${count === 1 ? '' : 's'}</p>
        <p class="category-total">KSh ${formatKsh(sum)}</p>
      `;
      grid.appendChild(card);
    });
  }

  // --- TAB NAVIGATION ---
  function initTabs() {
    const dock = document.getElementById('bottomDock');
    if (!dock) return;

    const items = dock.querySelectorAll('.dock-item');
    const views = document.querySelectorAll('.app-tab-view');

    function switchTab(targetId) {
      items.forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-tab') === targetId);
      });
      views.forEach(v => {
        v.classList.toggle('is-active', v.id === targetId);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    items.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    const seeAll = document.getElementById('seeAllBtn');
    if (seeAll) {
      seeAll.addEventListener('click', () => switchTab('view-analytics'));
    }
  }

  // --- SMS PARSING ENGINE ---
  function parseMpesaSms(body) {
    if (!body || typeof body !== 'string') return null;
    const clean = body.trim();

    // 1. Reference Code
    const codeMatch = clean.match(/\b([A-Z0-9]{10})\b/);
    const code = codeMatch ? codeMatch[1] : ('SIM' + Date.now().toString().slice(-7));

    // 2. Amount: "Ksh850.00" or "Ksh 850.00"
    const amtMatch = clean.match(/(?:Ksh|KSh|KES)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (!amtMatch) return null;
    const amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    // 3. Balance: "New M-PESA balance is Ksh4,120.00"
    const balMatch = clean.match(/balance is (?:Ksh|KSh|KES)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : null;

    // 4. Determine Direction & Merchant
    let type = 'sent';
    let merchant = 'M-PESA Merchant';
    let category = 'shopping';

    const isReceived = /received|cashback|from/i.test(clean) && !/sent to|paid to/i.test(clean);

    if (isReceived) {
      type = 'received';
      category = 'income';
      const fromMatch = clean.match(/from\s+([A-Z0-9\s.,'&-]+?)(?:\s+on|\s+\d{10}|\s+New)/i);
      merchant = fromMatch ? fromMatch[1].trim() : 'Funds Received';
    } else if (/paid to|sent to/i.test(clean)) {
      type = 'sent';
      const toMatch = clean.match(/(?:paid to|sent to)\s+([A-Z0-9\s.,'&-]+?)(?:\s+on|\s+\d{4,}|\s+for|\s+New)/i);
      merchant = toMatch ? toMatch[1].trim() : 'M-PESA Payment';
    } else if (/airtime/i.test(clean)) {
      type = 'sent';
      merchant = 'Safaricom Airtime';
      category = 'airtime';
    }

    // Keyword heuristics for category
    const upper = clean.toUpperCase();
    if (type !== 'received') {
      if (/JAVA|KFC|BURGER|PIZZA|CAFE|RESTAURANT|CHOMA|FOOD|COFFEE|BAKERY/i.test(upper)) {
        category = 'food';
      } else if (/MATATU|UBER|BOLT|SUPER METRO|TRANS|BUS|FARE/i.test(upper)) {
        category = 'transport';
      } else if (/KPLC|POWER|TOKENS|WATER|ELECTRIC/i.test(upper)) {
        category = 'utilities';
      } else if (/SAFARICOM|AIRTIME|BUNDLE|DATA/i.test(upper)) {
        category = 'airtime';
      } else if (/RENT|HOUSE|ESTATE/i.test(upper)) {
        category = 'rent';
      } else if (/SAVINGS|MM|MSHWARI|KCB/i.test(upper)) {
        category = 'savings';
      }
    }

    return {
      id: 'tx-' + Date.now(),
      code,
      type,
      category,
      merchant: sanitizeMerchant(merchant),
      meta: `${CATEGORIES[category].name} · Just now`,
      amount,
      balance,
      date: new Date().toISOString()
    };
  }

  function sanitizeMerchant(str) {
    if (!str) return 'M-PESA Payment';
    return str.replace(/\s+/g, ' ')
              .replace(/(?:account|acc\b|for|on).*/i, '')
              .trim() || 'M-PESA Payment';
  }

  function initSmsParser() {
    const parseBtn = document.getElementById('parseSmsBtn');
    const inputEl = document.getElementById('smsInputText');
    const pasteSampleBtn = document.getElementById('pasteSampleBtn');

    const sample = 'QK73XYZ123 Confirmed. Ksh850.00 paid to JAVA HOUSE WESTLANDS on 20/9/26 at 12:42 PM. New M-PESA balance is Ksh4,120.00. Transaction cost, Ksh0.00.';

    if (pasteSampleBtn && inputEl) {
      pasteSampleBtn.addEventListener('click', () => {
        inputEl.value = sample;
        inputEl.focus();
        showToast('Sample M-PESA SMS pasted');
      });
    }

    if (parseBtn && inputEl) {
      parseBtn.addEventListener('click', () => {
        const text = inputEl.value.trim();
        if (!text) {
          showToast('Please paste an M-PESA message first.');
          return;
        }

        const parsed = parseMpesaSms(text);
        if (!parsed) {
          showToast('Could not find amount in message. Try standard M-PESA format.');
          return;
        }

        transactions.unshift(parsed);
        saveTransactions();
        renderDashboard();
        renderCategoriesTab();
        inputEl.value = '';

        showToast(`Parsed! −KSh ${formatKsh(parsed.amount)} to ${parsed.merchant}`);

        // Switch to dashboard
        const dockDash = document.querySelector('[data-tab="view-dashboard"]');
        if (dockDash) dockDash.click();
      });
    }
  }

  // --- EXPORT & RESET ---
  function initSettingsActions() {
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (!transactions.length) {
          showToast('No transactions to export.');
          return;
        }

        let csv = 'ID,Reference,Type,Category,Merchant,Amount (KSh),Balance (KSh),Date\n';
        transactions.forEach(t => {
          csv += `"${t.id}","${t.code || ''}","${t.type}","${t.category}","${(t.merchant||'').replace(/"/g, '""')}",${t.amount},${t.balance || ''},"${t.date || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mpesa-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV downloaded successfully.');
      });
    }

    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset transactions to screenshot sample state?')) {
          transactions = [...DEFAULT_TRANSACTIONS];
          saveTransactions();
          renderDashboard();
          renderCategoriesTab();
          showToast('Restored demo data.');
        }
      });
    }
  }

  // --- TOAST NOTIFIER ---
  function showToast(msg) {
    const t = document.getElementById('appToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => {
      t.classList.remove('show');
    }, 3200);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // --- INIT ALL ---
  document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
    initTheme();
    initUser();
    renderDashboard();
    renderCategoriesTab();
    initTabs();
    initSmsParser();
    initSettingsActions();
  });

})();
