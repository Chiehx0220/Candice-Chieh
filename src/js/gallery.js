/* ==========================================================================
   Gallery: category filter built on real <md-chip-set>/<md-filter-chip>,
   lightbox built on the real <md-dialog> (show()/close() API — there is no
   selection-change event on filter chips, so filtering listens for the
   bubbled `click` and reads `.selected` after the chip's own internal
   toggle has already run).
   ========================================================================== */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var chipSet = document.getElementById('tags');
    var figures = document.querySelectorAll('[data-gallery-item]');
    var dialog = document.getElementById('lightbox');
    if (!figures.length || !dialog) return;

    var visibleList = [];
    var currentIndex = 0;
    // Which [data-gallery-scope] section (e.g. 回憶 vs 相片牆 on the
    // homepage) the currently-open photo belongs to — without this,
    // prev/next paged straight from the last 回憶 photo into an unrelated
    // 相片牆 photo with no indication anything had changed. Pages with
    // just one gallery section (gallery.html) are unaffected: there's
    // only one scope to find, so behavior there is unchanged.
    var currentScope = null;

    var imgEl = document.getElementById('lb-img');
    var loadingEl = document.getElementById('lb-loading');
    var titleEl = document.getElementById('lb-title');
    var dateEl = document.getElementById('lb-date');
    var captionEl = document.getElementById('lb-caption');
    var closeBtn = document.getElementById('lb-close');
    var prevBtn = document.getElementById('lb-prev');
    var nextBtn = document.getElementById('lb-next');

    // Real loading state, not a fixed-duration fake spinner: shown for as
    // long as the image actually takes to load (matters most once
    // placeholder SVGs are swapped for real pCloud-hosted photos). <img>
    // has no "started loading" event, so the spinner is shown imperatively
    // in openLightbox() right before src is assigned, and hidden on the
    // resulting load/error event.
    if (imgEl && loadingEl) {
      imgEl.addEventListener('load', function () {
        loadingEl.classList.add('is-hidden');
        imgEl.classList.remove('is-loading');
      });
      imgEl.addEventListener('error', function () {
        loadingEl.classList.add('is-hidden');
        imgEl.classList.remove('is-loading');
      });
    }

    function refreshVisible() {
      visibleList = Array.prototype.filter.call(figures, function (f) {
        if (currentScope && f.closest('[data-gallery-scope]') !== currentScope) return false;
        return !f.classList.contains('is-hidden');
      });
    }

    function openLightbox(index) {
      refreshVisible();
      var fig = visibleList[index];
      if (!fig) return;
      currentIndex = index;
      var img = fig.querySelector('img');
      if (loadingEl) loadingEl.classList.remove('is-hidden');
      imgEl.classList.add('is-loading');
      imgEl.src = img.src;
      imgEl.alt = img.alt;
      titleEl.textContent = fig.dataset.title || '';
      if (dateEl) dateEl.textContent = fig.dataset.date || '';
      captionEl.textContent = fig.dataset.caption || '';
      dialog.show();
    }

    function step(delta) {
      if (!visibleList.length) return;
      currentIndex = (currentIndex + delta + visibleList.length) % visibleList.length;
      openLightbox(currentIndex);
    }

    // Container-transform-style open: the clicked grid photo grows into
    // the lightbox frame instead of the dialog just appearing over it.
    // #lb-img already carries view-transition-name: lightbox-photo
    // permanently (components.css) — only the clicked thumbnail needs
    // tagging here, and only for the instant it takes the browser to
    // snapshot the "before" frame; it's untagged again before
    // openLightbox() runs so the two images never carry the same name
    // at once. Falls straight through to a plain openLightbox() when the
    // View Transitions API isn't available — that's the same behavior
    // this had before, so there's nothing missing on those browsers.
    function openLightboxTransitioned(index, sourceImg) {
      if (typeof document.startViewTransition !== 'function' || !sourceImg) {
        openLightbox(index);
        return;
      }
      sourceImg.style.viewTransitionName = 'lightbox-photo';
      document.startViewTransition(function () {
        sourceImg.style.viewTransitionName = '';
        openLightbox(index);
      });
    }

    customElements.whenDefined('md-dialog').then(function () {
      figures.forEach(function (fig) {
        fig.addEventListener('click', function () {
          currentScope = fig.closest('[data-gallery-scope]');
          refreshVisible();
          openLightboxTransitioned(visibleList.indexOf(fig), fig.querySelector('img'));
        });
      });

      if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
      if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });
      document.addEventListener('keydown', function (e) {
        if (!dialog.open) return;
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
      });
    });

    customElements.whenDefined('md-filter-chip').then(function () {
      if (!chipSet) return;
      chipSet.addEventListener('click', function (e) {
        var chip = e.target.closest('md-filter-chip');
        if (!chip) return;
        var chips = Array.prototype.slice.call(chipSet.querySelectorAll('md-filter-chip'));
        chips.forEach(function (c) { if (c !== chip) c.selected = false; });
        chip.selected = true; // keep exactly one filter active at all times
        var category = chip.dataset.filter;
        figures.forEach(function (fig) {
          var match = category === 'all' || fig.dataset.category === category;
          if (match) {
            fig.classList.remove('is-hidden');
            requestAnimationFrame(function () { fig.classList.remove('is-leaving'); });
          } else {
            fig.classList.add('is-leaving');
            setTimeout(function () { fig.classList.add('is-hidden'); }, 150);
          }
        });
      });
    });
  });
})();
