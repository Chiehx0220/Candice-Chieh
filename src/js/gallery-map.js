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
    var markers = [];
    // Floor for fitToVisibleMarkers() below — most photos are expected to
    // be somewhere in Taiwan, and the whole island should stay visible by
    // default, not just the immediate markers' own tight bounding box
    // (which for a single photo would zoom in to a street level view).
    var TAIWAN_BOUNDS = L.latLngBounds([21.5, 119.0], [25.6, 122.3]);

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    // The whole popup is a link (not just a caption card) so a marker
    // doubles as another entry point into the same lightbox the grid
    // uses — see the delegated click handler below, which finds the
    // matching [data-gallery-item] by slug and just clicks it, reusing
    // gallery.js's existing lightbox/prev/next logic rather than
    // duplicating it.
    function renderPopup(photo) {
      return (
        '<a class="gallery-map__popup" href="#" data-open-slug="' + escapeHtml(photo.slug) + '">' +
        '<img src="' + escapeHtml(photo.imageUrl) + '" alt="">' +
        '<p class="md-title-small">' + escapeHtml(photo.title) + '</p>' +
        '<p class="md-body-small md-on-surface-variant">' +
        escapeHtml(photo.date) + (photo.caption ? ' · ' + escapeHtml(photo.caption) : '') +
        '</p></a>'
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
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markers = photos.map(function (photo) {
        var marker = L.marker([photo.lat, photo.lng]).bindPopup(renderPopup(photo));
        marker.category = photo.category;
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
        var match = category === 'all' || m.category === category;
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
