import { readStore, writeStore, removeStore } from "./storage.js";
import { state, timer, setTimerUpdateHandler } from "./state.js";
import {
  cloneBooks,
  loadBooks,
  firstArticleKey,
  getArticle,
  parseKey,
} from "./books.js";
import {
  buildGridChars,
  applyFontFamily,
  applyFontSize,
  computeCols,
} from "./layout.js";
import {
  render,
  collectTypedSnapshot,
  focusCurrent,
  focusCell,
  moveFocus,
  isPunct,
} from "./grid.js";
import {
  saveProgress,
  saveProgressNow,
  applyArticleState,
} from "./progress.js";
import {
  buildTextOptions,
  updateTitle,
  updateEditButton,
  updateTimerLabel,
  updateHighlight,
  updateStats,
} from "./ui.js";
import { createDialogs } from "./dialogs.js";

/* ---------- DOM ---------- */
const gridEl = document.getElementById("grid");
const articleTitle = document.getElementById("articleTitle");
const textSelect = document.getElementById("textSelect");
const addBookBtn = document.getElementById("addBook");
const addArticleBtn = document.getElementById("addArticle");
const paraModeSelect = document.getElementById("paraModeSelect");
const toggleHint = document.getElementById("toggleHint");
const toggleVertical = document.getElementById("toggleVertical");
const toggleStats = document.getElementById("toggleStats");
const idleSelect = document.getElementById("idleSelect");
const fontFamilySelect = document.getElementById("fontFamilySelect");
const fontRange = document.getElementById("fontRange");
const fontSizeVal = document.getElementById("fontSizeVal");
const statDone = document.getElementById("statDone");
const statOk = document.getElementById("statOk");
const statErr = document.getElementById("statErr");
const statSpeed = document.getElementById("statSpeed");
const progressLabel = document.getElementById("progressLabel");
const saveStatus = document.getElementById("saveStatus");
const timerState = document.getElementById("timerState");
const editCustomBtn = document.getElementById("editCustom");

const refs = {
  gridEl,
  articleTitle,
  textSelect,
  addBookBtn,
  addArticleBtn,
  paraModeSelect,
  toggleHint,
  toggleVertical,
  toggleStats,
  idleSelect,
  fontFamilySelect,
  fontRange,
  fontSizeVal,
  statDone,
  statOk,
  statErr,
  statSpeed,
  progressLabel,
  saveStatus,
  timerState,
  editCustomBtn,
  customDialog: document.getElementById("customDialog"),
  customTitleInput: document.getElementById("customTitleInput"),
  customBodyInput: document.getElementById("customBodyInput"),
  customCancel: document.getElementById("customCancel"),
  customConfirm: document.getElementById("customConfirm"),
  bookDialog: document.getElementById("bookDialog"),
  bookModeSelect: document.getElementById("bookModeSelect"),
  bookTitleInput: document.getElementById("bookTitleInput"),
  bookUrlInput: document.getElementById("bookUrlInput"),
  bookManualField: document.getElementById("bookManualField"),
  bookUrlField: document.getElementById("bookUrlField"),
  bookCancel: document.getElementById("bookCancel"),
  bookConfirm: document.getElementById("bookConfirm"),
  newArticleDialog: document.getElementById("newArticleDialog"),
  articleBookSelect: document.getElementById("articleBookSelect"),
  articleTitleInput: document.getElementById("articleTitleInput"),
  articleBodyInput: document.getElementById("articleBodyInput"),
  newArticleCancel: document.getElementById("newArticleCancel"),
  newArticleConfirm: document.getElementById("newArticleConfirm"),
};

/* ---------- 共用 ctx ---------- */
const ctx = {
  gridEl,
  controls: {
    paraModeSelect,
    fontFamilySelect,
    fontRange,
    toggleHint,
    toggleStats,
  },
  saveStatus,
  updateHighlight: () => updateHighlight(gridEl, progressLabel),
  updateStats: () =>
    updateStats({ statDone, statOk, statErr, statSpeed, timerState }),
  saveProgress: () => saveProgress(ctx, false),
  saveProgressNow: () => saveProgressNow(ctx),
  focusCell: (i) => focusCell(i, ctx),
  focusCurrent: () => focusCurrent(ctx),
  moveFocus: (target) => moveFocus(target, ctx),
  updateTitle: () => updateTitle(articleTitle),
  buildTextOptions: () => buildTextOptions(textSelect),
};

setTimerUpdateHandler(() => {
  updateStats({ statDone, statOk, statErr, statSpeed, timerState });
});

/* ---------- 文章切換 ---------- */
function switchArticle(key, text, title) {
  saveProgress(ctx, true);
  state.currentKey = key;
  state.currentText = text;
  state.currentTitle = title;
  if (key === "custom") {
    state.currentBookKey = "";
    state.currentArticleKey = "";
  } else {
    const parsed = parseKey(key);
    state.currentBookKey = parsed.bookKey;
    state.currentArticleKey = parsed.articleKey;
  }
  const store = readStore();
  const stateData = store.articles[key] || null;

  ctx.updateTitle();
  updateEditButton(editCustomBtn);

  state.COLS = computeCols(gridEl);
  gridEl.classList.toggle("vertical", state.vertical);
  gridEl.style.setProperty("--cols", state.COLS);
  gridEl.style.setProperty("--rows", state.COLS);
  state.chars = buildGridChars(
    state.currentText,
    state.COLS,
    paraModeSelect.value,
  );
  render(gridEl, null, ctx);

  timer.reset();

  if (stateData) {
    applyArticleState(gridEl, stateData);
  } else {
    state.pos = 0;
    state.okCount = 0;
    state.errCount = 0;
    let j = 0;
    while (
      j < state.chars.length &&
      (state.chars[j] === undefined ||
        isPunct(state.chars[j]) ||
        state.chars[j] === " ")
    )
      j++;
    state.pos = j < state.chars.length ? j : 0;
  }

  ctx.updateHighlight();
  ctx.updateStats();
  ctx.focusCurrent();

  textSelect.value = key;
  saveStatus.textContent = stateData
    ? "　已載入本篇進度"
    : "　本篇尚無進度，從頭開始";
  setTimeout(() => {
    saveStatus.textContent = "";
  }, 1600);
}

/* ---------- 重新開始 ---------- */
function restartCurrent() {
  if (!state.currentKey) return;
  const store = readStore();
  delete store.articles[state.currentKey];
  writeStore(store);

  ctx.updateTitle();
  state.COLS = computeCols(gridEl);
  gridEl.style.setProperty("--cols", state.COLS);
  gridEl.style.setProperty("--rows", state.COLS);
  state.chars = buildGridChars(
    state.currentText,
    state.COLS,
    paraModeSelect.value,
  );
  render(gridEl, null, ctx);
  timer.reset();
  state.okCount = 0;
  state.errCount = 0;

  let j = 0;
  while (
    j < state.chars.length &&
    (state.chars[j] === undefined ||
      isPunct(state.chars[j]) ||
      state.chars[j] === " ")
  )
    j++;
  state.pos = j < state.chars.length ? j : 0;

  ctx.updateHighlight();
  ctx.updateStats();
  ctx.focusCurrent();
  saveStatus.textContent = "　本篇已重新開始";
  setTimeout(() => {
    saveStatus.textContent = "";
  }, 1500);
}

/* ---------- 對話框 ---------- */
const dialogs = createDialogs(refs, {
  switchArticle,
  buildTextOptions: ctx.buildTextOptions,
  updateTitle: ctx.updateTitle,
  saveProgressNow: ctx.saveProgressNow,
});

/* ---------- 事件 ---------- */
textSelect.addEventListener("change", () => {
  const v = textSelect.value;
  if (v === "custom") {
    const store = readStore();
    const customText = store.customText || "";
    const customTitle =
      (store.settings && store.settings.customTitle) || "自訂文章";
    if (!customText) {
      dialogs.openCustomDialog();
      return;
    }
    switchArticle("custom", customText, customTitle);
    return;
  }
  const parsed = parseKey(v);
  const a = getArticle(parsed.bookKey, parsed.articleKey);
  if (!a) return;
  switchArticle(v, a.body, a.title);
});

addBookBtn.addEventListener("click", dialogs.openBookDialog);
addArticleBtn.addEventListener("click", dialogs.openNewArticleDialog);

editCustomBtn.addEventListener("click", () => {
  if (state.currentKey !== "custom") return;
  dialogs.openCustomDialog();
});

paraModeSelect.addEventListener("change", () => {
  const snapshot = collectTypedSnapshot(gridEl);
  state.COLS = computeCols(gridEl);
  state.chars = buildGridChars(
    state.currentText,
    state.COLS,
    paraModeSelect.value,
  );
  render(gridEl, snapshot, ctx);
  ctx.updateHighlight();
  ctx.focusCurrent();
  ctx.saveProgress();
});

toggleHint.addEventListener("change", () => {
  document.body.classList.toggle("no-hint", !toggleHint.checked);
  ctx.saveProgress();
});

toggleVertical.addEventListener("change", () => {
  state.vertical = toggleVertical.checked;
  gridEl.classList.toggle("vertical", state.vertical);
  gridEl.scrollLeft = 0;
  gridEl.scrollTop = 0;

  const snapshot = collectTypedSnapshot(gridEl);
  state.COLS = computeCols(gridEl);
  state.chars = buildGridChars(
    state.currentText,
    state.COLS,
    paraModeSelect.value,
  );
  render(gridEl, snapshot, ctx);
  ctx.updateHighlight();
  ctx.focusCurrent();
  ctx.saveProgress();
});

toggleStats.addEventListener("change", () => {
  document.body.classList.toggle("hide-stats", !toggleStats.checked);
  ctx.saveProgress();
});

idleSelect.addEventListener("change", () => {
  state.idleMs = parseInt(idleSelect.value, 10) || 0;
  timer.resetIdle();
  ctx.saveProgress();
});

fontFamilySelect.addEventListener("change", () => {
  applyFontFamily(fontFamilySelect.value);
  const snapshot = collectTypedSnapshot(gridEl);
  state.COLS = computeCols(gridEl);
  state.chars = buildGridChars(
    state.currentText,
    state.COLS,
    paraModeSelect.value,
  );
  render(gridEl, snapshot, ctx);
  ctx.updateHighlight();
  ctx.focusCurrent();
  ctx.saveProgress();
});

fontRange.addEventListener("input", () => {
  applyFontSize(parseInt(fontRange.value, 10), fontSizeVal);
  const snapshot = collectTypedSnapshot(gridEl);
  state.COLS = computeCols(gridEl);
  state.chars = buildGridChars(
    state.currentText,
    state.COLS,
    paraModeSelect.value,
  );
  render(gridEl, snapshot, ctx);
  ctx.updateHighlight();
  ctx.focusCurrent();
  ctx.saveProgress();
});

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const snapshot = collectTypedSnapshot(gridEl);
    state.COLS = computeCols(gridEl);
    state.chars = buildGridChars(
      state.currentText,
      state.COLS,
      paraModeSelect.value,
    );
    render(gridEl, snapshot, ctx);
    ctx.updateHighlight();
    ctx.focusCurrent();
    ctx.saveProgress();
  }, 150);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    timer.pause("hidden");
    ctx.saveProgressNow();
  } else {
    if (state.okCount + state.errCount > 0) timer.start();
    else updateTimerLabel(timerState);
  }
});

window.addEventListener("blur", () => {
  timer.pause("blur");
});
window.addEventListener("focus", () => {
  if (state.okCount + state.errCount > 0) timer.start();
  else updateTimerLabel(timerState);
});
window.addEventListener("beforeunload", () => {
  timer.pause("unload");
  ctx.saveProgressNow();
});

document.getElementById("restart").addEventListener("click", () => {
  if (!confirm("重新開始「本篇」？本篇已打的內容會清除。")) return;
  restartCurrent();
});

document.getElementById("clearSaved").addEventListener("click", async () => {
  if (!confirm("清除「全部」進度與自訂書籍？所有已打的內容都會清除。")) return;
  removeStore();
  state.books = {};
  // 重新載入預設 books.json
  await loadBooks({ books: null, settings: {} });
  state.currentBookKey = "";
  state.currentArticleKey = "";
  buildTextOptions(textSelect);
  const key = firstArticleKey();
  if (key) {
    const parsed = parseKey(key);
    const a = getArticle(parsed.bookKey, parsed.articleKey);
    if (a) switchArticle(key, a.body, a.title);
  }
  updateEditButton(editCustomBtn);
  saveStatus.textContent = "　已清除全部進度";
  setTimeout(() => {
    saveStatus.textContent = "";
  }, 1500);
});

/* ---------- 初始化 ---------- */
(async function init() {
  const store = readStore();
  await loadBooks(store);

  const st = store.settings || {};
  paraModeSelect.value = st.paraMode || "blank";
  toggleHint.checked = st.showHint !== false;
  toggleStats.checked = st.showStats !== false;
  document.body.classList.toggle("no-hint", !toggleHint.checked);
  document.body.classList.toggle("hide-stats", !toggleStats.checked);

  state.idleMs = typeof st.idleMs === "number" ? st.idleMs : 5000;
  idleSelect.value = String(state.idleMs);
  if (!idleSelect.value) idleSelect.value = "0";

  state.vertical = !!st.vertical;
  toggleVertical.checked = state.vertical;
  fontFamilySelect.value = st.fontFamily || "serif";
  applyFontFamily(fontFamilySelect.value);
  fontRange.value = st.fontSize || 22;
  applyFontSize(st.fontSize || 22, fontSizeVal);

  buildTextOptions(textSelect);

  let key = st.currentKey || "";
  if (key === "custom") {
    const customText = store.customText || "";
    const customTitle = st.customTitle || "自訂文章";
    if (customText) {
      switchArticle("custom", customText, customTitle);
    } else {
      key = firstArticleKey();
    }
  } else if (
    !key ||
    !getArticle(parseKey(key).bookKey, parseKey(key).articleKey)
  ) {
    key = firstArticleKey();
  }

  if (key && key !== "custom") {
    const parsed = parseKey(key);
    const a = getArticle(parsed.bookKey, parsed.articleKey);
    if (a) switchArticle(key, a.body, a.title);
  }

  updateEditButton(editCustomBtn);
  updateTimerLabel(timerState);
})();
