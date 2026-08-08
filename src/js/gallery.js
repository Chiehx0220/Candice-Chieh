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
    var dateTextEl = document.getElementById('lb-date-text');
    var locationBtn = document.getElementById('lb-location-btn');
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
      if (dateTextEl) dateTextEl.textContent = fig.dataset.date || '';
      // The 📍 location is only a clickable jump-to-map button when this
      // photo actually has build-time-geocoded coordinates (see
      // src/_data/gallery.js — a location that failed to geocode has no
      // lat/lng, and gallery-map.js has no marker to jump to for it), so
      // its lat/lng gets carried on the button's own dataset rather than
      // looked up again later from `figures`.
      if (locationBtn) {
        var location = fig.dataset.location || '';
        locationBtn.textContent = location ? (' 📍' + location) : '';
        locationBtn.classList.toggle('is-hidden', !location);
        if (fig.dataset.lat && fig.dataset.lng) {
          locationBtn.dataset.lat = fig.dataset.lat;
          locationBtn.dataset.lng = fig.dataset.lng;
          locationBtn.classList.remove('is-static');
        } else {
          delete locationBtn.dataset.lat;
          delete locationBtn.dataset.lng;
          locationBtn.classList.add('is-static');
        }
      }
      captionEl.textContent = fig.dataset.caption || '';
      dialog.show();
    }

    function step(delta) {
      if (!visibleList.length) return;
      currentIndex = (currentIndex + delta + visibleList.length) % visibleList.length;
      openLightbox(currentIndex);
    }

    customElements.whenDefined('md-dialog').then(function () {
      // Material's own dialog content region is styled `overflow-y:
      // scroll` (always-visible track) rather than `auto`, presumably so
      // the dialog doesn't jump width when paging between photos with
      // captions of different lengths — but that means a scrollbar shows
      // even when there's nothing to scroll, which is exactly what
      // .lightbox__image-wrap in components.css is sized to guarantee.
      // There's no public CSS custom property or ::part() for this
      // region, so this reaches directly into the dialog's shadow root
      // (open, so JS can see it even though an external stylesheet
      // can't) and hides just the scrollbar chrome — overflow-y itself
      // is untouched, so content would still be reachable by scrolling
      // in the rare case a caption really is too long to fit. Tied to
      // the pinned @material/web@2.5.0 import in base.njk; the class
      // name here isn't a public API and could change on a version bump.
      if (dialog.shadowRoot) {
        var hideScrollbar = document.createElement('style');
        hideScrollbar.textContent =
          '.scroller { scrollbar-width: none; }' +
          '.scroller::-webkit-scrollbar { width: 0; height: 0; }';
        dialog.shadowRoot.appendChild(hideScrollbar);
      }

      figures.forEach(function (fig) {
        fig.addEventListener('click', function () {
          currentScope = fig.closest('[data-gallery-scope]');
          refreshVisible();
          openLightbox(visibleList.indexOf(fig));
        });
      });

      if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
      if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });
      // Jump from the lightbox straight to this photo's marker on the
      // map. gallery.js and gallery-map.js don't know about each other
      // directly, so this hands off via a custom event instead of a
      // direct function call — gallery-map.js listens for it and does
      // the actual view-switch + pan + popup-open.
      if (locationBtn) {
        locationBtn.addEventListener('click', function () {
          if (!locationBtn.dataset.lat || !locationBtn.dataset.lng) return;
          dialog.close();
          document.dispatchEvent(new CustomEvent('gallery:focus-location', {
            detail: {
              lat: Number(locationBtn.dataset.lat),
              lng: Number(locationBtn.dataset.lng),
            },
          }));
        });
      }
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
