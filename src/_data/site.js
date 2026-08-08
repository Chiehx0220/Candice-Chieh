// Origin only (no path) for the deployed GitHub Pages site. page.url is
// always prefix-free ("/gallery.html"), and `| url` applies --pathprefix
// on top of it ("/Candice-Chieh/gallery.html" in prod) — so building
// absolute URLs as `site.origin + (page.url | url)` picks up the prefix
// automatically without ever double-prepending it here.
module.exports = {
  origin: "https://chiehx0220.github.io",
};
