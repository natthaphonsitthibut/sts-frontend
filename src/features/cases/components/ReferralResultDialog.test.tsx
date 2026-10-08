import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseReferralRecord } from "../types/cases.types";
import { ReferralResultDialog } from "./ReferralResultDialog";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("../hooks/useRecordReferralResult", () => ({
  useRecordReferralResult: () => ({
    mutate,
    reset: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

const referral: CaseReferralRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  case_review_id: "33333333-3333-4333-8333-333333333333",
  referral_agency_id: 12,
  agency_name: "โรงพยาบาลกลาง",
  agency_kind_code: "HOSPITAL",
  agency_kind_label: "โรงพยาบาล",
  status_code: "REFERRED",
  status_label: "ส่งต่อแล้ว",
  status_badge_variant: "secondary",
  referred_at: "2026-10-01T03:00:00.000Z",
  referred_by: "ผอ. ทดสอบ",
  referral_note: "ส่งต่อเพื่อตรวจสุขภาพ",
  result: null,
};

// Base Button renders its loading text hidden beside the label, so match the
// label as a prefix of the button text.
function submitButton(): HTMLButtonElement {
  const button = screen
    .getAllByRole("button")
    .find((candidate) => candidate.textContent?.startsWith("บันทึกผล"));
  if (!button) throw new Error("submit button not found");
  return button as HTMLButtonElement;
}

describe("ReferralResultDialog", () => {
  beforeEach(() => mutate.mockReset());

  it("sends either result back to review without closing the case", () => {
    render(
      <ReferralResultDialog
        caseId={10}
        onOpenChange={vi.fn()}
        referral={referral}
      />,
    );
    const consequence = () =>
      screen.getByText("เคสจะกลับไปรอพิจารณา เพื่อเลือกดำเนินการต่อ");

    // The line holds its space before a choice so the dialog never grows.
    expect(consequence().className).toContain("invisible");

    for (const label of ["สำเร็จ", "ยังไม่สำเร็จ"]) {
      fireEvent.click(screen.getByLabelText(label));
      expect(consequence().className).not.toContain("invisible");
      expect(submitButton().textContent).toContain("บันทึกผล");
      expect(submitButton().textContent).not.toContain("ปิดเคส");
    }
  });

  it("needs a result and a note before sending the trimmed note", () => {
    render(
      <ReferralResultDialog
        caseId={10}
        onOpenChange={vi.fn()}
        referral={referral}
      />,
    );
    expect(submitButton().disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("ยังไม่สำเร็จ"));
    expect(submitButton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/สรุปผลจากหน่วยงาน/), {
      target: { value: "  ติดต่อครอบครัวไม่ได้  " },
    });
    fireEvent.click(submitButton());

    expect(mutate).toHaveBeenCalledWith(
      {
        caseId: 10,
        referralId: referral.id,
        payload: {
          result_code: "NOT_SUCCEEDED",
          result_note: "ติดต่อครอบครัวไม่ได้",
        },
      },
      expect.any(Object),
    );
  });
});
