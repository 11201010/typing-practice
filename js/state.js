import { createTimer } from "./timer.js";

export const state = {
  books: null,
  currentKey: "",
  currentBookKey: "",
  currentArticleKey: "",
  currentText: "",
  currentTitle: "",

  COLS: 20,
  chars: [],
  pos: 0,
  okCount: 0,
  errCount: 0,

  composing: false,
  processing: false,
  lastCommitAt: 0,
  vertical: false,
  idleMs: 5000,
};

let timerUpdateHandler = null;

export function setTimerUpdateHandler(fn) {
  timerUpdateHandler = fn;
}

export const timer = createTimer({
  getIdleMs: () => state.idleMs,
  onUpdate: () => {
    if (timerUpdateHandler) timerUpdateHandler();
  },
});
