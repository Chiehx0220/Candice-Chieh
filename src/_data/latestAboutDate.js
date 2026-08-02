const about = require("./about.js");

// See latestDiaryDate.js for why this exists as its own per-section file.
// 關於我們 isn't a dated collection like diary/gallery, so "new activity"
// there is defined as the most recent dated timeline entry (the "ongoing"
// entry has no date — see about.js — and is excluded).
module.exports = function () {
  const data = about();
  const timeline = Array.isArray(data.timeline) ? data.timeline : [];
  const dates = timeline
    .map((item) => (item.date ? new Date(item.date) : null))
    .filter((d) => d && !isNaN(d.getTime()));
  if (!dates.length) return "";
  const latest = dates.reduce((a, b) => (a > b ? a : b));
  return latest.toISOString().slice(0, 10);
};
