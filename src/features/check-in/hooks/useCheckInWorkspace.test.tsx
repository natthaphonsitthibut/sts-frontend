import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCheckInWorkspace } from "./useCheckInWorkspace";
import { checkInService } from "../api/check-in.service";
import type { CheckInSession } from "../types/check-in.types";

vi.mock("../api/check-in.service", () => ({
  checkInService: {
    getOptions: vi.fn(),
    getRoster: vi.fn(),
    getCurrentSession: vi.fn(),
    startSession: vi.fn(),
    submitSession: vi.fn(),
  },
}));

const session: CheckInSession = {
  id: "fixture-session",
  classroomId: 42,
  classroomSubjectId: 84,
  date: "2026-09-30",
  status: "SUBMITTED",
  storageMode: "EXCEPTIONS",
  checkingStartedAt: "2026-09-30T01:00:00Z",
  submittedAt: "2026-09-30T01:01:00Z",
  expectedRosterCount: 1,
  recordedCount: 1,
  exceptionCount: 0,
  submissionNumber: 1,
  lockVersion: 2,
  hasSubmittedResult: true,
  correctionReason: null,
  readOnly: false,
  idempotent: false,
  exceptions: [],
};

describe("check-in refresh after risk changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(checkInService.getOptions).mockResolvedValue({
      date: "2026-09-30",
      classroom: {
        id: 42,
        schoolId: 1,
        schoolTermId: 1,
        schoolName: "โรงเรียน",
        academicYear: 2569,
        semester: 1,
        gradeLabel: "ม.1",
        roomNumber: 1,
        roomName: null,
      },
      subjects: [
        {
          classroomSubjectId: 84,
          schoolSubjectId: 1,
          subjectId: 1,
          code: "HR",
          nameTh: "โฮมรูม",
        },
      ],
    });
    vi.mocked(checkInService.getRoster).mockResolvedValue([
      {
        id: "student-1",
        studentNumber: "1",
        firstName: "นักเรียน",
        lastName: "ทดสอบ",
        hasPhoto: false,
        photoVersion: null,
        riskTier: "HIGH",
        teacherComment: null,
      },
    ]);
    vi.mocked(checkInService.getCurrentSession).mockResolvedValue(null);
    vi.mocked(checkInService.startSession).mockResolvedValue({
      ...session,
      status: "OPEN",
      hasSubmittedResult: false,
      submittedAt: null,
    });
    vi.mocked(checkInService.submitSession).mockResolvedValue(session);
  });

  it("refreshes cached alerts and risk views immediately after a successful check-in", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const keys = [
      "notifications",
      "risk-dashboard",
      "student-cases",
      "home-dashboard",
      "student-profile-summary",
    ];
    for (const key of keys) client.setQueryData([key], { staleRisk: true });
    const { result, unmount } = renderHook(
      () =>
        useCheckInWorkspace({
          access: "INTERNAL",
          classroomId: 42,
          classroomSubjectId: 84,
          initialDate: "2026-09-30",
        }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      },
    );
    await waitFor(() => expect(result.current.roster).toHaveLength(1));
    await act(async () => {
      result.current.markRemainingPresent();
    });
    await waitFor(() => expect(result.current.marks.size).toBe(1));
    await act(async () => {
      await result.current.submit(undefined);
    });
    for (const key of keys)
      expect(client.getQueryState([key])?.isInvalidated).toBe(true);
    unmount();
    client.clear();
  });
});
