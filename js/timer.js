export function createTimer({ onUpdate, getIdleMs }) {
  let elapsedMs = 0;
  let lastTick = null;
  let running = false;
  let idleTimer = null;
  let idlePaused = false;

  function start() {
    if (running) return;
    running = true;
    lastTick = performance.now();
    idlePaused = false;
    onUpdate && onUpdate(getStatus());
    resetIdle();
  }

  function pause(reason) {
    if (!running) return;
    if (lastTick !== null) elapsedMs += performance.now() - lastTick;
    lastTick = null;
    running = false;
    if (reason === "idle") idlePaused = true;
    onUpdate && onUpdate(getStatus());
  }

  function tick() {
    if (!running) {
      running = true;
      lastTick = performance.now();
      idlePaused = false;
    }
    resetIdle();
    onUpdate && onUpdate(getStatus());
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    const ms = getIdleMs ? getIdleMs() : 0;
    if (!ms || ms <= 0) return;
    idleTimer = setTimeout(() => {
      if (running) pause("idle");
    }, ms);
  }

  function getElapsedMs() {
    if (running && lastTick !== null)
      return elapsedMs + (performance.now() - lastTick);
    return elapsedMs;
  }

  function setElapsedMs(ms) {
    elapsedMs = ms || 0;
    lastTick = null;
    running = false;
    idlePaused = false;
    clearTimeout(idleTimer);
  }

  function reset() {
    setElapsedMs(0);
  }

  function getStatus() {
    return { running, idlePaused, elapsedMs: getElapsedMs() };
  }

  return {
    start,
    pause,
    tick,
    resetIdle,
    getElapsedMs,
    setElapsedMs,
    reset,
    getStatus,
  };
}
