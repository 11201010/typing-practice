import { DEFAULT_BOOKS_URL, normalizeBooks } from "./article.js";
import { state } from "./state.js";
import { readStore, writeStore } from "./storage.js";

export function cloneBooks(src) {
  return JSON.parse(JSON.stringify(src));
}

export function loadBooks(store) {
  if (
    store.books &&
    typeof store.books === "object" &&
    Object.keys(store.books).length
  ) {
    state.books = store.books;
    return Promise.resolve(state.books);
  }
  return fetchBooksFromUrl(DEFAULT_BOOKS_URL)
    .then((books) => {
      state.books = books;
      saveBooks();
      return books;
    })
    .catch(() => {
      state.books = {};
      return state.books;
    });
}

export function saveBooks() {
  const store = readStore();
  store.books = state.books;
  writeStore(store);
}

export function makeKey(bookKey, articleKey) {
  return bookKey + "::" + articleKey;
}

export function parseKey(key) {
  const idx = key.indexOf("::");
  if (idx === -1) return { bookKey: "", articleKey: "" };
  return { bookKey: key.slice(0, idx), articleKey: key.slice(idx + 2) };
}

export function getArticle(bookKey, articleKey) {
  const b = state.books[bookKey];
  if (!b) return null;
  return (b.articles || {})[articleKey] || null;
}

export function firstArticleKey() {
  for (const bk of Object.keys(state.books)) {
    const arts = state.books[bk].articles || {};
    const ak = Object.keys(arts)[0];
    if (ak) return makeKey(bk, ak);
  }
  return "";
}

export function addBook(title) {
  const key =
    "book_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 6);
  state.books[key] = { title, articles: {} };
  saveBooks();
  return key;
}

export function addArticle(bookKey, title, body) {
  if (!state.books[bookKey]) return "";
  const ak =
    "a_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 6);
  state.books[bookKey].articles[ak] = { title, label: title, body };
  saveBooks();
  return makeKey(bookKey, ak);
}

export function fetchBooksFromUrl(url) {
  return fetch(url, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((json) => normalizeBooks(json))
    .then((books) => {
      if (!Object.keys(books).length) throw new Error("JSON 中沒有可用書籍");
      return books;
    });
}

export function mergeBooks(incoming) {
  const merged = {};
  const usedTitles = new Set(Object.values(state.books).map((b) => b.title));

  for (const bk of Object.keys(incoming)) {
    let newKey = bk;
    let n = 1;
    while (state.books[newKey] || merged[newKey]) {
      newKey = bk + "_" + n++;
    }
    let title = incoming[bk].title;
    if (usedTitles.has(title)) {
      let m = 2;
      while (usedTitles.has(title + "（" + m + "）")) m++;
      title = title + "（" + m + "）";
    }
    usedTitles.add(title);

    merged[newKey] = {
      title,
      articles: cloneBooks(incoming[bk].articles || {}),
    };
  }

  state.books = { ...state.books, ...merged };
  saveBooks();
  return Object.keys(merged).length;
}
