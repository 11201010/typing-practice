import { state, timer } from "./state.js";
import { readStore, writeStore } from "./storage.js";
import { isPunct } from "./grid.js";

export function collectCurrentArticleState(gridEl) {
  const typedData = [];
  gridEl.querySelectorAll(".cell").forEach((cell) => {
    if (cell.classList.contains("punct") || cell.classList.contains("blank"))
      return;
    const typedEl = cell.querySelector(".typed");
    typedData.push({
      t: typedEl ? typedEl.textContent.trim() : "",
      d: cell.classList.contains("done"),
      w: cell.classList.contains("wrong"),
    });
  });

  return {
    typedData,
    pos: state.pos,
    okCount: state.okCount,
    errCount: state.errCount,
    elapsedMs: timer.getElapsedMs(),
    savedAt: Date.now(),
  };
}

export function buildSettings(controls) {
  return {
    paraMode: controls.paraModeSelect.value,
    vertical: state.vertical,
    fontFamily: controls.fontFamilySelect.value,
    fontSize: parseInt(controls.fontRange.value, 10),
    showHint: controls.toggleHint.checked,
    showStats: controls.toggleStats.checked,
    idleMs: state.idleMs,
    currentKey: state.currentKey,
  };
}

let saveTimer = null;

export function saveProgress(ctx, immediate) {
  if (!state.currentKey) return;
  clearTimeout(saveTimer);
  if (immediate) {
    saveProgressNow(ctx);
  } else {
    saveTimer = setTimeout(() => saveProgressNow(ctx), 250);
  }
}

export function saveProgressNow(ctx) {
  const store = readStore();
  store.books = state.books;
  store.settings = buildSettings(ctx.controls);
  if (state.currentKey && state.currentKey !== "custom") {
    store.articles[state.currentKey] = collectCurrentArticleState(ctx.gridEl);
  }
  const ok = writeStore(store);
  ctx.saveStatus.textContent = ok ? "　已保存" : "　無法保存";
  setTimeout(() => {
    ctx.saveStatus.textContent = "";
  }, 1200);
}

export function applyArticleState(gridEl, stateData) {
  if (!stateData) return;
  const typedData = stateData.typedData || [];
  let idx = 0;
  gridEl.querySelectorAll(".cell").forEach((cell) => {
    if (cell.classList.contains("punct") || cell.classList.contains("blank"))
      return;
    const data = typedData[idx++];
    if (!data) return;
    const typed = cell.querySelector(".typed");
    if (data.t && typed) {
      typed.textContent = "";
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = data.t;
      typed.appendChild(span);
      if (data.d) cell.classList.add("done");
      if (data.w) cell.classList.add("wrong");
    }
  });

  state.okCount = stateData.okCount || 0;
  state.errCount = stateData.errCount || 0;
  timer.setElapsedMs(stateData.elapsedMs || 0);
  state.pos = typeof stateData.pos === "number" ? stateData.pos : 0;

  let j = state.pos;
  while (
    j < state.chars.length &&
    (state.chars[j] === undefined ||
      isPunct(state.chars[j]) ||
      state.chars[j] === " ")
  )
    j++;
  state.pos = j < state.chars.length ? j : Math.max(0, state.chars.length - 1);
}
