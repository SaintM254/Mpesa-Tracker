(function () {
  'use strict';

  const html = document.documentElement;
  const STORAGE_KEY = 'mpesa-tracker-theme';

  // ---- Theme ----
  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }
  function setStoredTheme(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (_) {}
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  function preferredTheme() {
    const stored = getStoredTheme();
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  applyTheme(preferredTheme());

  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      setStoredTheme(next);
    });
  }

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = function (e) {
      if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  // ---- Year ----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Dynamic download URL (GitHub Releases latest API) ----
  const REPO = 'SaintM254/Mpesa-Tracker';
  const FALLBACK_HREF = 'https://github.com/' + REPO + '/releases/latest/download/app-release.apk';

  function pickAssetUrl(release) {
    if (!release || !Array.isArray(release.assets) || !release.assets.length) return null;
    const apk = release.assets.find(function (a) {
      return /\.apk$/i.test(a.name || '') && a.browser_download_url;
    });
    if (apk) return apk.browser_download_url;
    const any = release.assets[0];
    return any && any.browser_download_url ? any.browser_download_url : null;
  }

  function setDownloadHref(href) {
    const btn = document.getElementById('downloadBtn');
    if (btn && href) btn.setAttribute('href', href);
  }

  fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
    headers: { 'Accept': 'application/vnd.github+json' },
    cache: 'no-store'
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      const url = pickAssetUrl(data) || FALLBACK_HREF;
      setDownloadHref(url);
    })
    .catch(function () { setDownloadHref(FALLBACK_HREF); });
})();
