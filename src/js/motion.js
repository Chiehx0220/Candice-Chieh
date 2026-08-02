/* ==========================================================================
   Scroll-reveal: elements marked .reveal start faded/offset (see base.css)
   and settle into place the first time they enter the viewport. Progressive
   enhancement — base.njk includes a <noscript> rule that neutralizes
   .reveal when this script can't run, so content is never stuck invisible.
   ========================================================================== */
(function () {
  if (!('IntersectionObserver' in window)) {
    document.documentElement.classList.add('no-reveal-support');
    return;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(function (el) { io.observe(el); });
  });
})();
