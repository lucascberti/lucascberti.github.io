// lucasberti.com — idioma e tema, compartilhados por todas as páginas.
// O idioma e o tema iniciais são aplicados por um script curto no <head>
// de cada página (para não piscar); aqui ficam só os botões.
(function () {
  var root = document.documentElement;
  var htmlLang = { pt: 'pt-BR', en: 'en', es: 'es' };

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function currentLang() {
    var m = root.className.match(/\bl-(pt|en|es)\b/);
    return m ? m[1] : 'pt';
  }

  function setLang(lang) {
    root.classList.remove('l-pt', 'l-en', 'l-es');
    root.classList.add('l-' + lang);
    root.lang = htmlLang[lang];
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.set === lang));
    });
    var title = document.querySelector('title[data-' + lang + ']');
    if (title) document.title = title.getAttribute('data-' + lang);
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () {
      setLang(b.dataset.set);
      save('lang', b.dataset.set);
    });
  });
  setLang(currentLang());

  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      save('theme', next);
    });
  }
})();
