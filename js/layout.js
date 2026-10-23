import { FONT_FAMILIES } from "./article.js";
import { state } from "./state.js";

const PARA_END_RE = /[。！？!?]$/;
export const INDENT = 2;

export function splitParagraphs(text, mode) {
  if (mode === "sentence") {
    const paras = [];
    let cur = "";
    for (const ch of text) {
      if (ch === "\n" || ch === "\r") continue;
      cur += ch;
      if (PARA_END_RE.test(ch)) {
        paras.push(cur);
        cur = "";
      }
    }
    if (cur.trim()) paras.push(cur);
    return paras;
  }
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, "").trim())
    .filter((p) => p.length > 0);
}

export function buildGridChars(text, cols, mode) {
  const paras = splitParagraphs(text, mode);
  const out = [];
  for (const p of paras) {
    for (let k = 0; k < INDENT; k++) out.push(" ");
    for (const ch of p) out.push(ch === " " ? " " : ch);
    while (out.length % cols !== 0) out.push(" ");
  }
  return out;
}

export function applyFontFamily(key) {
  const family = FONT_FAMILIES[key] || FONT_FAMILIES.serif;
  document.documentElement.style.setProperty("--font-family", family);
}

export function getCellPx() {
  const fs =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--fs"),
    ) || 22;
  return fs * 1.6;
}

export function getVerticalGridHeight() {
  const vh = window.innerHeight;
  const reserved = 320;
  return Math.max(200, vh - reserved);
}

export function computeCols(gridEl) {
  const cell = getCellPx();
  if (state.vertical) {
    const gridH = getVerticalGridHeight();
    gridEl.style.setProperty("--grid-h", gridH + "px");
    return Math.max(1, Math.floor((gridH - 2) / cell));
  }
  const style = getComputedStyle(gridEl);
  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  const usable = gridEl.clientWidth - padL - padR;
  return Math.max(1, Math.floor(usable / cell));
}

export function applyFontSize(px, fontSizeValEl) {
  document.documentElement.style.setProperty("--fs", px + "px");
  if (fontSizeValEl) fontSizeValEl.textContent = px + "px";
}
