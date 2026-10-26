(() => {
  const { $, T, lang, init, animateNumber } = NOAI_UI;

  let stats = { total: 0, google: 0, yandex: 0 };

  function paint(cfg) {
    $('#stat').classList.toggle('hidden', !cfg.showCounter);
    animateNumber($('#count'), stats.total);
    $('#cG').textContent = stats.google.toLocaleString();
    $('#yLbl').innerHTML = (lang() === 'ru' ? 'Яндекс' : 'Yandex') + ' <b>' + stats.yandex.toLocaleString() + '</b>';
  }

  init(paint);

  chrome.storage.local.get({ noaiStats: stats }, r => { stats = r.noaiStats; paint(NOAI_UI.cfg); });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.noaiStats) {
      stats = ch.noaiStats.newValue || { total: 0, google: 0, yandex: 0 };
      paint(NOAI_UI.cfg);
    }
  });

  $('#open').addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close(); });
})();
