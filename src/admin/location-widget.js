/* ==========================================================================
   Custom Decap CMS widget for the "拍攝地點" field: a plain text input
   (so typing a place name, or pasting "lat, lng" per src/_data/gallery.js's
   parseCoordinates(), both still work exactly as before) plus a debounced
   dropdown of live suggestions from OpenStreetMap's free Nominatim search
   API — picking one fills in a short, clean place name instead of typing
   blind and hoping the build-time geocoder finds the right spot.

   Written against Decap's documented "custom widget without a build step"
   API (createClass/h exposed as globals once decap-cms.js has loaded —
   see index.html, which loads this file right after it) rather than a
   bundled React component, matching how the rest of this site avoids
   build tooling wherever a plain script tag will do.
   ========================================================================== */
(function () {
  var DEBOUNCE_MS = 400;
  var MIN_QUERY_LENGTH = 2;
  var NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  // Soft regional bias, not a hard filter — most photos are expected to
  // be somewhere in Taiwan (see the same box in js/gallery-map.js's
  // TAIWAN_BOUNDS), so a short/ambiguous name like "東眼山" should rank
  // its Taiwan match above an unrelated same-named place elsewhere
  // (a real example: it was ranking a 福州市, 中國 result above the
  // intended 桃園市 one). `bounded=0` keeps this a preference rather
  // than excluding results outside the box entirely, so an overseas
  // trip photo's location can still be found.
  var TAIWAN_VIEWBOX = '119.0,25.6,122.3,21.5';

  // Nominatim's `display_name` is a full address ("清水寺, 1-294, ...,
  // 京都市, ..., Japan") — the part before the first comma is a much
  // cleaner label for both the input field and (via src/_data/gallery.js)
  // the map's group-popup heading.
  function shortLabel(displayName) {
    return (displayName || '').split(',')[0].trim();
  }

  var LocationControl = createClass({
    getInitialState: function () {
      return { suggestions: [], loading: false, open: false };
    },

    componentWillUnmount: function () {
      clearTimeout(this._debounceTimer);
    },

    scheduleSearch: function (query) {
      clearTimeout(this._debounceTimer);
      if (query.trim().length < MIN_QUERY_LENGTH) {
        this.setState({ suggestions: [], open: false });
        return;
      }
      this._debounceTimer = setTimeout(this.runSearch.bind(this, query), DEBOUNCE_MS);
    },

    runSearch: function (query) {
      var requestId = (this._requestId = (this._requestId || 0) + 1);
      this.setState({ loading: true });
      var url = NOMINATIM_URL +
        '?format=json&limit=5&accept-language=zh-TW&viewbox=' + TAIWAN_VIEWBOX +
        '&bounded=0&q=' + encodeURIComponent(query);
      fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (results) {
          // A slower, now-stale request landing after a newer one would
          // otherwise flash outdated suggestions over the current ones.
          if (requestId !== this._requestId) return;
          this.setState({ suggestions: results || [], loading: false, open: true });
        }.bind(this))
        .catch(function () {
          if (requestId !== this._requestId) return;
          this.setState({ suggestions: [], loading: false });
        }.bind(this));
    },

    handleChange: function (e) {
      var value = e.target.value;
      this.props.onChange(value);
      this.scheduleSearch(value);
    },

    handleFocus: function () {
      if (this.state.suggestions.length) this.setState({ open: true });
    },

    handleBlur: function () {
      // Deferred so a click on a suggestion (which also blurs the input)
      // still registers before the list disappears.
      setTimeout(function () { this.setState({ open: false }); }.bind(this), 150);
    },

    selectSuggestion: function (item) {
      this.props.onChange(shortLabel(item.display_name));
      this.setState({ suggestions: [], open: false });
    },

    render: function () {
      var value = this.props.value || '';
      var showList = this.state.open && this.state.suggestions.length > 0;

      return h(
        'div',
        { className: 'location-widget' },
        h('input', {
          type: 'text',
          value: value,
          placeholder: '地名或「緯度, 經度」',
          onChange: this.handleChange,
          onFocus: this.handleFocus,
          onBlur: this.handleBlur,
          className: 'location-widget__input',
        }),
        this.state.loading && h('div', { className: 'location-widget__status' }, '搜尋中…'),
        showList &&
          h(
            'ul',
            { className: 'location-widget__list' },
            this.state.suggestions.map(function (item) {
              return h(
                'li',
                {
                  key: item.place_id,
                  className: 'location-widget__item',
                  onMouseDown: this.selectSuggestion.bind(this, item),
                },
                item.display_name
              );
            }.bind(this))
          )
      );
    },
  });

  var LocationPreview = createClass({
    render: function () {
      return h('div', {}, this.props.value);
    },
  });

  CMS.registerWidget('location', LocationControl, LocationPreview);

  // Scoped under .location-widget so this can't leak into the rest of
  // Decap's own admin UI — registerWidget has no dedicated stylesheet
  // hook, so a plain <style> tag is the straightforward option here.
  var style = document.createElement('style');
  style.textContent =
    '.location-widget { position: relative; }' +
    '.location-widget__input { width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 15px; border: 1px solid #dcdee0; border-radius: 4px; }' +
    '.location-widget__status { position: absolute; right: 10px; top: 10px; font-size: 12px; color: #6c757d; }' +
    '.location-widget__list { position: absolute; z-index: 10; top: 100%; left: 0; right: 0; margin: 4px 0 0; padding: 4px 0; list-style: none; background: #fff; border: 1px solid #dcdee0; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); max-height: 220px; overflow-y: auto; }' +
    '.location-widget__item { padding: 8px 12px; font-size: 14px; line-height: 1.4; cursor: pointer; }' +
    '.location-widget__item:hover { background: #f2f4f5; }';
  document.head.appendChild(style);
})();
