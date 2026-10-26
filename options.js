(() => {
  const { $, $$, T, init, save, animateNumber } = NOAI_UI;

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1400);
  }
  NOAI_UI.onSaved = () => toast(T('saved'));

  /* ---------- режимы (карточки) ---------- */
  $('.modes').addEventListener('click', e => {
    const b = e.target.closest('.mode');
    if (!b) return;
    save({ mode: b.dataset.val }); toast(T('saved'));
  });

  /* ---------- цвета ---------- */
  const sw = $('#swatches');
  NOAI.ACCENTS.forEach(c => {
    const b = document.createElement('button');
    b.className = 'sw'; b.style.setProperty('--c', c); b.dataset.c = c; b.setAttribute('aria-label', c);
    b.addEventListener('click', () => { save({ accent: c }); toast(T('saved')); });
    sw.appendChild(b);
  });
  const picker = document.createElement('input');
  picker.type = 'color'; picker.setAttribute('aria-label', 'custom color');
  picker.addEventListener('change', () => { save({ accent: picker.value }); toast(T('saved')); });
  sw.appendChild(picker);

  /* ---------- свои селекторы ---------- */
  const ta = $('#custom'), hint = $('#customHint');
  let taTimer;
  function checkSelectors() {
    const { valid, invalid } = NOAI.parseSelectors(ta.value);
    const parts = [];
    if (valid.length) parts.push(T('customOk', { n: valid.length }));
    if (invalid) parts.push(T('customBad', { n: invalid }));
    hint.textContent = parts.join(' · ');
    hint.classList.toggle('bad', invalid > 0);
  }
  ta.addEventListener('input', () => {
    checkSelectors();
    clearTimeout(taTimer);
    taTimer = setTimeout(() => { save({ customSelectors: ta.value }); toast(T('saved')); }, 500);
  });

  /* ---------- статистика ---------- */
  function paintStats(s) {
    animateNumber($('#sTotal'), s.total); animateNumber($('#sG'), s.google); animateNumber($('#sY'), s.yandex);
  }
  chrome.storage.local.get({ noaiStats: { total: 0, google: 0, yandex: 0 } }, r => paintStats(r.noaiStats));
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.noaiStats) paintStats(ch.noaiStats.newValue || { total: 0, google: 0, yandex: 0 });
  });
  $('#resetStats').addEventListener('click', () => {
    chrome.storage.local.set({ noaiStats: { total: 0, google: 0, yandex: 0 } }); toast(T('saved'));
  });

  /* ---------- экспорт / импорт / сброс ---------- */
  $('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(NOAI_UI.cfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'noai-search-settings.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#import').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const patch = {};
      for (const k of Object.keys(NOAI.DEFAULTS)) {
        if (typeof data[k] === typeof NOAI.DEFAULTS[k]) patch[k] = data[k];
      }
      if (!['hide', 'collapse', 'blur'].includes(patch.mode)) delete patch.mode;
      if (!['auto', 'ru', 'en'].includes(patch.lang)) delete patch.lang;
      if (!['auto', 'light', 'dark'].includes(patch.theme)) delete patch.theme;
      if (!/^#[0-9a-f]{6}$/i.test(patch.accent || '')) delete patch.accent;
      if (typeof patch.customSelectors === 'string') patch.customSelectors = patch.customSelectors.slice(0, 4000);
      if (!Object.keys(patch).length) throw new Error('empty');
      save(patch); toast(T('imported'));
    } catch (err) { toast(T('importFail')); }
  });
  $('#resetAll').addEventListener('click', () => {
    if (!confirm(T('confirmReset'))) return;
    chrome.storage.sync.clear(() => { toast(T('saved')); });
  });

  /* ---------- реакция на настройки ---------- */
  init(cfg => {
    $$('.mode').forEach(b => b.setAttribute('aria-pressed', String(cfg.mode === b.dataset.val)));
    $$('.sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c.toLowerCase() === cfg.accent.toLowerCase())));
    if (/^#[0-9a-f]{6}$/i.test(cfg.accent)) picker.value = cfg.accent;
    if (document.activeElement !== ta) ta.value = cfg.customSelectors;
    checkSelectors();
    $('#mock').dataset.state = (!cfg.enabled || !cfg.gOverview) ? 'off' : cfg.mode;
  });
})();
