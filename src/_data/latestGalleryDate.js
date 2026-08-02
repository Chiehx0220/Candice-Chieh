const gallery = require("./gallery.js");

// See latestDiaryDate.js for why this exists as its own per-section file.
module.exports = function () {
  const latest = gallery()[0];
  return latest ? latest.date.toISOString().slice(0, 10) : "";
};
