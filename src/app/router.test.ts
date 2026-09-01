import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { router } from "./router";

/**
 * The whole route table now sits under one pathless route that carries the
 * `errorElement`. A pathless route must not change what matches, so pin that:
 * the paths below are the entry points users and links arrive on.
 */
describe("router", () => {
  it.each([
    "/",
    "/student-risk-report/risk",
    "/task/abc123",
    "/task/abc123/report",
    "/task/google-callback",
    "/line-link",
    "/forbidden",
    "/definitely-not-a-page",
  ])("still matches %s", (pathname) => {
    const matches = matchRoutes(router.routes, pathname);

    expect(matches).not.toBeNull();
    // The pathless wrapper is the first match; a real route has to follow it.
    expect(matches!.length).toBeGreaterThan(1);
    expect(matches!.at(-1)!.route.element).toBeDefined();
  });

  it("routes every entry point through the error boundary wrapper", () => {
    expect(router.routes).toHaveLength(1);
    expect(router.routes[0].path).toBeUndefined();
    expect(router.routes[0].errorElement).toBeDefined();
  });
});
