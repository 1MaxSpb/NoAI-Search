/* Общие настройки и переводы. Подключается и в content script, и в popup/options. */
(() => {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    mode: 'hide',          // hide | collapse | blur
    gOverview: true,       // Google: Обзор от ИИ
    gAiMode: true,         // Google: вкладка/кнопка/страница «Режим ИИ»
    gForceWeb: false,      // Google: всегда udm=14 («Веб»)
    yAnswer: true,         // Яндекс: Быстрый ответ Алисы AI
    yTab: true,            // Яндекс: вкладка «Алиса AI»
    showCounter: true,
    lang: 'auto',          // auto | ru | en
    theme: 'auto',         // auto | light | dark
    accent: '#7c5cff',
    customSelectors: ''
  };

  const ACCENTS = ['#7c5cff', '#ff4d8d', '#00b894', '#ff9f1a', '#0984e3', '#e84118'];

  const STR = {
    ru: {
      tagline: 'Тихий поиск без ИИ-подсказок',
      on: 'Включено', off: 'Выключено',
      hiddenCount: 'ИИ-ответов скрыто',
      mode: 'Как скрывать',
      modeHide: 'Скрыть', modeCollapse: 'Свернуть', modeBlur: 'Размыть',
      modeHideDesc: 'Блок исчезает полностью, как будто его не было',
      modeCollapseDesc: 'Остаётся тонкая плашка с кнопкой «Показать»',
      modeBlurDesc: 'Блок размыт, при наведении его можно подсмотреть',
      quick: 'Что скрывать',
      google: 'Google', yandex: 'Яндекс',
      gOverview: 'Обзор от ИИ', gOverviewDesc: 'Ответ нейросети над результатами',
      gAiMode: 'Режим ИИ', gAiModeDesc: 'Вкладка, кнопка и страница; переадресует на «Веб»',
      gForceWeb: 'Всегда «Веб»', gForceWebDesc: 'Добавляет udm=14: чистая выдача без ИИ и виджетов',
      yAnswer: 'Быстрый ответ Алисы AI', yAnswerDesc: 'Блок с ответом нейросети в выдаче',
      yTab: 'Вкладка «Алиса AI»', yTabDesc: 'Пункт в верхнем меню Яндекса',
      settings: 'Настройки', openSettings: 'Все настройки',
      language: 'Язык', langAuto: 'Авто',
      theme: 'Тема', themeAuto: 'Системная', themeLight: 'Светлая', themeDark: 'Тёмная',
      accent: 'Акцентный цвет',
      appearance: 'Внешний вид', behavior: 'Поведение', sites: 'Сайты',
      showCounter: 'Показывать счётчик',
      showCounterDesc: 'Сколько ИИ-ответов уже спрятано',
      preview: 'Так это выглядит',
      previewResult: 'Обычный результат поиска',
      custom: 'Свои селекторы',
      customDesc: 'CSS-селекторы, по одному на строку. Подходящие элементы скрываются на Google и Яндексе.',
      customPh: '.some-ai-widget\n[data-ai-block]',
      customOk: 'Принято селекторов: {n}',
      customBad: 'Некорректных: {n}',
      data: 'Данные',
      statsTotal: 'Всего', export: 'Экспорт', import: 'Импорт',
      resetStats: 'Сбросить счётчик', resetAll: 'Сбросить настройки',
      confirmReset: 'Вернуть все настройки по умолчанию?',
      saved: 'Сохранено', imported: 'Настройки импортированы', importFail: 'Не удалось прочитать файл',
      phOverview: 'Обзор от ИИ скрыт', phAnswer: 'Ответ Алисы AI скрыт',
      show: 'Показать', hide: 'Скрыть',
      footer: 'Работает локально. Ничего не отправляется.'
    },
    en: {
      tagline: 'Quiet search, no AI noise',
      on: 'On', off: 'Off',
      hiddenCount: 'AI answers hidden',
      mode: 'How to hide',
      modeHide: 'Hide', modeCollapse: 'Collapse', modeBlur: 'Blur',
      modeHideDesc: 'The block vanishes completely, as if it never existed',
      modeCollapseDesc: 'A thin bar with a “Show” button stays behind',
      modeBlurDesc: 'The block is blurred; hover to peek at it',
      quick: 'What to hide',
      google: 'Google', yandex: 'Yandex',
      gOverview: 'AI Overview', gOverviewDesc: 'The AI answer above the results',
      gAiMode: 'AI Mode', gAiModeDesc: 'Tab, button and page; redirects to “Web”',
      gForceWeb: 'Always “Web” results', gForceWebDesc: 'Adds udm=14: clean results, no AI or widgets',
      yAnswer: 'Alice AI quick answer', yAnswerDesc: 'The neural answer block in results',
      yTab: '“Alice AI” tab', yTabDesc: 'Item in the top Yandex menu',
      settings: 'Settings', openSettings: 'All settings',
      language: 'Language', langAuto: 'Auto',
      theme: 'Theme', themeAuto: 'System', themeLight: 'Light', themeDark: 'Dark',
      accent: 'Accent color',
      appearance: 'Appearance', behavior: 'Behavior', sites: 'Sites',
      showCounter: 'Show counter',
      showCounterDesc: 'How many AI answers are already hidden',
      preview: 'Live preview',
      previewResult: 'A regular search result',
      custom: 'Custom selectors',
      customDesc: 'CSS selectors, one per line. Matching elements get hidden on Google and Yandex.',
      customPh: '.some-ai-widget\n[data-ai-block]',
      customOk: 'Selectors accepted: {n}',
      customBad: 'Invalid: {n}',
      data: 'Data',
      statsTotal: 'Total', export: 'Export', import: 'Import',
      resetStats: 'Reset counter', resetAll: 'Reset settings',
      confirmReset: 'Restore all settings to defaults?',
      saved: 'Saved', imported: 'Settings imported', importFail: 'Could not read the file',
      phOverview: 'AI Overview hidden', phAnswer: 'Alice AI answer hidden',
      show: 'Show', hide: 'Hide',
      footer: 'Runs locally. Nothing is sent anywhere.'
    }
  };

  function resolveLang(cfg) {
    if (cfg && (cfg.lang === 'ru' || cfg.lang === 'en')) return cfg.lang;
    const nav = (navigator.language || 'en').toLowerCase();
    return /^(ru|uk|be|kk)/.test(nav) ? 'ru' : 'en';
  }

  function t(lang, key, vars) {
    let s = (STR[lang] && STR[lang][key]) || STR.en[key] || key;
    if (vars) for (const k of Object.keys(vars)) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  // Разбор пользовательских селекторов: возвращает { valid: [...], invalid: n }
  function parseSelectors(text) {
    const valid = []; let invalid = 0;
    const probe = document.createDocumentFragment();
    String(text || '').split('\n').map(s => s.trim()).filter(Boolean).forEach(sel => {
      if (/[{};]/.test(sel) || sel.length > 300) { invalid++; return; }
      try { probe.querySelector(sel); valid.push(sel); } catch (e) { invalid++; }
    });
    return { valid, invalid };
  }

  self.NOAI = { DEFAULTS, ACCENTS, STR, resolveLang, t, parseSelectors };
})();
