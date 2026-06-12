// Runs as a side effect on import — MUST be imported before the router module,
// because `createBrowserRouter` reads `window.location` at module-eval time.
//
// Legacy / QR magic links use a hash route (e.g. "/#/task/<token>"). This app
// uses history routing, so a "#/..." URL must be turned into a real path,
// otherwise the router captures "/" (the hash is ignored) and the link lands on
// the home page.
function hashToPath(): string | null {
  return typeof window !== "undefined" && window.location.hash.startsWith("#/")
    ? window.location.hash.slice(1)
    : null;
}

// Initial load: rewrite in place so the router reads the corrected URL.
const initialPath = hashToPath();
if (initialPath) {
  window.history.replaceState(null, "", initialPath);
}

// Pasting a "#/..." link while the app is already open only changes the hash
// (no reload), so the router never re-reads it — force a real navigation.
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const path = hashToPath();
    if (path) {
      window.location.replace(path);
    }
  });
}
