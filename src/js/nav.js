/* ==========================================================================
   Injects the adaptive navigation shell: a top app bar (brand + theme
   toggle, always visible) plus three navigation variants — bottom bar
   (compact), rail (medium), drawer (expanded+) — switched purely by CSS
   media query in components.css. All three are rendered on every page
   load; only one is ever visible. See components.css for why these are
   hand-rolled MD3 markup rather than <md-navigation-bar> etc.

   Each page sets `window.SITE_ROOT` (root-relative path prefix, e.g. "/"
   or "/Candice-Chieh/") and `document.body.dataset.page` before loading
   this file. Nav items are real <a href> links (not JS-driven tab
   selection) — navigation works even before this script runs.
   ========================================================================== */
(function () {
  var ROOT = window.SITE_ROOT || '/';
  var current = document.body.dataset.page || '';

  // "New content" badges on 日記/相簿/關於我們 (independent of each other —
  // each section has its own latest date, computed at build time by
  // src/_data/latest{Diary,Gallery,About}Date.js, and its own per-visitor
  // "last seen" marker in localStorage). On by default, including a
  // visitor's very first-ever visit with no marker yet. Clicking into a
  // section records its marker (see the click handler below), permanently
  // clearing that section's dot until something newer than what's been
  // seen gets published there.
  var SECTION_DATES = {
    diary: document.body.dataset.latestDiary || '',
    gallery: document.body.dataset.latestGallery || '',
    about: document.body.dataset.latestAbout || ''
  };
  function getSeen(key) {
    try { return localStorage.getItem('seen:' + key) || ''; } catch (e) { return ''; }
  }
  function setSeen(key, value) {
    try { localStorage.setItem('seen:' + key, value); } catch (e) {}
  }
  var unseenBySection = {};
  Object.keys(SECTION_DATES).forEach(function (key) {
    var latest = SECTION_DATES[key];
    unseenBySection[key] = !!latest && latest !== getSeen(key);
  });

  var HEART_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.1C.6 8.6 2 5 5.6 5c2 0 3.4 1 4.4 2.4C11 6 12.4 5 14.4 5 18 5 19.4 8.6 22 11.9 19.5 16.4 12 21 12 21z"/></svg>';

  var NAV_ITEMS = [
    {
      key: 'home', label: '首頁', href: ROOT + 'index.html',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z"/></svg>'
    },
    {
      key: 'diary', label: '日記', href: ROOT + 'diary.html',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h9a3 3 0 0 1 3 3v15a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9V5a1 1 0 0 0-1-1H6zm1 4h6v1.6H7V8zm0 3.4h6V13H7v-1.6z"/></svg>',
      badge: unseenBySection.diary
    },
    {
      key: 'gallery', label: '相簿', href: ROOT + 'gallery.html',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v10.2l3.6-3.6a1 1 0 0 1 1.35-.06l2.55 2.2 3.9-4.55a1 1 0 0 1 1.5-.02L19 12.5V6H5zm3 1.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z"/></svg>',
      badge: unseenBySection.gallery
    },
    {
      key: 'about', label: '關於我們', href: ROOT + 'about.html',
      icon: HEART_ICON,
      badge: unseenBySection.about
    }
  ];

  function navLinks(itemClass, indicatorClass, includeLabel) {
    return NAV_ITEMS.map(function (item) {
      var active = item.key === current;
      var badgeDot = item.badge ? '<span class="nav-badge" aria-hidden="true"></span>' : '';
      // Wrapped tightly around just the icon (not the wider indicator pill
      // it may sit inside) so the badge anchors to the icon's own corner
      // instead of floating in the pill's empty side padding.
      var iconWithBadge = '<span class="nav-icon-wrap">' + item.icon + badgeDot + '</span>';
      var ripple = '<md-ripple></md-ripple>';
      return '<a class="' + itemClass + (active ? ' is-active' : '') + '" href="' + item.href + '" data-key="' + item.key + '"' +
        (active ? ' aria-current="page"' : '') +
        (item.badge ? ' aria-description="有新的內容"' : '') + '>' +
        (indicatorClass
          ? '<span class="' + indicatorClass + '">' + ripple + iconWithBadge + '</span>'
          : ripple + iconWithBadge) +
        (includeLabel ? '<span class="md-label-medium">' + item.label + '</span>' : '') +
        '</a>';
    }).join('');
  }

  var topAppBarHtml =
    '<div class="top-app-bar">' +
      '<a class="top-app-bar__brand" href="' + ROOT + 'index.html">' +
        '<md-ripple></md-ripple>' +
        HEART_ICON.replace('<svg ', '<svg width="24" height="24" ') +
        '<span class="md-title-medium">阿蕭跟老郭的生活記錄</span>' +
      '</a>' +
      '<div class="top-app-bar__actions">' +
        '<md-icon-button toggle id="theme-toggle" aria-label="切換深色/淺色主題">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.7 14.6A8.5 8.5 0 0 1 9.4 3.3a.9.9 0 0 0-1.1-1.2A10 10 0 1 0 22 15.7a.9.9 0 0 0-1.3-1.1z"/></svg>' +
          '<svg slot="selected" viewBox="0 0 24 24" fill="currentColor">' +
            '<circle cx="12" cy="12" r="4.5"/>' +
            '<rect x="11.1" y="1" width="1.8" height="3.4" rx="0.9"/>' +
            '<rect x="11.1" y="1" width="1.8" height="3.4" rx="0.9" transform="rotate(45 12 12)"/>' +
            '<rect x="11.1" y="1" width="1.8" height="3.4" rx="0.9" transform="rotate(90 12 12)"/>' +
            '<rect x="11.1" y="1" width="1.8" height="3.4" rx="0.9" transform="rotate(135 12 12)"/>' +
            '<rect x="11.1" y="1" width="1.8" height="3.4" rx="0.9" transform="rotate(180 12 12)"/>' +
            '<rect x="11.1" y="1" width="1.8" height="3.4" rx="0.9" transform="rotate(225 12 12)"/>' +
            '<rect x="11.1" y="1" width="1.8" height="3.4" rx="0.9" transform="rotate(270 12 12)"/>' +
            '<rect x="11.1" y="1" width="1.8" height="3.4" rx="0.9" transform="rotate(315 12 12)"/>' +
          '</svg>' +
        '</md-icon-button>' +
      '</div>' +
    '</div>';

  var navBarHtml = '<nav class="nav-bar" aria-label="主要導覽">' + navLinks('nav-bar__item', 'nav-bar__indicator', true) + '</nav>';
  var navRailHtml = '<nav class="nav-rail" aria-label="主要導覽">' + navLinks('nav-rail__item', 'nav-rail__indicator', true) + '</nav>';
  var navDrawerHtml =
    '<nav class="nav-drawer" aria-label="主要導覽">' +
      '<div class="nav-drawer__header md-title-small">' +
        HEART_ICON.replace('<svg ', '<svg width="20" height="20" ') +
        '<span>阿蕭跟老郭</span>' +
      '</div>' +
      navLinks('nav-drawer__item', null, true) +
    '</nav>';

  var footerHtml =
    '<footer class="site-footer">' +
      '<p class="md-body-medium">© <span id="footer-year"></span> 阿蕭跟老郭的生活記錄 — 一起走過的每一天' +
        '<span class="heart">' + HEART_ICON.replace('<svg ', '<svg width="16" height="16" ') + '</span>' +
      '</p>' +
    '</footer>' +
    '<md-fab id="back-to-top" aria-label="回到頂端">' +
      '<md-icon slot="icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5l7 7-1.4 1.4L13 8.8V19h-2V8.8l-4.6 4.6L5 12z"/></svg></md-icon>' +
    '</md-fab>';

  document.addEventListener('DOMContentLoaded', function () {
    var topMount = document.getElementById('site-nav-top');
    var sideMount = document.getElementById('site-nav-side');
    var bottomMount = document.getElementById('site-nav-bottom');
    var footerMount = document.getElementById('site-footer');

    if (topMount) topMount.innerHTML = topAppBarHtml;
    if (sideMount) sideMount.innerHTML = navRailHtml + navDrawerHtml;
    if (bottomMount) bottomMount.innerHTML = navBarHtml;
    if (footerMount) footerMount.innerHTML = footerHtml;

    var yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var appBar = topMount ? topMount.querySelector('.top-app-bar') : null;
    var fab = document.getElementById('back-to-top');
    if (fab || appBar) {
      window.addEventListener('scroll', function () {
        if (appBar) appBar.classList.toggle('is-scrolled', window.scrollY > 4);
        if (fab) fab.classList.toggle('is-visible', window.scrollY > 480);
      }, { passive: true });
    }
    if (fab) {
      fab.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    Object.keys(SECTION_DATES).forEach(function (key) {
      if (!unseenBySection[key]) return;
      var latest = SECTION_DATES[key];
      var links = document.querySelectorAll('[data-key="' + key + '"]');
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function () {
          setSeen(key, latest);
        });
      }
    });

    document.dispatchEvent(new CustomEvent('site-nav-ready'));
  });
})();
