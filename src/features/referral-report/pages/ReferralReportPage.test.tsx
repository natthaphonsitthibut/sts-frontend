import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../../lib/api-client";
import { ReferralReportPage } from "./ReferralReportPage";

// The page chrome, student card, its dialogs and the QR view are not what these
// tests are about, and each pulls in the profile menu, maps, photos or the
// clipboard.
vi.mock("../../../components/layout/guest-page-shell", () => ({
  GuestPageShell: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("../../../components/layout/student-tracking-card", () => ({
  StudentTrackingCard: () => null,
}));
vi.mock("../../tasks/components/TaskStudentDialogs", () => ({
  TaskStudentContactsDialog: () => null,
  TaskStudentHomeDialog: () => null,
}));
vi.mock("../hooks/useReferralReportPhoto", () => ({
  useReferralReportPhoto: () => null,
}));
vi.mock("../../auth/components/AraIdQrChallengeView", () => ({
  AraIdQrChallengeView: () => <p>สแกนเพื่อยืนยันตัวตน</p>,
}));

const LINK_TOKEN = "link-token";
const LINK_URL = `/referral-links/${LINK_TOKEN}`;
const SESSION_STORAGE_KEY = `magic_session_referral:${LINK_TOKEN}`;
const STAFF_USER = JSON.stringify({ id: 7, roles: ["DIRECTOR"] });
const SCHOOL_FILTER = JSON.stringify({ schoolId: "12", userId: 7 });

const referral = {
  agency_name: "โรงพยาบาลทดสอบ",
  agency_kind_label: "สาธารณสุข",
  starts_at: "2026-10-01T02:00:00.000Z",
  expires_at: "2026-10-31T10:00:00.000Z",
};
const lockedLink = {
  auth_required: true,
  referral,
  student_name: "ด.ช. ท*** ส***",
  student_school: "โรงเรียนทดสอบ",
};
const openLink = {
  auth_required: false,
  reporter_name: "ผู้รายงาน ทดสอบ",
  referral,
  student_name: "เด็กชายทดสอบ ระบบ",
  student_school: "โรงเรียนทดสอบ",
  student_grade: null,
  student_room: null,
  student_photo_url: null,
  student_phone: null,
  reason_flagged: null,
  case_display_status_label: null,
  follow_up_history: [],
  contact_channels: [],
};

interface ServedRequest {
  method: string;
  url: string;
  session: string;
  body: unknown;
}
type Reply =
  | { status: number; data?: unknown }
  | Promise<{
      status: number;
      data?: unknown;
    }>;

let previousAdapter: typeof apiClient.defaults.adapter;
let requests: ServedRequest[];

/** Answers the page's requests through the real client, interceptors included. */
function serve(reply: (request: ServedRequest) => Reply): void {
  apiClient.defaults.adapter = async (config) => {
    const request: ServedRequest = {
      method: (config.method ?? "get").toLowerCase(),
      url: config.url ?? "",
      session: String(config.headers.get("x-referral-session") ?? ""),
      body:
        typeof config.data === "string"
          ? (JSON.parse(config.data) as unknown)
          : config.data,
    };
    requests.push(request);
    const { status, data } = await reply(request);
    if (status >= 400) {
      throw Object.assign(new Error(`Request failed with status ${status}`), {
        config,
        response: { status, data },
      });
    }
    return { data, status, statusText: "OK", headers: {}, config };
  };
}

function requestsTo(method: string, url: string): ServedRequest[] {
  return requests.filter(
    (request) => request.method === method && request.url === url,
  );
}

function showPage(includeTokenSwitch = false): void {
  window.history.pushState({}, "", `/referral-report/${LINK_TOKEN}`);
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter initialEntries={[`/referral-report/${LINK_TOKEN}`]}>
        {includeTokenSwitch ? (
          <Link to="/referral-report/second-link">เปิดลิงก์อีกโรงเรียน</Link>
        ) : null}
        <Routes>
          <Route
            element={<ReferralReportPage />}
            path="/referral-report/:token"
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function signInStaff(): void {
  window.localStorage.setItem("sts_user", STAFF_USER);
  window.localStorage.setItem("admin_access", "true");
  window.localStorage.setItem("sts_school_filter", SCHOOL_FILTER);
}

function expectStaffSessionIntact(): void {
  expect(window.localStorage.getItem("sts_user")).toBe(STAFF_USER);
  expect(window.localStorage.getItem("admin_access")).toBe("true");
  expect(window.localStorage.getItem("sts_school_filter")).toBe(SCHOOL_FILTER);
  expect(window.location.pathname).toBe(`/referral-report/${LINK_TOKEN}`);
}

beforeEach(() => {
  previousAdapter = apiClient.defaults.adapter;
  requests = [];
});

afterEach(() => {
  apiClient.defaults.adapter = previousAdapter;
  window.history.pushState({}, "", "/");
});

describe("referral report link: load error", () => {
  // Regression: "ลองเปิดอีกครั้ง" was a link to the page it was already on, so
  // pressing it navigated nowhere and never asked the server again.
  it("retries the request in place and holds the button while it runs", async () => {
    let release: (reply: { status: number; data?: unknown }) => void = () => {};
    let attempt = 0;
    serve(() => {
      attempt += 1;
      if (attempt === 1) {
        return { status: 500, data: { message: "ระบบขัดข้องชั่วคราว" } };
      }
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    showPage();

    expect(await screen.findByText("ระบบขัดข้องชั่วคราว")).toBeTruthy();
    expect(requestsTo("get", LINK_URL)).toHaveLength(1);

    const retry = screen.getByRole("button", { name: "ลองเปิดอีกครั้ง" });
    fireEvent.click(retry);

    await waitFor(() => expect(requestsTo("get", LINK_URL)).toHaveLength(2));
    // Pending: the error stays on screen, the button is held, a second press
    // does not stack another request.
    expect(retry).toHaveProperty("disabled", true);
    expect(screen.getByText("กำลังเปิดลิงก์")).toBeTruthy();
    fireEvent.click(retry);
    expect(requestsTo("get", LINK_URL)).toHaveLength(2);

    release({ status: 200, data: { data: lockedLink } });
    expect(await screen.findByLabelText(/รหัสจากโรงเรียน/)).toBeTruthy();
  });

  it("shows the failure again when the retry fails too", async () => {
    serve(() => ({ status: 404, data: { message: "ไม่พบลิงก์นี้" } }));
    showPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "ลองเปิดอีกครั้ง" }),
    );

    await waitFor(() => expect(requestsTo("get", LINK_URL)).toHaveLength(2));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "ลองเปิดอีกครั้ง" }),
      ).toHaveProperty("disabled", false),
    );
    expect(screen.getByText("ไม่พบลิงก์นี้")).toBeTruthy();
  });
});

describe("referral report link: stale link session", () => {
  // Regression: the link session expiring answered 401 and the client treated
  // it as the staff session lapsing — it wiped the staff sign-in and school
  // filter and left for /login, and the agency lost what it had typed.
  it("re-verifies the agency, keeps its draft, and leaves the staff session alone", async () => {
    signInStaff();
    window.localStorage.setItem(SESSION_STORAGE_KEY, "SESSION_OLD");
    serve((request) => {
      if (request.method === "get" && request.url === LINK_URL) {
        return {
          status: 200,
          data: { data: request.session ? openLink : lockedLink },
        };
      }
      if (request.url === `${LINK_URL}/report`) {
        return request.session === "SESSION_OLD"
          ? { status: 401, data: { message: "เซสชันหมดอายุ" } }
          : { status: 201, data: {} };
      }
      if (request.url === `${LINK_URL}/araid/challenge`) {
        return {
          status: 201,
          data: {
            data: {
              challengeToken: "CHALLENGE",
              verificationUrl: "https://example.test/verify",
              qrDataUrl: "data:image/png;base64,",
              referenceCode: "REF",
              expiresAt: "2026-10-11T10:00:00.000Z",
            },
          },
        };
      }
      if (request.url === "/referral-links/araid/challenge/status") {
        return {
          status: 201,
          data: { data: { status: "APPROVED", sessionToken: "SESSION_NEW" } },
        };
      }
      return { status: 200, data: { data: [] } };
    });
    showPage();

    // The agency fills the report in under the session it already had.
    fireEvent.click(await screen.findByRole("radio", { name: "สำเร็จ" }));
    fireEvent.change(screen.getByLabelText(/สรุปการดำเนินการและผล/), {
      target: { value: "หน่วยงานติดตามแล้ว นักเรียนกลับมาเรียน" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ส่งรายงาน" }));

    // The session turns out stale: back to the gate, told why, nothing lost.
    expect(
      await screen.findByText(
        "การยืนยันตัวตนหมดอายุ กรุณายืนยันอีกครั้ง ข้อมูลที่กรอกไว้จะยังอยู่",
      ),
    ).toBeTruthy();
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBe("");
    expectStaffSessionIntact();

    fireEvent.change(screen.getByLabelText(/รหัสจากโรงเรียน/), {
      target: { value: "123456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "ยืนยันตัวตนด้วย AraID" }),
    );

    // Verified again: the form comes back as it was left.
    const note = await screen.findByLabelText(/สรุปการดำเนินการและผล/);
    expect(note).toHaveProperty(
      "value",
      "หน่วยงานติดตามแล้ว นักเรียนกลับมาเรียน",
    );
    expect(screen.getByRole("radio", { name: "สำเร็จ" })).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.queryByText("เซสชันหมดอายุ")).toBeNull();
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBe(
      "SESSION_NEW",
    );

    fireEvent.click(screen.getByRole("button", { name: "ส่งรายงาน" }));
    expect(await screen.findByText("ส่งรายงานเรียบร้อย")).toBeTruthy();

    const reports = requestsTo("post", `${LINK_URL}/report`);
    expect(reports.map((request) => request.session)).toEqual([
      "SESSION_OLD",
      "SESSION_NEW",
    ]);
    expect(reports[1].body).toMatchObject({
      result_code: "SUCCEEDED",
      result_note: "หน่วยงานติดตามแล้ว นักเรียนกลับมาเรียน",
    });
    expectStaffSessionIntact();
  });

  it("falls back to the gate when the stored session is already stale on open", async () => {
    signInStaff();
    window.localStorage.setItem(SESSION_STORAGE_KEY, "SESSION_OLD");
    serve(() => ({ status: 200, data: { data: lockedLink } }));
    showPage();

    expect(
      await screen.findByText("การยืนยันตัวตนหมดอายุ กรุณายืนยันอีกครั้ง"),
    ).toBeTruthy();
    expect(screen.getByLabelText(/รหัสจากโรงเรียน/)).toBeTruthy();
    expect(screen.queryByText("เปิดลิงก์ไม่ได้")).toBeNull();
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBe("");
    expectStaffSessionIntact();
  });

  it("treats a 401 without any link session as the link's own error", async () => {
    signInStaff();
    serve(() => ({ status: 401, data: { message: "ลิงก์ไม่ถูกต้อง" } }));
    showPage();

    expect(await screen.findByText("เปิดลิงก์ไม่ได้")).toBeTruthy();
    expect(screen.getByText("ลิงก์ไม่ถูกต้อง")).toBeTruthy();
    expect(requestsTo("get", LINK_URL)).toHaveLength(1);
    expectStaffSessionIntact();
  });
});

describe("referral report link: draft isolation", () => {
  it("loads the new link session and clears the prior draft on in-app token navigation", async () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, "SESSION_FIRST");
    window.localStorage.setItem(
      "magic_session_referral:second-link",
      "SESSION_SECOND",
    );
    serve(() => ({ status: 200, data: { data: openLink } }));
    showPage(true);
    const firstNote = await screen.findByLabelText(/สรุปการดำเนินการและผล/);
    fireEvent.change(firstNote, { target: { value: "ข้อมูลเฉพาะลิงก์แรก" } });
    fireEvent.click(screen.getByRole("radio", { name: "ยังไม่สำเร็จ" }));
    fireEvent.click(screen.getByRole("link", { name: "เปิดลิงก์อีกโรงเรียน" }));
    await waitFor(() =>
      expect(requestsTo("get", "/referral-links/second-link")[0]?.session).toBe(
        "SESSION_SECOND",
      ),
    );
    expect(
      await screen.findByLabelText(/สรุปการดำเนินการและผล/),
    ).toHaveProperty("value", "");
    // A fresh form starts at its default, not the first link's choice.
    expect(screen.getByRole("radio", { name: "ยังไม่สำเร็จ" })).toHaveProperty(
      "checked",
      false,
    );
    expect(screen.getByRole("radio", { name: "สำเร็จ" })).toHaveProperty(
      "checked",
      true,
    );
  });
});
