const STORAGE_KEY = "articleTypingPractice.v5";
const VERSION = 5;

export function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return { version: VERSION, books: null, articles: {}, settings: {} };
    const s = JSON.parse(raw);
    if (!s || s.version !== VERSION)
      return { version: VERSION, books: null, articles: {}, settings: {} };
    if (!s.articles) s.articles = {};
    if (!s.settings) s.settings = {};
    return s;
  } catch (e) {
    return { version: VERSION, books: null, articles: {}, settings: {} };
  }
}

export function writeStore(store) {
  try {
    store.version = VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (e) {
    return false;
  }
}

export function removeStore() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
