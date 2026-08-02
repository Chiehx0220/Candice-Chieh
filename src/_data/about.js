const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const FILE = path.join(__dirname, "..", "..", "content", "about.yml");

function formatLong(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

module.exports = function () {
  const data = yaml.load(fs.readFileSync(FILE, "utf8"));

  if (Array.isArray(data.timeline)) {
    data.timeline = data.timeline.map((item) => {
      // The "ongoing" entry has no date (see config.yml) — about.njk shows
      // a hardcoded "現在進行式" label for it instead of reading this.
      if (!item.date) return item;
      const parsed = new Date(item.date);
      return {
        ...item,
        dateDisplay: isNaN(parsed.getTime()) ? String(item.date) : formatLong(parsed),
      };
    });
  }

  return data;
};
