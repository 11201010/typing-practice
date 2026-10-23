import { state, timer } from "./state.js";

const PUNCT_RE = new RegExp(
  "[" +
    "\\s" +
    "，。、；：？！「」『』（）〈〉《》【】〔〕…—·．" +
    ",.;:?!'\"()\\[\\]{}<>\\/\\\\|`~@#$%^&*_+=－" +
    "“”‘’〝〞＂＇" +
    "\\u2460-\\u2473" +
    "\\u2474-\\u2487" +
    "\\u2488-\\u249B" +
    "\\u24EA" +
    "]",
);

export function isPunct(ch) {
  return ch !== undefined && PUNCT_RE.test(ch);
}
export function isSpace(ch) {
  return ch === undefined || ch === " ";
}

export function countTypable() {
  let n = 0;
  for (const ch of state.chars)
    if (ch !== undefined && !isPunct(ch) && ch !== " ") n++;
  return n;
}

export function nextTypable(i) {
  for (let j = i + 1; j < state.chars.length; j++) {
    if (
      state.chars[j] !== undefined &&
      !isPunct(state.chars[j]) &&
      state.chars[j] !== " "
    )
      return j;
  }
  return -1;
}
export function prevTypable(i) {
  for (let j = i - 1; j >= 0; j--) {
    if (
      state.chars[j] !== undefined &&
      !isPunct(state.chars[j]) &&
      state.chars[j] !== " "
    )
      return j;
  }
  return -1;
}
export function findLineStart(i) {
  const base = i - (i % state.COLS);
  for (let j = base; j < base + state.COLS && j < state.chars.length; j++) {
    if (
      state.chars[j] !== undefined &&
      !isPunct(state.chars[j]) &&
      state.chars[j] !== " "
    )
      return j;
  }
  return i;
}
export function findLineEnd(i) {
  const base = i - (i % state.COLS);
  let last = i;
  for (let j = base; j < base + state.COLS && j < state.chars.length; j++) {
    if (
      state.chars[j] !== undefined &&
      !isPunct(state.chars[j]) &&
      state.chars[j] !== " "
    )
      last = j;
  }
  return last;
}

export function bindCell(cell, typed, i, ctx) {
  typed.addEventListener("compositionstart", () => {
    state.composing = true;
  });
  typed.addEventListener("compositionend", (e) => {
    state.composing = false;
    state.lastCommitAt = Date.now();
    commitCell(cell, typed, i, ctx);
    e.stopPropagation();
  });
  typed.addEventListener("input", (e) => {
    if (state.composing) return;
    if (Date.now() - state.lastCommitAt < 60) return;
    commitCell(cell, typed, i, ctx);
  });

  typed.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      return;
    }
    const idx = i;
    const v = state.vertical;
    const C = state.COLS;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      ctx.moveFocus(v ? nextTypable(idx) : idx + C);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      ctx.moveFocus(v ? prevTypable(idx) : idx - C);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      ctx.moveFocus(v ? idx + C : prevTypable(idx));
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      ctx.moveFocus(v ? idx - C : nextTypable(idx));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      ctx.moveFocus(findLineStart(idx));
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      ctx.moveFocus(findLineEnd(idx));
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      if (typed.textContent.trim()) {
        clearTyped(cell, typed, i, ctx);
      } else {
        const prev = prevTypable(i);
        if (prev !== -1) {
          const pcell = ctx.gridEl.children[prev];
          const ptyped = pcell.querySelector(".typed");
          clearTyped(pcell, ptyped, prev, ctx);
          ctx.focusCell(prev);
        }
      }
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      if (typed.textContent.trim()) {
        clearTyped(cell, typed, i, ctx);
      } else {
        const next = nextTypable(i);
        if (next !== -1) {
          const ncell = ctx.gridEl.children[next];
          const ntyped = ncell.querySelector(".typed");
          clearTyped(ncell, ntyped, next, ctx);
        }
      }
      return;
    }
  });

  typed.addEventListener("focus", () => {
    if (i !== state.pos && !state.processing) {
      state.pos = i;
      ctx.updateHighlight();
      ctx.saveProgress();
    }
  });
}

export function clearTyped(cell, typed, i, ctx) {
  typed.textContent = "";
  const wasDone = cell.classList.contains("done");
  const wasWrong = cell.classList.contains("wrong");
  cell.classList.remove("done", "wrong");
  cell.title = "";
  if (wasDone) state.okCount = Math.max(0, state.okCount - 1);
  if (wasWrong) state.errCount = Math.max(0, state.errCount - 1);
  if (i < state.pos) {
    state.pos = i;
    ctx.updateHighlight();
  }
  ctx.updateStats();
  ctx.saveProgress();
}

export function commitCell(cell, typed, i, ctx) {
  if (state.processing) return;
  if (isPunct(state.chars[i]) || state.chars[i] === " ") return;
  const raw = (typed.textContent || "").replace(/\s/g, "");
  if (!raw) return;
  state.processing = true;

  const target = state.chars[i];
  const char = [...raw][0];
  const isRight = char === target;

  typed.textContent = "";
  const span = document.createElement("span");
  span.className = "ch";
  span.textContent = char;
  typed.appendChild(span);

  const wasDone = cell.classList.contains("done");
  const wasWrong = cell.classList.contains("wrong");

  if (isRight) {
    cell.classList.add("done");
    cell.classList.remove("wrong");
    cell.title = "";
    if (!wasDone && !wasWrong) state.okCount++;
  } else {
    cell.classList.add("wrong");
    cell.classList.remove("done");
    cell.title = `正解：${target}（你打了：${char}）`;
    if (!wasDone && !wasWrong) state.errCount++;
  }

  timer.tick();

  if (i === state.pos) {
    state.pos = nextTypable(state.pos);
    if (state.pos === -1) state.pos = state.chars.length;
    ctx.updateHighlight();
    ctx.updateStats();
    ctx.focusCurrent();
  } else {
    ctx.updateStats();
  }

  state.processing = false;
  ctx.saveProgress();
}

export function moveFocus(target, ctx) {
  if (target < 0) target = 0;
  if (target >= state.chars.length) target = state.chars.length - 1;
  let t = target;
  const step = target >= state.pos ? 1 : -1;
  while (
    t >= 0 &&
    t < state.chars.length &&
    (state.chars[t] === undefined ||
      isPunct(state.chars[t]) ||
      state.chars[t] === " ")
  ) {
    t += step;
  }
  if (t < 0) t = 0;
  if (t >= state.chars.length) t = state.chars.length - 1;
  state.pos = t;
  ctx.updateHighlight();
  ctx.focusCell(t);
  scrollCellIntoView(t, ctx);
  ctx.saveProgress();
}

export function focusCell(i, ctx) {
  const c = ctx.gridEl.children[i];
  if (!c) return;
  const typed = c.querySelector(".typed");
  if (typed && typed.getAttribute("contenteditable") === "true") {
    typed.focus();
    const range = document.createRange();
    range.selectNodeContents(typed);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function focusCurrent(ctx) {
  if (state.pos >= state.chars.length) return;
  let j = state.pos;
  while (
    j < state.chars.length &&
    (state.chars[j] === undefined ||
      isPunct(state.chars[j]) ||
      state.chars[j] === " ")
  )
    j++;
  if (j !== state.pos) {
    state.pos = j;
    ctx.updateHighlight();
  }
  focusCell(state.pos, ctx);
  scrollCellIntoView(state.pos, ctx);
}

export function scrollCellIntoView(i, ctx) {
  const cell = ctx.gridEl.children[i];
  if (!cell) return;
  const gr = ctx.gridEl.getBoundingClientRect();
  const cr = cell.getBoundingClientRect();
  const margin = 32;

  if (state.vertical) {
    if (cr.left < gr.left + margin)
      ctx.gridEl.scrollLeft -= gr.left + margin - cr.left;
    else if (cr.right > gr.right - margin)
      ctx.gridEl.scrollLeft += cr.right - (gr.right - margin);
  } else {
    if (cr.top < gr.top + margin)
      ctx.gridEl.scrollTop -= gr.top + margin - cr.top;
    else if (cr.bottom > gr.bottom - margin)
      ctx.gridEl.scrollTop += cr.bottom - (gr.bottom - margin);
  }
}

export function render(gridEl, snapshot, ctx) {
  gridEl.innerHTML = "";
  gridEl.classList.toggle("vertical", state.vertical);
  gridEl.style.setProperty("--cols", state.COLS);
  gridEl.style.setProperty("--rows", state.COLS);

  let typedIdx = 0;
  const total = Math.ceil(state.chars.length / state.COLS) * state.COLS;
  for (let i = 0; i < total; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;

    const ch = state.chars[i];
    const punct = isPunct(ch);
    const blank = isSpace(ch);

    const hint = document.createElement("span");
    hint.className = "hintChar";
    hint.textContent = blank ? "" : ch;
    cell.appendChild(hint);

    const typed = document.createElement("div");
    typed.className = "typed";
    typed.setAttribute("contenteditable", "true");
    typed.setAttribute("inputmode", "text");
    typed.setAttribute("autocorrect", "off");
    typed.setAttribute("autocapitalize", "off");
    typed.setAttribute("spellcheck", "false");
    cell.appendChild(typed);

    if (blank) {
      cell.classList.add("blank");
      typed.setAttribute("contenteditable", "false");
    } else if (punct) {
      cell.classList.add("punct");
      typed.setAttribute("contenteditable", "false");
    } else {
      if (snapshot && snapshot[typedIdx]) {
        const s = snapshot[typedIdx];
        if (s.text) {
          const span = document.createElement("span");
          span.className = "ch";
          span.textContent = s.text;
          typed.appendChild(span);
          if (s.done) cell.classList.add("done");
          if (s.wrong) cell.classList.add("wrong");
          if (s.title) cell.title = s.title;
        }
      }
      typedIdx++;
    }

    bindCell(cell, typed, i, ctx);
    gridEl.appendChild(cell);
  }
}

export function collectTypedSnapshot(gridEl) {
  const arr = [];
  gridEl.querySelectorAll(".cell").forEach((cell) => {
    if (cell.classList.contains("punct") || cell.classList.contains("blank"))
      return;
    const typedEl = cell.querySelector(".typed");
    arr.push({
      text: typedEl ? typedEl.textContent.trim() : "",
      done: cell.classList.contains("done"),
      wrong: cell.classList.contains("wrong"),
      title: cell.title || "",
    });
  });
  return arr;
}
