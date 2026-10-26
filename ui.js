/* Помощники для popup и страницы настроек */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let cfg = { ...NOAI.DEFAULTS };
  const listeners = [];

  const lang = () => NOAI.resolveLang(cfg);
  const T = (k, v) => NOAI.t(lang(), k, v);

  function applyI18n() {
    document.documentElement.lang = lang();
    $$('[data-i18n]').forEach(e => { e.textContent = T(e.dataset.i18n); });
    $$('[data-i18n-ph]').forEach(e => { e.placeholder = T(e.dataset.i18nPh); });
    $$('[data-i18n-title]').forEach(e => { e.title = T(e.dataset.i18nTitle); });
  }

  function applyLook() {
    const r = document.documentElement;
    r.dataset.theme = cfg.theme;
    r.style.setProperty('--accent', cfg.accent);
    r.classList.toggle('is-off', !cfg.enabled);
  }

  function syncControls() {
    $$('input[type="checkbox"][data-key]').forEach(i => { i.checked = !!cfg[i.dataset.key]; });
    $$('.seg[data-key]').forEach(seg => {
      $$('button[data-val]', seg).forEach(b =>
        b.setAttribute('aria-pressed', String(cfg[seg.dataset.key] === b.dataset.val)));
    });
  }

  function render() {
    applyLook(); applyI18n(); syncControls();
    listeners.forEach(fn => fn(cfg));
  }

  const save = patch => chrome.storage.sync.set(patch);

  function wire() {
    $$('input[type="checkbox"][data-key]').forEach(i =>
      i.addEventListener('change', () => { save({ [i.dataset.key]: i.checked }); NOAI_UI.onSaved && NOAI_UI.onSaved(); }));
    $$('.seg[data-key]').forEach(seg =>
      seg.addEventListener('click', e => {
        const b = e.target.closest('button[data-val]');
        if (!b) return;
        save({ [seg.dataset.key]: b.dataset.val });
        NOAI_UI.onSaved && NOAI_UI.onSaved();
      }));
  }

  function animateNumber(el, to) {
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to.toLocaleString(); return; }
    const t0 = performance.now(), dur = 600;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString();
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function init(onChange) {
    if (onChange) listeners.push(onChange);
    chrome.storage.sync.get(NOAI.DEFAULTS, saved => {
      cfg = { ...NOAI.DEFAULTS, ...saved };
      wire(); render();
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'sync') return;
      for (const k of Object.keys(ch)) cfg[k] = ch[k].newValue === undefined ? NOAI.DEFAULTS[k] : ch[k].newValue;
      render();
    });
  }

  self.NOAI_UI = { $, $$, T, lang, init, save, animateNumber, get cfg() { return cfg; }, onSaved: null, render };
})();
