import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  lastRequestTo,
  restoreApiStub,
  stubApiRequests,
  type RecordedRequest,
} from "../../../test/api-stub";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { DashboardPage } from "./DashboardPage";

const RISK_DASHBOARD_URL = "/dashboard/risk-watchlist";

const FIXTURES = {
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

function renderDashboardAt(url: string): RecordedRequest[] {
  const requests = stubApiRequests(FIXTURES);
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
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return requests;
}

afterEach(() => {
  restoreApiStub();
});

describe("student risk report URL filters", () => {
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
