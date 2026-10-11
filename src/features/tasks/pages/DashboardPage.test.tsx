import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  lastRequestTo,
  restoreApiStub,
  stubApiRequests,
  type RecordedRequest,
} from "../../../test/api-stub";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { useSchoolFilterStore } from "../../school-filter/store/school-filter.store";
import { DashboardPage } from "./DashboardPage";
import type { ReferralDrilldownRow } from "../types/follow-up-dashboard.types";

const RISK_DASHBOARD_URL = "/dashboard/risk-watchlist";

const FIXTURES = {
  "/dashboard/risk-watchlist/filter-options": {
    data: {
      grades: [{ value: "ม.4", label: "ม.4" }],
      rooms: ["2"],
      terms: [
        { academicYear: 2569, semester: 1 },
        { academicYear: 2570, semester: 2 },
      ],
    },
  },
  "/dashboard/referrals": {
    data: [],
    meta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
  },
  [RISK_DASHBOARD_URL]: {
    data: [],
    meta: {
      page: 1,
      limit: 20,
      totalCount: 0,
      totalPages: 0,
      caseStatusSummary: {
        OPEN: 0,
        IN_PROGRESS: 0,
        PENDING_REVIEW: 0,
        STUDENT_NOT_FOUND: 0,
        RESOLVED: 0,
      },
    },
  },
  "/dashboard/follow-up-summary": {
    data: {
      outcomes: {
        visit: { succeeded: 0, notSucceeded: 0, total: 0, successRate: null },
        assist: { succeeded: 0, notSucceeded: 0, total: 0, successRate: null },
      },
      assistanceMeasures: [],
      referrals: { total: 0, overdue: 0, byStatus: {}, byAgency: [] },
      repeatedUnsuccessfulCaseCount: 0,
    },
  },
  "/attendance/terms": {
    data: [
      {
        id: 21,
        academicYear: 2569,
        semester: 1,
        status: "ACTIVE",
        startsOn: "2026-05-16",
        endsOn: "2026-10-10",
      },
    ],
  },
};

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="report-location">
      {location.pathname + location.search}
    </output>
  );
}

function renderDashboardAt(
  url: string,
  fixtures: Record<string, unknown> = FIXTURES,
): RecordedRequest[] {
  const requests = stubApiRequests(fixtures);
  useAuthSessionStore.setState({
    user: {
      id: "test-actor",
      username: "test-actor",
      roles: ["admin"],
      permissions: [],
    },
  } as never);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <DashboardPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return requests;
}

afterEach(() => {
  restoreApiStub();
  useSchoolFilterStore.getState().clearAll();
});

describe("student risk report URL filters", () => {
  it.each(["AWAITING_REFERRAL", "AWAITING_REFERRAL_OUTCOME"])(
    "clears a hidden risk status from the bookmark and every API request (%s)",
    async (status) => {
      const requests = renderDashboardAt(
        `/student-risk-report/risk?caseStatus=${status}`,
      );
      await waitFor(() =>
        expect(lastRequestTo(requests, RISK_DASHBOARD_URL)).toBeDefined(),
      );
      expect(
        requests
          .filter((request) => request.url === RISK_DASHBOARD_URL)
          .every((request) => request.params.caseStatus === undefined),
      ).toBe(true);
      await waitFor(() =>
        expect(screen.getByTestId("report-location").textContent).not.toContain(
          "caseStatus=",
        ),
      );
    },
  );

  it.each(["AWAITING_REFERRAL", "AWAITING_REFERRAL_OUTCOME"])(
    "discards a referral status when switching watchlist to risk and back (%s)",
    async (status) => {
      const requests = renderDashboardAt(
        `/student-risk-report/watchlist?caseStatus=${status}`,
      );
      await waitFor(() =>
        expect(
          lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.caseStatus,
        ).toBe(status),
      );
      const requestOffset = requests.length;
      fireEvent.click(screen.getByRole("tab", { name: "กลุ่มเสี่ยง" }));
      await waitFor(() => {
        expect(
          lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.studentGroup,
        ).toBe("RISK");
        expect(screen.getByTestId("report-location").textContent).not.toContain(
          "caseStatus=",
        );
      });
      expect(
        requests
          .slice(requestOffset)
          .filter((request) => request.url === RISK_DASHBOARD_URL)
          .every((request) => request.params.caseStatus === undefined),
      ).toBe(true);
      fireEvent.click(screen.getByRole("tab", { name: "กลุ่มเฝ้าระวัง" }));
      await waitFor(() => {
        expect(
          lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.studentGroup,
        ).toBe("WATCHLIST");
        expect(
          lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.caseStatus,
        ).toBeUndefined();
        expect(screen.getByTestId("report-location").textContent).not.toContain(
          "caseStatus=",
        );
      });
    },
  );

  it("preserves an ordinary case status when switching to risk", async () => {
    const requests = renderDashboardAt(
      "/student-risk-report/watchlist?caseStatus=IN_PROGRESS",
    );
    await waitFor(() =>
      expect(
        lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.caseStatus,
      ).toBe("IN_PROGRESS"),
    );
    fireEvent.click(screen.getByRole("tab", { name: "กลุ่มเสี่ยง" }));
    await waitFor(() =>
      expect(lastRequestTo(requests, RISK_DASHBOARD_URL)?.params).toMatchObject(
        { studentGroup: "RISK", caseStatus: "IN_PROGRESS" },
      ),
    );
    expect(screen.getByTestId("report-location").textContent).toContain(
      "caseStatus=IN_PROGRESS",
    );
  });

  it("sends contract-valid pagination even when the URL is out of contract", async () => {
    const requests = renderDashboardAt(
      "/student-risk-report?page=-1&limit=999&academicYear=-3&semester=0",
    );

    await waitFor(() =>
      expect(lastRequestTo(requests, RISK_DASHBOARD_URL)).toBeDefined(),
    );
    const request = lastRequestTo(requests, RISK_DASHBOARD_URL);
    expect(request?.params.page).toBe("1");
    expect(request?.params.limit).toBe("20");
    expect(request?.params.academicYear).toBeUndefined();
    expect(request?.params.semester).toBeUndefined();
  });

  it("keeps watchlist follow-up status and concern level as independent API filters", async () => {
    const requests = renderDashboardAt(
      "/student-risk-report/watchlist?caseStatus=IN_PROGRESS&concernLevel=WATCH",
    );
    await waitFor(() => {
      const request = lastRequestTo(requests, RISK_DASHBOARD_URL);
      expect(request?.params.studentGroup).toBe("WATCHLIST");
      expect(request?.params.caseStatus).toBe("IN_PROGRESS");
      expect(request?.params.concernLevel).toBe("WATCH");
    });
  });

  it("keeps referral-stage status filters when reopening a watchlist URL", async () => {
    const requests = renderDashboardAt(
      "/student-risk-report/watchlist?caseStatus=AWAITING_REFERRAL_OUTCOME",
    );
    await waitFor(() =>
      expect(
        lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.caseStatus,
      ).toBe("AWAITING_REFERRAL_OUTCOME"),
    );
  });

  it("keeps pagination the API accepts", async () => {
    const requests = renderDashboardAt("/student-risk-report?page=2&limit=50");

    await waitFor(() =>
      expect(lastRequestTo(requests, RISK_DASHBOARD_URL)).toBeDefined(),
    );
    const request = lastRequestTo(requests, RISK_DASHBOARD_URL);
    expect(request?.params.page).toBe("2");
    expect(request?.params.limit).toBe("50");
  });
});

describe("report filter consistency", () => {
  it("shows each referral period in the table and mobile cards without guessing legacy periods", async () => {
    const referral: ReferralDrilldownRow = {
      id: "referral-current",
      caseId: 7,
      studentId: null,
      studentName: "นักเรียนทดสอบภาคเรียน",
      studentPhotoUrl: null,
      schoolId: 101,
      schoolName: "โรงเรียนทดสอบ",
      academicYear: 2569,
      semester: 1,
      grade: "ม.4",
      room: "2",
      statusCode: "COMPLETED",
      stageCode: "RESOLVED",
      awaitingResult: false,
      referredAt: "2026-10-01T00:00:00Z",
      agencyName: "หน่วยงานทดสอบ",
      agencyKindLabel: "ทดสอบ",
      linkUrl: null,
      linkStatusCode: null,
      linkExpiresAt: null,
    };
    renderDashboardAt("/student-risk-report/referrals", {
      ...FIXTURES,
      "/dashboard/referrals": {
        data: [
          referral,
          { ...referral, id: "referral-old", academicYear: 2568, semester: 2 },
          {
            ...referral,
            id: "referral-legacy",
            studentName: "นักเรียนข้อมูลเดิม",
            academicYear: null,
            semester: null,
          },
        ],
        meta: { page: 1, limit: 20, totalCount: 3, totalPages: 1 },
      },
    });
    await screen.findAllByText(referral.studentName);
    const table = screen.getByRole("table");
    const cards = document.querySelector('[data-slot="table-card-list"]');
    expect(cards).not.toBeNull();
    for (const layout of [table, cards as HTMLElement]) {
      expect(within(layout).getByText("ปี 2569 · ภาคเรียนที่ 1")).toBeDefined();
      expect(within(layout).getByText("ปี 2568 · ภาคเรียนที่ 2")).toBeDefined();
      const legacyName = within(layout).getByText("นักเรียนข้อมูลเดิม");
      expect(legacyName.parentElement?.textContent).not.toMatch(/ปี |ภาคเรียน/);
      expect(layout.textContent).not.toMatch(/ปี null|ภาคเรียนที่ null/);
    }
  });

  it("offers real grade, room and term choices even without a school", async () => {
    const requests = renderDashboardAt("/student-risk-report");
    await waitFor(() =>
      expect(
        lastRequestTo(requests, "/dashboard/risk-watchlist/filter-options"),
      ).toBeDefined(),
    );
    const request = lastRequestTo(requests, RISK_DASHBOARD_URL);
    expect(request?.params.academicYear).toBeUndefined();
    expect(request?.params.semester).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: /ชั้น\/ห้อง/ }));
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "ระดับชั้น" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "ระดับชั้น" }));
    fireEvent.click(screen.getByRole("option", { name: "ม.4" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "ห้อง" }).hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "ห้อง" }));
    fireEvent.click(await screen.findByRole("option", { name: "ห้อง 2" }));
    fireEvent.click(screen.getByRole("button", { name: "ปีการศึกษา" }));
    fireEvent.click(screen.getByRole("option", { name: "2570" }));
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "ภาคเรียน" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "ภาคเรียน" }));
    fireEvent.click(screen.getByRole("option", { name: "ภาคเรียนที่ 2" }));
    await waitFor(() =>
      expect(lastRequestTo(requests, RISK_DASHBOARD_URL)?.params).toMatchObject(
        { academicYear: "2570", semester: "2" },
      ),
    );
  });

  it.each([
    { province: "ชลบุรี" },
    { province: "ชลบุรี", district: "เมืองชลบุรี" },
    { province: "ชลบุรี", district: "เมืองชลบุรี", subDistrict: "แสนสุข" },
    {
      province: "ชลบุรี",
      district: "เมืองชลบุรี",
      subDistrict: "แสนสุข",
      schoolId: "10010004",
    },
  ])("intersects report and options with central scope %j", async (area) => {
    useSchoolFilterStore.setState({ ...area, userId: "test-actor" } as never);
    const requests = renderDashboardAt("/student-risk-report/watchlist");
    await waitFor(() =>
      expect(lastRequestTo(requests, RISK_DASHBOARD_URL)?.params).toMatchObject(
        area,
      ),
    );
    expect(
      lastRequestTo(requests, "/dashboard/risk-watchlist/filter-options")
        ?.params,
    ).toMatchObject(area);
    expect(
      lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.semester,
    ).toBeUndefined();
  });

  it("sends the same selected filters to referral totals and rows", async () => {
    const requests = renderDashboardAt(
      "/student-risk-report/referrals?grade=ม.4&room=2&academicYear=2569&semester=1",
    );
    await waitFor(() =>
      expect(
        lastRequestTo(requests, "/dashboard/referrals")?.params,
      ).toMatchObject({
        grade: "ม.4",
        room: "2",
        academicYear: "2569",
        semester: "1",
      }),
    );
    expect(
      lastRequestTo(requests, "/dashboard/follow-up-summary")?.params,
    ).toMatchObject({
      grade: "ม.4",
      room: "2",
      academicYear: "2569",
      semester: "1",
    });
  });
});

it("clears a stale term URL after real options prove it no longer exists", async () => {
  const requests = renderDashboardAt(
    "/student-risk-report?academicYear=2569&semester=3",
  );
  await waitFor(() =>
    expect(
      lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.semester,
    ).toBeUndefined(),
  );
  expect(lastRequestTo(requests, RISK_DASHBOARD_URL)?.params.academicYear).toBe(
    "2569",
  );
});

it("keeps valid year, semester, grade and room when narrowing the geography", async () => {
  const requests = renderDashboardAt(
    "/student-risk-report?academicYear=2569&semester=1&grade=ม.4&room=2",
  );
  await waitFor(() =>
    expect(lastRequestTo(requests, RISK_DASHBOARD_URL)?.params).toMatchObject({
      academicYear: "2569",
      semester: "1",
      grade: "ม.4",
      room: "2",
    }),
  );
  act(() =>
    useSchoolFilterStore.getState().setFilter({
      province: "ชลบุรี",
      district: "เมืองชลบุรี",
      userId: "test-actor",
    } as never),
  );
  await waitFor(() =>
    expect(lastRequestTo(requests, RISK_DASHBOARD_URL)?.params).toMatchObject({
      province: "ชลบุรี",
      district: "เมืองชลบุรี",
      academicYear: "2569",
      semester: "1",
      grade: "ม.4",
      room: "2",
    }),
  );
});
