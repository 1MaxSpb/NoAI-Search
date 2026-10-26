(() => {
  'use strict';

  const host = location.hostname;
  const isGoogle = /(^|\.)google\./.test(host);
  const isYandex = /(^|\.)(yandex\.[a-z.]+|ya\.ru)$/.test(host);
  const root = document.documentElement;
  const WEB_UDM = '14';

  let cfg = { ...NOAI.DEFAULTS };
  let customStyle = null;

  // Какой флаг настроек отвечает за какой тип блока
  const FLAG = { overview: 'gOverview', aimode: 'gAiMode', answer: 'yAnswer', yatab: 'yTab' };

  /* ---------------- атрибуты на <html>: ими управляется CSS ---------------- */

  function applyAttrs() {
    cfg.enabled ? root.setAttribute('data-noai', '1') : root.removeAttribute('data-noai');
    root.setAttribute('data-noai-mode', cfg.mode);
    root.setAttribute('data-noai-flags',
      Object.keys(FLAG).filter(k => cfg[FLAG[k]]).join(' '));
    root.style.setProperty('--noai-accent', cfg.accent);
    root.setAttribute('data-noai-theme', cfg.theme);
    applyCustomCss();
    document.querySelectorAll('.noai-ph').forEach(renderPh);
  }

  // Атрибуты по умолчанию ставим сразу, чтобы блок не успел мигнуть
  applyAttrs();

  /* ---------------- свои селекторы ---------------- */

  function applyCustomCss() {
    if (!customStyle) {
      customStyle = document.createElement('style');
      customStyle.id = 'noai-custom';
      root.appendChild(customStyle);
    }
    const { valid } = NOAI.parseSelectors(cfg.customSelectors);
    customStyle.textContent = cfg.enabled && valid.length
      ? valid.map(s => `${s}{display:none!important}`).join('\n')
      : '';
  }

  /* ---------------- плашка «ИИ-блок скрыт» ---------------- */

  function renderPh(ph) {
    const lang = NOAI.resolveLang(cfg);
    const el = ph.__el;
    ph.querySelector('.noai-ph-t').textContent =
      NOAI.t(lang, ph.dataset.kind === 'overview' ? 'phOverview' : 'phAnswer');
    ph.querySelector('.noai-ph-b').textContent =
      NOAI.t(lang, el && el.hasAttribute('data-noai-revealed') ? 'hide' : 'show');
  }

  function insertPh(el, kind) {
    if (!el.parentNode) return;
    const ph = document.createElement('div');
    ph.className = 'noai-ph';
    ph.dataset.kind = kind;
    const spark = document.createElement('span'); spark.className = 'noai-ph-i'; spark.textContent = '✦';
    const text = document.createElement('span'); text.className = 'noai-ph-t';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'noai-ph-b';
    btn.addEventListener('click', () => {
      el.toggleAttribute('data-noai-revealed');
      renderPh(ph);
    });
    ph.append(spark, text, btn);
    ph.__el = el; el.__noaiPh = ph;
    el.parentNode.insertBefore(ph, el);
    renderPh(ph);
  }

  /* ---------------- счётчик ---------------- */

  let pending = 0, flushTimer = null;
  function countHidden() {
    pending++;
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      const n = pending; pending = 0;
      if (!chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get({ noaiStats: { total: 0, google: 0, yandex: 0 } }, r => {
        const s = r.noaiStats;
        s.total += n;
        s[isGoogle ? 'google' : 'yandex'] += n;
        chrome.storage.local.set({ noaiStats: s });
      });
    }, 400);
  }

  /* ---------------- пометка элементов ---------------- */

  function mark(el, kind) {
    if (!el || el.hasAttribute('data-noai-kind')) return;
    el.setAttribute('data-noai-kind', kind);
    if (kind === 'overview' || kind === 'answer') {
      insertPh(el, kind);
      if (cfg.enabled && cfg[FLAG[kind]]) countHidden();
    }
  }

  function unmark(el) {
    el.removeAttribute('data-noai-kind');
    el.removeAttribute('data-noai-revealed');
    if (el.__noaiPh) { el.__noaiPh.remove(); el.__noaiPh = null; }
  }

  /* ---------------- Google ---------------- */

  const AI_HEAD = new RegExp('^(' + [
    'обзор от ии', 'ai overview', 'ai-overview',
    'vista creada con ia', 'información general creada por ia', 'resumen de ia',
    'ki-übersicht', 'übersicht mit ki',
    'aperçu ia', "vue d'ensemble de l'ia", 'présentation ia',
    'panoramica ai', 'visão geral criada por ia', 'ai-overzicht', 'przegląd ai'
  ].join('|') + ')$', 'i');

  const AI_MODE = new RegExp('^(' + [
    'режим ии', 'ai mode', 'modo ia', 'ki-modus', 'mode ia', 'modalità ia',
    'ai-modus', 'tryb ai', 'modo de ia'
  ].join('|') + ')$', 'i');

  const STOP_IDS = new Set(['rso', 'center_col', 'main', 'search', 'cnt', 'rcnt', 'res', 'appbar', 'topstuff']);

  // Поднимаемся от заголовка до внешнего контейнера, в котором ещё нет органических результатов
  function climb(heading, maxLevels) {
    let best = heading, p = heading, level = 0;
    while (p.parentElement && p.parentElement !== document.body && level < maxLevels) {
      const par = p.parentElement;
      if (STOP_IDS.has(par.id) || par.querySelector('a h3')) break;
      best = par; p = par; level++;
    }
    return { el: best, level };
  }

  // Если скрытый контейнер «оброс» органикой (дозагрузилась выдача) — сужаем область
  function revalidate(h) {
    const el = h.__noaiEl;
    if (!el || !el.isConnected || !el.querySelector('a h3')) return;
    unmark(el);
    let level = h.__noaiLevel - 1, next;
    do { next = climb(h, Math.max(level, 0)); level--; }
    while (next.el.querySelector('a h3') && level >= 0);
    h.__noaiEl = next.el; h.__noaiLevel = next.level;
    mark(next.el, 'overview');
  }

  const seen = new WeakSet();
  function sweepGoogle() {
    document.querySelectorAll('[role="heading"], h1, h2, h3, strong').forEach(h => {
      if (!AI_HEAD.test((h.textContent || '').trim())) return;
      if (seen.has(h)) { revalidate(h); return; }
      seen.add(h);
      const { el, level } = climb(h, Infinity);
      h.__noaiEl = el; h.__noaiLevel = level;
      mark(el, 'overview');
    });
    document.querySelectorAll('a, button, [role="link"], [role="tab"]').forEach(b => {
      if (b.hasAttribute('data-noai-kind')) return;
      const t = (b.textContent || b.getAttribute('aria-label') || '').trim();
      if (t.length > 30 || !AI_MODE.test(t)) return;
      mark(b.closest('[role="listitem"]') || b, 'aimode');
    });
  }

  function maybeRedirectGoogle() {
    if (!cfg.enabled) return;
    const u = new URL(location.href);
    if (u.pathname !== '/search' || !u.searchParams.get('q')) return;
    const udm = u.searchParams.get('udm');
    const aiModePage = udm === '50';
    const plain = udm === null && !u.searchParams.has('tbm');
    if ((aiModePage && cfg.gAiMode) || (plain && cfg.gForceWeb)) {
      u.searchParams.set('udm', WEB_UDM);
      location.replace(u.toString());
    }
  }

  /* ---------------- Яндекс ---------------- */

  function sweepYandex() {
    if (!location.pathname.startsWith('/search')) return;
    document.querySelectorAll('[class*="FuturisSearch"]').forEach(n => {
      mark(n.closest('li.serp-item') || n.closest('[id^="Futuris_search"]'), 'answer');
    });
    document.querySelectorAll('.HeaderNav-Tab[href*="/alice"]').forEach(a => mark(a, 'yatab'));
  }

  /* ---------------- запуск ---------------- */

  let timer = null;
  function sweep() {
    if (!cfg.enabled) return;
    if (isGoogle) sweepGoogle();
    else if (isYandex) sweepYandex();
  }
  function schedule() {
    if (timer) return;
    timer = setTimeout(() => { timer = null; sweep(); }, 120);
  }

  function start() {
    applyAttrs();
    if (isGoogle) maybeRedirectGoogle();
    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    schedule();
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(NOAI.DEFAULTS, saved => { cfg = { ...NOAI.DEFAULTS, ...saved }; start(); });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      for (const k of Object.keys(changes)) cfg[k] = changes[k].newValue === undefined
        ? NOAI.DEFAULTS[k] : changes[k].newValue;
      applyAttrs();
      if (isGoogle) maybeRedirectGoogle();
      schedule();
    });
  } else {
    start();
  }
})();
