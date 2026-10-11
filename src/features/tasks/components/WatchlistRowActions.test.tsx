import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { casesService } from "../../cases/api/cases.service";
import { restoreApiStub, stubApiRequests } from "../../../test/api-stub";
import { WatchlistRowActions } from "./WatchlistRowActions";
import type { RiskDashboardRow } from "../types/risk-dashboard.types";
import { schoolStructureService } from "../../school-structure/api/school-structure.service";

const student: RiskDashboardRow = {
  studentId: "11111111-1111-4111-8111-111111111111",
  studentName: "นักเรียน ทดสอบ",
  studentPhotoUrl: null,
  schoolId: 1,
  schoolName: "โรงเรียน",
  grade: "ม.1",
  room: "1",
  consecutiveAbsentDays: 0,
  absentDays: 0,
  termAbsentDays: 0,
  absenceResetAfterDate: null,
  lateCount: 0,
  subjectLateCount: 0,
  recordedDayCount: 0,
  attendanceRatePercent: null,
  riskTier: "WATCH",
  riskScore: 0,
  openCaseCount: 0,
  latestOpenCaseId: null,
  latestOpenCaseReason: null,
  latestOpenTaskId: null,
  latestCaseId: null,
  latestCaseStatus: null,
  latestCaseAt: null,
  latestCaseMagicLink: null,
  latestCaseHadAssignment: false,
  problemCategoryLabel: "ปัญหาครอบครัว",
  concernLevelCode: "WATCH",
  concernLevelLabel: "ควรเฝ้าดู",
  commentCount: 1,
  pendingCommentCount: 1,
  teacherComment: "พบปัญหาที่ต้องติดตาม",
};

function renderActions(
  row = student,
  canOpenCase = true,
  canViewCase = true,
  canViewStudent = true,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WatchlistRowActions
          row={row}
          canOpenCase={canOpenCase}
          canViewCase={canViewCase}
          canViewStudent={canViewStudent}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  restoreApiStub();
  vi.restoreAllMocks();
});

describe("watchlist case actions", () => {
  it("reads every full observation in a dialog without leaving watchlist or opening a case", async () => {
    const commentUrl = `/students/${student.studentId}/classroom-comments`;
    const descriptions = [
      "ข้อสังเกตแรกที่ยาวกว่าสรุปในตาราง\nรายละเอียดทั้งหมดของข้อสังเกตแรก",
      "ข้อสังเกตที่สอง",
      "ข้อสังเกตที่สาม",
    ];
    const requests = stubApiRequests({
      [commentUrl]: {
        data: descriptions.map((problemDescription, index) => ({
          id: String(index),
          studentTermId: student.studentId,
          concernLevelCode: "WATCH",
          concernLevelLabel: "ควรเฝ้าดู",
          problemCategoryLabel: "ปัญหาครอบครัว",
          problemDescription,
          authorDisplayName: `ครูคนที่ ${index + 1}`,
          commentedAt: "2026-10-09T00:00:00Z",
        })),
        meta: { totalCount: 3 },
      },
    });
    renderActions({ ...student, commentCount: 3 });
    expect(requests.some((request) => request.url === commentUrl)).toBe(false);
    fireEvent.click(
      screen.getByRole("button", { name: /ดูข้อสังเกตทั้งหมดของ/ }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "ข้อสังเกตทั้งหมด",
    });
    await waitFor(() =>
      expect(within(dialog).getAllByRole("listitem")).toHaveLength(3),
    );
    descriptions.forEach((description) =>
      expect(
        within(dialog).getByText(description, {
          exact: true,
          normalizer: (text) => text,
        }),
      ).toBeTruthy(),
    );
    expect(within(dialog).getByText("ผู้บันทึก: ครูคนที่ 3")).toBeTruthy();
    expect(requests.some((request) => request.url === "/cases")).toBe(false);
    expect(
      screen.queryByRole("link", { name: /ดูข้อสังเกตทั้งหมดของ/ }),
    ).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "ปิด" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows an empty observation history without opening a case", async () => {
    stubApiRequests();
    renderActions();
    fireEvent.click(
      screen.getByRole("button", { name: /ดูข้อสังเกตทั้งหมดของ/ }),
    );
    expect(await screen.findByText("ยังไม่มีข้อสังเกต")).toBeTruthy();
  });

  it("lets users retry when observations fail to load", async () => {
    stubApiRequests();
    const list = vi
      .spyOn(schoolStructureService, "listStudentClassroomComments")
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValue({ data: [], meta: { totalCount: 0 } });
    renderActions();
    fireEvent.click(
      screen.getByRole("button", { name: /ดูข้อสังเกตทั้งหมดของ/ }),
    );
    expect(await screen.findByText("โหลดข้อสังเกตไม่สำเร็จ")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ลองโหลดอีกครั้ง" }));
    expect(await screen.findByText("ยังไม่มีข้อสังเกต")).toBeTruthy();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("disables observation reading without student access", () => {
    stubApiRequests();
    renderActions(student, true, true, false);
    expect(
      screen.getByRole("button", { name: /ดูข้อสังเกตทั้งหมดของ/ }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.queryByRole("link", { name: /ดูข้อสังเกตทั้งหมดของ/ }),
    ).toBeNull();
  });
  it("never auto-opens a case and only enables open when no case/link exists", () => {
    const requests = stubApiRequests();
    renderActions();
    expect(
      screen.getByRole("button", { name: /ดูรายละเอียดเคสของ/ }),
    ).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "แชร์ลิงก์" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByRole("button", { name: /เปิดเคสติดตามนักเรียน/ }),
    ).toHaveProperty("disabled", false);
    expect(requests.some((request) => request.url === "/cases")).toBe(false);
  });

  it.each([
    "OPEN",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "AWAITING_REFERRAL",
    "AWAITING_REFERRAL_OUTCOME",
  ])(
    "disables duplicate opening while the student has an active %s case",
    (status) => {
      stubApiRequests();
      renderActions({
        ...student,
        latestCaseId: 77,
        latestCaseStatus: status,
        latestCaseMagicLink: "https://example.test/follow-up",
      });
      expect(
        screen.getByRole("link", { name: /ดูรายละเอียดเคสของ/ }),
      ).toHaveProperty("pathname", "/cases/77");
      expect(
        screen.getByRole("button", { name: /เปิดเคสติดตามนักเรียน/ }),
      ).toHaveProperty("disabled", true);
      expect(screen.getByRole("button", { name: "แชร์ลิงก์" })).toHaveProperty(
        "disabled",
        false,
      );
    },
  );

  it("keeps every action visible and disabled for a user without its permissions", () => {
    stubApiRequests();
    renderActions(
      {
        ...student,
        latestCaseId: 77,
        latestCaseStatus: "RESOLVED",
        latestCaseMagicLink: "https://example.test/old-link",
      },
      false,
      false,
    );
    expect(
      screen.getByRole("button", { name: /ดูรายละเอียดเคสของ/ }),
    ).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "แชร์ลิงก์" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByRole("button", { name: /เปิดเคสติดตามนักเรียน/ }),
    ).toHaveProperty("disabled", true);
  });

  it("allows a new case after completion and does not share the old closed link", () => {
    stubApiRequests();
    renderActions({
      ...student,
      latestCaseId: 77,
      latestCaseStatus: "RESOLVED",
      latestCaseMagicLink: "https://example.test/old-link",
    });
    expect(
      screen.getByRole("button", { name: /เปิดเคสติดตามนักเรียน/ }),
    ).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: "แชร์ลิงก์" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("does not reopen completed observations until a new comment exists", () => {
    stubApiRequests();
    renderActions({
      ...student,
      latestCaseId: 77,
      latestCaseStatus: "RESOLVED",
      pendingCommentCount: 0,
    });
    expect(
      screen.getByRole("button", { name: /เปิดเคสติดตามนักเรียน/ }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("link", { name: /ดูรายละเอียดเคสของ/ }),
    ).toBeTruthy();
  });

  it("uses the shared confirmation dialog before manually opening with the director's reason", async () => {
    stubApiRequests({
      "/cases": { success: true, created: true, data: { id: 77 } },
    });
    const openCase = vi.spyOn(casesService, "openCase");
    renderActions();
    fireEvent.click(
      screen.getByRole("button", { name: /เปิดเคสติดตามนักเรียน/ }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(openCase).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/เหตุผลที่เปิดเคส/), {
      target: { value: "ผอ.เห็นว่าควรติดตามเรื่องนี้" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "เปิดเคส" }));
    await waitFor(() =>
      expect(openCase).toHaveBeenCalledWith(
        {
          student_id: student.studentId,
          reason: "ผอ.เห็นว่าควรติดตามเรื่องนี้",
        },
        "INTERNAL",
      ),
    );
  });
});
