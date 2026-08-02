/* ==========================================================================
   Light / dark theme toggle, built on the real <md-icon-button toggle>
   element (moon icon = light mode active, sun icon slot="selected" = dark
   mode active). Initial theme is applied by an inline snippet in <head>
   (before paint) to avoid a flash of the wrong theme; this file wires up
   the toggle's `selected` property + `change` event once it has upgraded.
   ========================================================================== */
(function () {
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  document.addEventListener('site-nav-ready', function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    customElements.whenDefined('md-icon-button').then(function () {
      btn.selected = currentTheme() === 'dark';
      btn.addEventListener('change', function () {
        setTheme(btn.selected ? 'dark' : 'light');
      });
    });
  });
})();
