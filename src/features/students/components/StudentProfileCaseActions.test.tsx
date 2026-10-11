import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { restoreApiStub, stubApiRequests } from "../../../test/api-stub";
import { StudentProfileCaseActions } from "./StudentProfileCaseActions";

function renderActions(status?: string, canOpenCase = true, disabled = false) {
  stubApiRequests();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <StudentProfileCaseActions
          cases={
            status
              ? [
                  {
                    id: 77,
                    status,
                    created_at: "2026-10-09T00:00:00Z",
                    reason_flagged: "ข้อสังเกตเดิม",
                  },
                ]
              : []
          }
          canOpenCase={canOpenCase}
          disabled={disabled}
          studentId="student-test"
          studentName="นักเรียนทดสอบ"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(restoreApiStub);
describe("student profile case actions", () => {
  it("keeps both actions visible before the first case", () => {
    renderActions();
    expect(screen.getByRole("button", { name: "ดูเคส" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "เปิดเคสใหม่" })).toHaveProperty(
      "disabled",
      false,
    );
  });
  it.each([
    "OPEN",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "STUDENT_NOT_FOUND",
    "AWAITING_REFERRAL",
    "AWAITING_REFERRAL_OUTCOME",
  ])("allows viewing but blocks another %s case", (status) => {
    renderActions(status);
    expect(screen.getByRole("button", { name: "ดูเคส" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.getByRole("button", { name: "เปิดเคสใหม่" })).toHaveProperty(
      "disabled",
      true,
    );
  });
  it("lets users read completed cases and explicitly start a new case", () => {
    renderActions("RESOLVED");
    fireEvent.click(screen.getByRole("button", { name: "ดูเคส" }));
    expect(
      within(screen.getByRole("dialog")).getByRole("link", {
        name: "ดูรายละเอียด",
      }),
    ).toHaveProperty("pathname", "/cases/77");
    expect(screen.getByRole("button", { name: "เปิดเคสใหม่" })).toHaveProperty(
      "disabled",
      false,
    );
  });
  it("requires a reason in the shared dialog before opening", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "เปิดเคสใหม่" }));
    expect(
      within(screen.getByRole("dialog")).getByLabelText(/เหตุผลที่เปิดเคส/),
    ).toBeTruthy();
  });
  it("blocks opening without permission", () => {
    renderActions("RESOLVED", false);
    expect(screen.getByRole("button", { name: "เปิดเคสใหม่" })).toHaveProperty(
      "disabled",
      true,
    );
  });
  it("blocks both actions while cases are loading or failed", () => {
    renderActions("RESOLVED", true, true);
    expect(screen.getByRole("button", { name: "ดูเคส" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "เปิดเคสใหม่" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
