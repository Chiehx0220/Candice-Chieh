module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });

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
          imageUrl: p.imageUrl,
          category: p.category,
          location: p.location,
        };
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
