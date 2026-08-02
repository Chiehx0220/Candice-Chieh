/* ==========================================================================
   Gallery map view: a Leaflet + OpenStreetMap map showing every photo
   that has a build-time-geocoded location (see src/_data/gallery.js —
   lat/lng are baked in at build time from the CMS's plain-text "拍攝地點"
   field, so viewing this page never calls any geocoding API itself; only
   the map tiles themselves are fetched live from OpenStreetMap, same as
   any other map embed).

   Lazy-initialized on first switch to map view rather than on page load
   — most visits probably never open it, no reason to load Leaflet's
   tiles for them up front.
   ========================================================================== */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var gridChip = document.getElementById('view-grid-chip');
    var mapChip = document.getElementById('view-map-chip');
    var gridView = document.getElementById('gallery-grid-view');
    var mapView = document.getElementById('gallery-map-view');
    var mapEl = document.getElementById('gallery-map');
    var emptyEl = document.getElementById('gallery-map-empty');
    var dataEl = document.getElementById('gallery-geo-data');
    if (!gridChip || !mapChip || !mapView || !mapEl) return;

    var photos = [];
    try { photos = JSON.parse(dataEl.textContent || '[]'); } catch (e) { photos = []; }

    var map = null;
    var tileLayer = null;
    var markers = [];
    // Floor for fitToVisibleMarkers() below — most photos are expected to
    // be somewhere in Taiwan, and the whole island should stay visible by
    // default, not just the immediate markers' own tight bounding box
    // (which for a single photo would zoom in to a street level view).
    var TAIWAN_BOUNDS = L.latLngBounds([21.5, 119.0], [25.6, 122.3]);

    // CARTO's free, no-API-key basemaps (same OpenStreetMap data as
    // before, just restyled) — used instead of the raw OSM tile server
    // specifically because it ships a proper dark variant, so the map
    // can follow this site's own light/dark theme instead of always
    // showing a jarring light-grey basemap in dark mode.
    var TILE_URLS = {
      light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    };
    var TILE_ATTRIBUTION =
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>';

    // Mirrors js/theme.js's own currentTheme() — duplicated rather than
    // imported since that file exposes nothing globally, but it's just
    // these two lines.
    function currentTheme() {
      return document.documentElement.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    function applyTileTheme() {
      if (!map) return;
      var url = TILE_URLS[currentTheme() === 'dark' ? 'dark' : 'light'];
      if (tileLayer) map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(url, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);
    }

    // Reacts to the toggle button (which sets data-theme + localStorage
    // — see theme.js) and to a live OS-level scheme change when the
    // visitor has never explicitly toggled (no data-theme attribute at
    // all, same fallback theme.js itself uses on first load).
    new MutationObserver(applyTileTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!document.documentElement.getAttribute('data-theme')) applyTileTheme();
    });

    // Pin-shaped, not Leaflet's default blue-teardrop marker image — an
    // inline SVG (via L.divIcon) so it can use this site's own color
    // tokens directly instead of a fixed raster color. The circle shows
    // a count for a grouped marker (see groupByLocation() below) instead
    // of sitting empty, so a multi-photo spot reads as one at a glance.
    function markerIcon(count) {
      var badge = count > 1
        ? '<text x="14" y="18.5" text-anchor="middle" font-size="12" font-family="inherit" font-weight="700" fill="var(--md-sys-color-on-primary)">' + count + '</text>'
        : '<circle cx="14" cy="14" r="5" fill="var(--md-sys-color-on-primary)"/>';
      var svg =
        '<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="var(--md-sys-color-primary)"/>' +
        badge +
        '</svg>';
      return L.divIcon({
        className: 'gallery-map__marker',
        html: svg,
        iconSize: [28, 38],
        iconAnchor: [14, 36],
        popupAnchor: [0, -32],
      });
    }

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    // Several photos can share one location string, which geocodes to
    // the exact same lat/lng every time (see the cache in src/_data/
    // gallery.js) — grouping on that identity, rather than a proximity
    // threshold, is enough to catch them and put one marker per distinct
    // spot instead of several stacked invisibly on top of each other.
    function groupByLocation(list) {
      var groups = [];
      var byKey = {};
      list.forEach(function (photo) {
        var key = photo.lat + ',' + photo.lng;
        if (!byKey[key]) {
          byKey[key] = { lat: photo.lat, lng: photo.lng, photos: [] };
          groups.push(byKey[key]);
        }
        byKey[key].photos.push(photo);
      });
      return groups;
    }

    // Every popup link opens the same lightbox the grid uses (not a
    // second image viewer) — see the delegated click handler below,
    // which finds the matching [data-gallery-item] by slug and just
    // clicks it, reusing gallery.js's existing lightbox/prev/next logic.
    function renderSinglePopup(photo) {
      return (
        '<a class="gallery-map__popup" href="#" data-open-slug="' + escapeHtml(photo.slug) + '">' +
        '<img src="' + escapeHtml(photo.imageUrl) + '" alt="">' +
        '<p class="md-title-small">' + escapeHtml(photo.title) + '</p>' +
        '<p class="md-body-small md-on-surface-variant">' +
        escapeHtml(photo.date) + (photo.caption ? ' · ' + escapeHtml(photo.caption) : '') +
        '</p></a>'
      );
    }

    // Several photos, same spot: a small thumbnail grid instead of one
    // big photo, so all of them are reachable from a single marker
    // rather than only whichever one happened to be added to the map
    // last (and thus rendered on top).
    function renderGroupPopup(group) {
      var heading = group.photos[0].location || (group.photos.length + ' 張照片');
      var thumbs = group.photos
        .map(function (photo) {
          return (
            '<a class="gallery-map__popup-thumb" href="#" data-open-slug="' + escapeHtml(photo.slug) + '" title="' + escapeHtml(photo.title) + '">' +
            '<img src="' + escapeHtml(photo.imageUrl) + '" alt="">' +
            '</a>'
          );
        })
        .join('');
      return (
        '<div class="gallery-map__popup gallery-map__popup--group">' +
        '<p class="md-title-small">' + escapeHtml(heading) + '</p>' +
        '<p class="md-body-small md-on-surface-variant">' + group.photos.length + ' 張照片</p>' +
        '<div class="gallery-map__popup-grid">' + thumbs + '</div>' +
        '</div>'
      );
    }

    // Always includes all of Taiwan as a floor, then extends further out
    // only if a visible marker actually falls outside it (e.g. an
    // overseas trip photo) — so the default view is never smaller than
    // "the whole island", whether that's zero markers, one marker, or a
    // tight cluster.
    function fitToVisibleMarkers() {
      var bounds = L.latLngBounds(TAIWAN_BOUNDS.getSouthWest(), TAIWAN_BOUNDS.getNorthEast());
      markers.forEach(function (m) {
        if (map.hasLayer(m)) bounds.extend(m.getLatLng());
      });
      map.fitBounds(bounds.pad(0.06));
    }

    function initMap() {
      if (map || !photos.length) return;
      map = L.map(mapEl, { scrollWheelZoom: false });
      applyTileTheme();

      markers = groupByLocation(photos).map(function (group) {
        var popupHtml = group.photos.length === 1 ? renderSinglePopup(group.photos[0]) : renderGroupPopup(group);
        var marker = L.marker([group.lat, group.lng], { icon: markerIcon(group.photos.length) }).bindPopup(popupHtml);
        // A group is still relevant to a category filter if ANY photo in
        // it matches — hiding the whole marker only when every photo at
        // that spot is filtered out, not just some of them.
        marker.categories = group.photos.map(function (p) { return p.category; });
        marker.addTo(map);
        return marker;
      });

      fitToVisibleMarkers();
    }

    // Reuses the existing category chips (#tags) above the grid, so
    // switching category also filters the map when it's the active view
    // — instead of the map silently ignoring whatever category is
    // selected.
    function applyCategoryFilter(category) {
      if (!map) return;
      markers.forEach(function (m) {
        var match = category === 'all' || m.categories.indexOf(category) !== -1;
        if (match && !map.hasLayer(m)) m.addTo(map);
        if (!match && map.hasLayer(m)) map.removeLayer(m);
      });
      fitToVisibleMarkers();
    }

    function showGrid() {
      gridView.classList.remove('is-hidden');
      mapView.classList.add('is-hidden');
    }

    function showMap() {
      gridView.classList.add('is-hidden');
      mapView.classList.remove('is-hidden');
      if (!photos.length) {
        mapEl.classList.add('is-hidden');
        emptyEl.classList.remove('is-hidden');
        return;
      }
      mapEl.classList.remove('is-hidden');
      emptyEl.classList.add('is-hidden');
      initMap();
      // Leaflet measures its container synchronously on init; if that
      // happens while the container is still display:none mid-toggle it
      // sizes itself to 0 and never recovers without an explicit nudge.
      if (map) setTimeout(function () { map.invalidateSize(); }, 0);
    }

    gridChip.addEventListener('click', function () {
      mapChip.selected = false;
      gridChip.selected = true;
      showGrid();
    });
    mapChip.addEventListener('click', function () {
      gridChip.selected = false;
      mapChip.selected = true;
      showMap();
    });

    // Delegated (not bound per-marker) because Leaflet tears down and
    // rebuilds popup content each time it opens — a listener attached to
    // the popup HTML itself would need re-attaching on every open.
    mapEl.addEventListener('click', function (e) {
      var link = e.target.closest('[data-open-slug]');
      if (!link) return;
      e.preventDefault();
      var fig = document.querySelector('[data-gallery-item][data-slug="' + CSS.escape(link.dataset.openSlug) + '"]');
      if (fig) fig.click();
    });

    var tagsChipSet = document.getElementById('tags');
    if (tagsChipSet) {
      tagsChipSet.addEventListener('click', function (e) {
        var chip = e.target.closest('md-filter-chip');
        if (!chip) return;
        applyCategoryFilter(chip.dataset.filter);
      });
    }
  });
})();
