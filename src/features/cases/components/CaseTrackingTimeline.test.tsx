import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { restoreApiStub, stubApiRequests } from "../../../test/api-stub";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import type { CaseRecord } from "../types/cases.types";
import { CaseTrackingTimeline } from "./CaseTrackingTimeline";

const base: CaseRecord = {
  id: 1,
  student_name: "นักเรียน ทดสอบ",
  status: "IN_PROGRESS",
  created_at: "2026-10-01T00:00:00Z",
  follow_up_rounds: [
    {
      task_id: "round",
      task_status: "COMPLETED",
      created_at: "2026-10-02T00:00:00Z",
      link_count: 1,
      link_status: "COMPLETED",
      submitted_at: "2026-10-03T00:00:00Z",
      cause_detail: "บันทึกการติดตาม",
    },
  ],
};
function node(record: CaseRecord, client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CaseTrackingTimeline
          caseRecord={record}
          onAssigned={() => {}}
          onReview={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  stubApiRequests();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: vi.fn(),
    configurable: true,
  });
});
afterEach(() => {
  restoreApiStub();
  vi.restoreAllMocks();
  useAuthSessionStore.setState({ user: null } as never);
});
describe("latest tracking step", () => {
  it.each(["RESOLVED", "STUDENT_NOT_FOUND", "PENDING_REVIEW"] as const)(
    "scrolls to the final rendered step for %s",
    (status) => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
      const view = render(node({ ...base, status }, client));
      const latest = Array.from(
        view.container.querySelectorAll("[data-flow-step]"),
      ).at(-1);
      expect(latest).toBeTruthy();
      expect(scroll.mock.contexts.at(-1)).toBe(latest);
    },
  );
  it("scrolls on a transition but leaves identical refreshed history alone", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const view = render(node(base, client));
    const count = scroll.mock.calls.length;
    view.rerender(
      node({ ...base, follow_up_rounds: [...base.follow_up_rounds!] }, client),
    );
    expect(scroll.mock.calls.length).toBe(count);
    view.rerender(node({ ...base, status: "RESOLVED" }, client));
    expect(scroll.mock.calls.length).toBe(count + 1);
    const extra = {
      ...base.follow_up_rounds![0],
      task_id: "second",
      created_at: "2026-10-04T00:00:00Z",
      submitted_at: "2026-10-05T00:00:00Z",
    };
    view.rerender(
      node(
        {
          ...base,
          status: "RESOLVED",
          follow_up_rounds: [...base.follow_up_rounds!, extra],
        },
        client,
      ),
    );
    expect(scroll.mock.contexts.at(-1)).toBe(
      Array.from(view.container.querySelectorAll("[data-flow-step]")).at(-1),
    );
    expect(scroll.mock.calls.length).toBe(count + 2);
  });
});

describe("a referral the agency could not complete", () => {
  const failed: CaseRecord = {
    ...base,
    status: "REFERRAL_NOT_SUCCEEDED",
    referrals: [
      {
        id: "referral",
        case_review_id: "review",
        referral_agency_id: 1,
        agency_name: "โรงพยาบาลทดสอบ",
        agency_kind_code: "HOSPITAL",
        agency_kind_label: "โรงพยาบาล",
        status_code: "NOT_SUCCEEDED",
        status_label: "ยังไม่สำเร็จ",
        status_badge_variant: "destructive",
        referred_at: "2026-10-04T00:00:00Z",
        referred_by: "ผอ. ทดสอบ",
        referral_note: "ส่งต่อพบแพทย์",
        result: {
          note: "ครอบครัวไม่ไปตามนัด",
          recorded_at: "2026-10-06T00:00:00Z",
          recorded_by: null,
          action_date: "2026-10-06",
          reported_by_agency: true,
          reporter_name: "เจ้าหน้าที่ ทดสอบ",
          reporter_identity_provider: "AraID",
        },
        link: null,
      },
    ],
  };
  function renderFailed(phase: "FOLLOW_UP" | "ASSISTANCE" = "FOLLOW_UP") {
    stubApiRequests({
      "/public/case-tracking-options": {
        reviewActions: [
          {
            code: "REFER_AGENCY",
            label: "ส่งต่อหน่วยงาน",
            targetStatus: "AWAITING_REFERRAL",
            requiresResolutionOutcome: false,
          },
          {
            code: "CLOSE",
            label: "ปิดเคส",
            targetStatus: "RESOLVED",
            requiresResolutionOutcome: false,
          },
        ],
      },
    });
    useAuthSessionStore.setState({
      user: {
        id: "test-actor",
        username: "test-actor",
        roles: [],
        permissions: ["case:manage"],
      },
    } as never);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(node({ ...failed, workflow_phase_code: phase }, client));
  }

  it("says so on the round's status instead of a separate result field", () => {
    const view = renderFailed();
    const step = view.container.querySelector("[data-referral-result]");
    expect(step?.textContent).toContain("สถานะการส่งต่อ");
    expect(step?.textContent).toContain("ส่งต่อไม่สำเร็จ");
    expect(screen.queryByLabelText("ผลการส่งต่อ")).toBeNull();
  });

  it.each(["FOLLOW_UP", "ASSISTANCE"] as const)(
    "opens a VISIT form after a failed %s referral",
    (phase) => {
      const view = renderFailed(phase);
      const steps = () =>
        view.container.querySelectorAll("[data-flow-step]").length;
      const before = steps();
      fireEvent.click(screen.getByRole("button", { name: "มอบหมายติดตาม" }));
      expect(steps()).toBe(before + 1);
      // The earlier round's step and the new form share the title.
      expect(screen.getAllByText("มอบหมายการติดตาม")).toHaveLength(2);
      expect(screen.queryByText("มอบหมายการช่วยเหลือ")).toBeNull();
      expect(screen.queryByText("มาตรการการช่วยเหลือ")).toBeNull();
    },
  );

  it("offers another referral but no way to close the case", async () => {
    renderFailed();
    expect(
      await screen.findByRole("button", { name: "ส่งต่อหน่วยงานอีกครั้ง" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "ปิดเคส" })).toBeNull();
  });
});
