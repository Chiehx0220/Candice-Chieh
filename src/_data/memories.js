const gallery = require("./gallery.js");

// "On this day" throwback groups, computed against the actual build date —
// see .github/workflows/deploy.yml's daily schedule trigger, which exists
// specifically so this doesn't just go stale between content edits.
module.exports = function () {
  const photos = gallery();
  const today = new Date();
  const byLabel = new Map();

  function addMatch(label, sortKey, photo) {
    if (!byLabel.has(label)) byLabel.set(label, { label, sortKey, photos: [] });
    byLabel.get(label).photos.push(photo);
  }

  // Exactly N years ago, same month + day.
  photos.forEach((photo) => {
    const d = photo.date;
    if (!d || isNaN(d.getTime())) return;
    if (d.getMonth() !== today.getMonth() || d.getDate() !== today.getDate()) return;
    const yearsAgo = today.getFullYear() - d.getFullYear();
    if (yearsAgo <= 0) return;
    const label = yearsAgo === 1 ? "一年前的今天" : `${yearsAgo} 年前的今天`;
    addMatch(label, yearsAgo * 100, photo);
  });

  // Exactly 1 month ago, same day-of-month. Guarded against JS Date rolling
  // into a third month when the target day doesn't exist (e.g. asking for
  // "1 month before March 31" naively lands on ~March 3, not February).
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const expectedMonth = (((today.getMonth() - 1) % 12) + 12) % 12;
  if (oneMonthAgo.getMonth() === expectedMonth) {
    photos.forEach((photo) => {
      const d = photo.date;
      if (!d || isNaN(d.getTime())) return;
      if (
        d.getFullYear() === oneMonthAgo.getFullYear() &&
        d.getMonth() === oneMonthAgo.getMonth() &&
        d.getDate() === oneMonthAgo.getDate()
      ) {
        addMatch("一個月前的今天", 1, photo);
      }
    });
  }

  return Array.from(byLabel.values()).sort((a, b) => a.sortKey - b.sortKey);
};
