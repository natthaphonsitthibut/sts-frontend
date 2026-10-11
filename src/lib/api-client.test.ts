import { afterEach, describe, expect, it, vi } from "vitest";

const STAFF_USER = JSON.stringify({ id: 7, roles: ["DIRECTOR"] });
const SCHOOL_FILTER = JSON.stringify({
  province: "",
  district: "",
  subDistrict: "",
  schoolId: "12",
  schoolName: "โรงเรียนทดสอบ",
  userId: 7,
});

function storedSchoolId(): string {
  const raw = window.localStorage.getItem("sts_school_filter");
  return raw ? (JSON.parse(raw) as { schoolId: string }).schoolId : "";
}

/**
 * A fresh client per test: the interceptor remembers it already handled an
 * expired session, and the school filter store reads storage at import.
 */
async function requestFailingWith(
  status: number,
  pathname: string,
  options: { signedIn?: boolean } = {},
): Promise<{ schoolId: string }> {
  if (options.signedIn ?? true) {
    window.localStorage.setItem("sts_user", STAFF_USER);
    window.localStorage.setItem("admin_access", "true");
  }
  window.localStorage.setItem("sts_school_filter", SCHOOL_FILTER);
  window.history.pushState({}, "", pathname);

  vi.resetModules();
  const { apiClient } = await import("./api-client");
  const { useSchoolFilterStore } =
    await import("../features/school-filter/store/school-filter.store");
  apiClient.defaults.adapter = async (config): Promise<never> => {
    throw Object.assign(new Error(`Request failed with status ${status}`), {
      config,
      response: { status, data: {} },
    });
  };

  await expect(apiClient.get("/anything")).rejects.toMatchObject({
    response: { status },
  });
  return { schoolId: useSchoolFilterStore.getState().schoolId };
}

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("api client 401 handling", () => {
  it("signs a staff account out when its own session lapsed", async () => {
    // jsdom cannot navigate; the redirect is reported, not performed.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { schoolId } = await requestFailingWith(401, "/students");

    expect(window.localStorage.getItem("sts_user")).toBeNull();
    expect(schoolId).toBe("");
    expect(storedSchoolId()).toBe("");
  });

  it("still signs out on a staff page that shares a public prefix", async () => {
    // Regression: `/classrooms` matched the old `startsWith("/classroom")`
    // check, so a lapsed session there never reached the login page.
    vi.spyOn(console, "error").mockImplementation(() => {});
    await requestFailingWith(401, "/classrooms");

    expect(window.localStorage.getItem("sts_user")).toBeNull();
    expect(storedSchoolId()).toBe("");
  });

  // Regression: a stale referral link session answered 401 on a page the
  // interceptor did not know was public, which wiped the staff session and
  // school filter of whoever had opened the agency's link in that browser.
  it("keeps the staff session and filter on the referral report link", async () => {
    const { schoolId } = await requestFailingWith(
      401,
      "/referral-report/link-token",
    );

    expect(window.localStorage.getItem("sts_user")).toBe(STAFF_USER);
    expect(window.localStorage.getItem("admin_access")).toBe("true");
    expect(schoolId).toBe("12");
    expect(storedSchoolId()).toBe("12");
    expect(window.location.pathname).toBe("/referral-report/link-token");
  });

  it.each(["/task/link-token", "/classroom/students/3", "/check-in"])(
    "keeps the staff session on the public page %s",
    async (pathname) => {
      await requestFailingWith(401, pathname);

      expect(window.localStorage.getItem("sts_user")).toBe(STAFF_USER);
      expect(storedSchoolId()).toBe("12");
    },
  );

  it("leaves everything alone for errors other than 401", async () => {
    const { schoolId } = await requestFailingWith(500, "/students");

    expect(window.localStorage.getItem("sts_user")).toBe(STAFF_USER);
    expect(schoolId).toBe("12");
  });

  it("does nothing when nobody is signed in", async () => {
    const { schoolId } = await requestFailingWith(401, "/students", {
      signedIn: false,
    });

    expect(schoolId).toBe("12");
    expect(window.location.pathname).toBe("/students");
  });
});
