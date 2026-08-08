module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // Nunjucks' built-in `slice` filter chunks an array into N groups
  // (pagination-style), not a JS-style slice(0, n) — this is a plain
  // "first n items" filter for homepage previews.
  eleventyConfig.addFilter("limit", function (arr, n) {
    return (arr || []).slice(0, n);
  });

  // For embedding data as an inline <script type="application/json">
  // payload (see gallery.njk's map view) — safe to drop straight into
  // HTML because it's application/json, not executable script content.
  eleventyConfig.addFilter("json", function (obj) {
    return JSON.stringify(obj);
  });

  // Trims the gallery list down to just what the map view needs, and
  // drops anything that never got build-time coordinates (src/_data/
  // gallery.js only sets lat/lng when a photo has a location that
  // geocoded successfully).
  eleventyConfig.addFilter("geoPhotos", function (photos) {
    // gallery.njk's own <img> tags use `{{ photo.imageUrl | url }}` to
    // apply the site's --pathprefix (e.g. /Candice-Chieh/ in the
    // production build) to a site-relative imageUrl — this JSON payload
    // needs the same treatment, or every photo whose imageUrl isn't a
    // full external URL (a pCloud link, say) 404s once deployed under a
    // path prefix, even though it looks fine locally where there is no
    // prefix to miss.
    const urlFilter = eleventyConfig.getFilter("url");
    return (photos || [])
      .filter(function (p) { return typeof p.lat === "number" && typeof p.lng === "number"; })
      .map(function (p) {
        return {
          slug: p.slug,
          lat: p.lat,
          lng: p.lng,
          title: p.title,
          date: p.shortDate,
          caption: p.caption,
          imageUrl: urlFilter(p.imageUrl),
          category: p.category,
          location: p.location,
        };
      });
  });

  // Decap's markdown widget lets writers drop in a locally-uploaded photo
  // (saved under media_folder/public_folder, e.g. "/images/xxx.jpg"), and
  // that raw path gets baked straight into the rendered <img src> at data-
  // load time in diary.js — same pathprefix blind spot as geoPhotos above,
  // except here it's inside an HTML string rather than a template `| url`
  // call, so it needs its own filter pass instead.
  eleventyConfig.addFilter("fixLocalImages", function (html) {
    const urlFilter = eleventyConfig.getFilter("url");
    return (html || "").replace(/src="(\/images\/[^"]+)"/g, function (match, src) {
      return 'src="' + urlFilter(src) + '"';
    });
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
