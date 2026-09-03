const KEY = "equiti:stale-chunk-reload";

export function isChunkLoadError(err) {
  const msg = String(err?.message || err?.payload?.message || err || "");
  const name = String(err?.name || "");
  return (
    name === "ChunkLoadError" ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Unable to preload CSS/i.test(msg) ||
    /Loading chunk [\w.-]+ failed/i.test(msg)
  );
}

export function reloadOnceForChunkError(err) {
  if (typeof window === "undefined") return false;
  if (err && !isChunkLoadError(err)) return false;
  try {
    if (sessionStorage.getItem(KEY) === "1") return false;
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked — still try reload */
  }
  window.location.reload();
  return true;
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
