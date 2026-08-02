// 分類代碼 → 中文標籤。diary 與 gallery 各自維護自己的措辭
// （例如同一個 trip 篩選鍵,diary 頁用「出遊」、gallery 頁用「旅行」），
// 沿用 migration 前網站既有的用字,沒有強制統一。
module.exports = {
  diary: {
    daily: "日常",
    anniversary: "紀念日",
    trip: "出遊",
    food: "美食",
  },
  gallery: {
    daily: "日常",
    trip: "旅行",
    anniversary: "紀念日",
    food: "美食",
  },
};
