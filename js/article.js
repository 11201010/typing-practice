export const DEFAULT_BOOKS_URL = "./books.json";

export const FONT_FAMILIES = {
  sans: '"Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC",sans-serif',
  serif: '"Noto Serif TC","Songti TC","PMingLiU","SimSun",serif',
  kai: '"BiauKai","DFKai-SB","Kaiti TC","STKaiti","KaiTi","楷体",serif',
};

/* 把任意書籍 JSON 正規化成 { bookKey: { title, articles: { ak: { title, label, body } } } } */
export function normalizeBooks(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;

  for (const bk of Object.keys(raw)) {
    const b = raw[bk] || {};
    const title =
      typeof b.title === "string" && b.title.trim() ? b.title.trim() : bk;
    const articlesIn =
      b.articles && typeof b.articles === "object" ? b.articles : {};
    const articles = {};

    for (const ak of Object.keys(articlesIn)) {
      const a = articlesIn[ak] || {};
      const body = typeof a.body === "string" ? a.body : "";
      if (!body.trim()) continue;
      const t =
        typeof a.title === "string" && a.title.trim() ? a.title.trim() : ak;
      articles[ak] = {
        title: t,
        label:
          typeof a.label === "string" && a.label.trim() ? a.label.trim() : t,
        body,
      };
    }

    out[bk] = { title, articles };
  }
  return out;
}
