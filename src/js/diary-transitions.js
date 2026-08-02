/* ==========================================================================
   Cross-document container-transform: tags whichever diary-list thumbnail
   gets clicked with the same view-transition-name the entry page's hero
   image carries permanently (see pages.css .entry-hero img), so supporting
   browsers morph the thumbnail into the hero image across the page
   navigation instead of a hard cut. Runs on both the homepage's 3-item
   preview list and the full diary.html list — same markup on both
   (<md-list class="diary-list"> with an <img slot="start">).

   No feature detection needed: view-transition-name is an ordinary CSS
   property, silently ignored by browsers without the View Transitions API,
   and the link underneath still navigates normally either way.
   ========================================================================== */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var thumbs = document.querySelectorAll('.diary-list img[slot="start"]');
    if (!thumbs.length) return;

    thumbs.forEach(function (img) {
      var item = img.closest('md-list-item');
      if (!item) return;
      item.addEventListener('click', function () {
        // Only one element may carry a given view-transition-name at a
        // time — clear any leftover tag (e.g. this page restored from
        // bfcache after a previous click) before tagging the new one.
        thumbs.forEach(function (el) { el.style.viewTransitionName = ''; });
        img.style.viewTransitionName = 'diary-hero';
      });
    });
  });
})();
