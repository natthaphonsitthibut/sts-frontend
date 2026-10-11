/**
 * The one place that says which pages are public link surfaces — reached by a
 * signed link or a public flow, never by the staff session. The API client
 * reads it for both of its decisions, so a new public page is classified once
 * instead of in two hand-kept lists that drift apart.
 */

/** Path prefixes: the page and everything under it. */
const PUBLIC_LINK_PATH_PREFIXES = [
  "/task",
  "/referral-report",
  "/classroom",
  "/araid",
  "/apply",
  "/line-link",
] as const;

/** Old classroom links still land here before the redirect to /classroom. */
const PUBLIC_LINK_EXACT_PATHS = ["/check-in"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * The classroom link surface (roster, check-in, student profile). It carries
 * its own link token, so the staff magic-link headers must stay off it.
 */
export function isPublicClassroomLinkPath(pathname: string): boolean {
  return matchesPrefix(pathname, "/classroom") || pathname === "/check-in";
}

/**
 * A page whose 401 means "this link or its link session is no longer valid",
 * not "the staff session lapsed". The page shows its own state for that; the
 * staff session cached in the same browser must survive it.
 */
export function isPublicLinkPath(pathname: string): boolean {
  return (
    PUBLIC_LINK_EXACT_PATHS.some((path) => pathname === path) ||
    PUBLIC_LINK_PATH_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  );
}
