import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ARAID_SESSION_QUERY_KEY } from "../../araid/hooks/useAraId";
import { teacherLineService } from "../api/teacher-line.service";
import { TeacherLineAraIdAuthorizePage } from "./TeacherLineAraIdAuthorizePage";

let client: QueryClient;
const challengeToken = "fixture-challenge-for-ui-test-only";

function renderPage() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(ARAID_SESSION_QUERY_KEY, { id: "fixture-profile" });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TeacherLineAraIdAuthorizePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState(
    null,
    "",
    `/line-link/araid-authorize#challenge=${challengeToken}`,
  );
  vi.spyOn(teacherLineService, "getAraIdChallenge").mockResolvedValue({
    challengeToken,
    verificationUrl: "",
    qrDataUrl: "",
    referenceCode: "TEST",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    schoolName: "โรงเรียนทดสอบ",
    status: "PENDING",
  });
  vi.spyOn(teacherLineService, "beginAraIdChallenge").mockResolvedValue({
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  });
  vi.spyOn(teacherLineService, "approveAraIdChallenge").mockResolvedValue();
});

afterEach(() => {
  client?.clear();
  window.history.replaceState(null, "", "/");
});

describe("TeacherLineAraIdAuthorizePage", () => {
  it.each([
    ["getAraIdChallenge", "ลิงก์ยืนยัน LINE ถูกปิดหรือหมดอายุแล้ว"],
    ["beginAraIdChallenge", "การเชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง"],
    [
      "approveAraIdChallenge",
      "บัญชีนี้เชื่อม LINE แล้ว หากต้องการเปลี่ยนกรุณาติดต่อผู้ดูแลระบบ",
    ],
    ["approveAraIdChallenge", "ไม่พบข้อมูลครูที่ตรงกับ AraID ในโรงเรียนนี้"],
    ["approveAraIdChallenge", "การยืนยัน AraID หมดอายุแล้ว"],
  ] as const)("shows the actual %s failure: %s", async (method, message) => {
    vi.mocked(teacherLineService[method]).mockRejectedValue(new Error(message));
    renderPage();
    expect(await screen.findByText(message)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "ยืนยันผ่าน AraID ไม่สำเร็จ" }),
    ).toBeTruthy();
    expect(screen.queryByText(/ข้อมูล AraID ไม่ตรงกับครูประจำชั้น/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "กลับหน้าหลัก AraID" }),
    ).toBeTruthy();
  });

  it("still approves a valid challenge", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "ยืนยันผ่าน AraID สำเร็จ" }),
    ).toBeTruthy();
    expect(teacherLineService.approveAraIdChallenge).toHaveBeenCalledTimes(1);
  });
});
