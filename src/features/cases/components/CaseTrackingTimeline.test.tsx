import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { restoreApiStub, stubApiRequests } from "../../../test/api-stub";
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
