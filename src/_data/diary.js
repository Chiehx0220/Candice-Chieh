const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: true });
const DIR = path.join(__dirname, "..", "..", "content", "diary");

function formatShort(date) {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function formatLong(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// The CMS's rich-text image inserter always shows ALT TEXT/TITLE inputs,
// but nobody wants to hand-fill those per photo — leaving them blank is
// the expected path, not an error case. Fill in a numbered fallback for
// alt (screen readers still need *something*) and drop title entirely
// when left empty (an empty title="" just shows a blank tooltip).
function fillImageFallbacks(html, entryTitle) {
  let count = 0;
  return html.replace(/<img\b([^>]*?)>/g, (match, attrs) => {
    count += 1;
    let out = attrs;
    if (/\salt=""/.test(out)) {
      const fallback = escapeAttr(`${entryTitle || "日記照片"} 照片 ${count}`);
      out = out.replace(/\salt=""/, ` alt="${fallback}"`);
    }
    out = out.replace(/\stitle=""/, "");
    return `<img${out}>`;
  });
}

module.exports = function () {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));

  const entries = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(DIR, file), "utf8");
    // A field named "body" is special-cased by Decap CMS: it isn't saved
    // as a front-matter key but as the file's actual markdown body (the
    // part after the closing "---"), which is gray-matter's `content`,
    // not `data.body`.
    const { data, content } = matter(raw);
    // Defends against entries saved without a date (e.g. from before the
    // CMS's date widget was fixed) — an Invalid Date would otherwise sort
    // unpredictably and render as "NaN 年 NaN 月". Falls back to "now"
    // rather than crashing or showing garbage.
    const parsedDate = new Date(data.date);
    const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    return {
      slug,
      title: data.title,
      // CMS no longer has a separate SEO-description field (it was
      // redundant busywork duplicating the list excerpt) — fall back to
      // excerpt. `data.description` is only still read for the sake of
      // entries written before this field existed.
      description: data.description || data.excerpt,
      date,
      shortDate: formatShort(date),
      longDate: formatLong(date),
      category: data.category,
      // One field for both the list thumbnail and the entry page's own
      // hero image — no more filling in the same picture twice.
      thumbnail: data.heroImage,
      heroImage: data.heroImage,
      // Not a CMS field — nobody wants to hand-write alt text per entry.
      // The title is always required and describes the entry well enough
      // to stand in for thumbnail/hero alt text.
      imageAlt: data.imageAlt || data.title,
      excerpt: data.excerpt,
      // Single free-form markdown field (see admin/config.yml's `body`
      // field) — the CMS's markdown widget already has its own image
      // upload button, so a separate list-of-typed-blocks structure was
      // just extra ceremony for the same result.
      bodyHtml: fillImageFallbacks(md.render(content || ""), data.title),
    };
  });

  // 新到舊排序：首頁「最新日記」直接取前 3 筆、diary.html 全列表也是這個順序。
  entries.sort((a, b) => b.date - a.date);
  return entries;
};
