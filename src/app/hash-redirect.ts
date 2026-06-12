// Runs as a side effect on import — MUST be imported before the router module,
// because `createBrowserRouter` reads `window.location` at module-eval time.
//
// Legacy / QR magic links use a hash route (e.g. "/#/task/<token>"). This app
// uses history routing, so rewrite "#/..." to a real path first; otherwise the
// router captures "/" (the hash is ignored) and the link lands on the home page.
if (typeof window !== "undefined" && window.location.hash.startsWith("#/")) {
  window.history.replaceState(null, "", window.location.hash.slice(1));
}
