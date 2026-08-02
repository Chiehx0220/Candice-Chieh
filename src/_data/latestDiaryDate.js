const diary = require("./diary.js");

// The nav badges (js/nav.js) need each section's own latest date
// separately so 日記/相簿/關於我們 can each light up independently instead
// of sharing one combined signal.
module.exports = function () {
  const latest = diary()[0];
  return latest ? latest.date.toISOString().slice(0, 10) : "";
};
