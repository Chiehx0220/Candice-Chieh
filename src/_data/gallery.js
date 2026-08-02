const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const DIR = path.join(__dirname, "..", "..", "content", "gallery");

function formatShort(date) {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

module.exports = function () {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));

  const items = files.map((file) => {
    const raw = fs.readFileSync(path.join(DIR, file), "utf8");
    const { data } = matter(raw);
    // Same defensive fallback as diary.js: a missing/invalid date sorts as
    // "now" instead of producing NaN comparisons or crashing the sort.
    const parsedDate = new Date(data.date);
    const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    return {
      slug: file.replace(/\.md$/, ""),
      title: data.title,
      category: data.category,
      imageUrl: data.imageUrl,
      // Not a CMS field — fall back to caption/title (both required)
      // instead of asking for a separate hand-written alt text per photo.
      alt: data.alt || data.caption || data.title,
      caption: data.caption,
      date,
      shortDate: formatShort(date),
    };
  });

  // 新到舊排序，跟首頁/日記列表一致 —— 首頁「相片牆」預覽區直接取前 6 筆。
  items.sort((a, b) => b.date - a.date);
  return items;
};
