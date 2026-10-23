import { state, timer } from "./state.js";
import { makeKey } from "./books.js";
import { countTypable } from "./grid.js";

export function buildTextOptions(textSelect) {
  textSelect.innerHTML = "";

  for (const bk of Object.keys(state.books)) {
    const book = state.books[bk];
    const group = document.createElement("optgroup");
    group.label = book.title || bk;

    const arts = book.articles || {};
    for (const ak of Object.keys(arts)) {
      const a = arts[ak];
      const opt = document.createElement("option");
      opt.value = makeKey(bk, ak);
      opt.textContent = a.label || a.title || ak;
      group.appendChild(opt);
    }
    textSelect.appendChild(group);
  }

  const customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = "自訂文章…";
  textSelect.appendChild(customOpt);

  if (state.currentKey) {
    textSelect.value = state.currentKey;
  }
}

export function buildBookSelectForNewArticle(articleBookSelect) {
  articleBookSelect.innerHTML = "";
  for (const bk of Object.keys(state.books)) {
    const opt = document.createElement("option");
    opt.value = bk;
    opt.textContent = state.books[bk].title || bk;
    articleBookSelect.appendChild(opt);
  }
  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "＋ 新書…";
  articleBookSelect.appendChild(newOpt);
}

export function updateTitle(articleTitle) {
  articleTitle.textContent = state.currentTitle || "";
}

export function updateEditButton(editCustomBtn) {
  editCustomBtn.disabled = state.currentKey !== "custom";
}

export function updateTimerLabel(timerState) {
  const st = timer.getStatus();
  if (state.okCount + state.errCount === 0 && st.elapsedMs === 0) {
    timerState.textContent = "";
    timerState.classList.remove("paused");
    return;
  }
  if (st.running) {
    timerState.textContent = "（計時中）";
    timerState.classList.remove("paused");
  } else if (st.idlePaused) {
    timerState.textContent = "（閒置暫停）";
    timerState.classList.add("paused");
  } else {
    timerState.textContent = "（已暫停）";
    timerState.classList.add("paused");
  }
}

export function updateHighlight(gridEl, progressLabel) {
  gridEl.querySelectorAll(".cell").forEach((c) => {
    c.classList.remove("current");
  });
  const cur = gridEl.children[state.pos];
  if (cur) cur.classList.add("current");
  const typedCount = Math.min(state.okCount + state.errCount, countTypable());
  progressLabel.textContent = `${typedCount} / ${countTypable()}`;
}

export function updateStats(refs) {
  refs.statDone.textContent = Math.min(
    state.okCount + state.errCount,
    countTypable(),
  );
  refs.statOk.textContent = state.okCount;
  refs.statErr.textContent = state.errCount;

  const typed = state.okCount + state.errCount;
  const ms = timer.getElapsedMs();
  if (typed > 0 && ms > 1000) {
    refs.statSpeed.textContent = Math.round(typed / (ms / 60000));
  } else {
    refs.statSpeed.textContent = 0;
  }
  updateTimerLabel(refs.timerState);
}
