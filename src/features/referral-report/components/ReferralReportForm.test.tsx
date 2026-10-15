import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReferralReportDraft } from "../schemas/referral-report.schema";
import { ReferralReportForm } from "./ReferralReportForm";

function show(props: Partial<Parameters<typeof ReferralReportForm>[0]> = {}): {
  onSubmit: ReturnType<typeof vi.fn>;
} {
  const onSubmit = vi.fn();
  render(
    <ReferralReportForm
      error={null}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit };
}

describe("ReferralReportForm", () => {
  it("names what is missing under each field instead of sending", async () => {
    const { onSubmit } = show({
      draft: { resultCode: "", actionDate: "", actionTime: "", note: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: "ส่งรายงาน" }));

    expect(await screen.findByText("กรุณาเลือกผลการดำเนินการ")).toBeTruthy();
    expect(screen.getByText("กรุณาสรุปการดำเนินการและผล")).toBeTruthy();
    expect(
      screen
        .getByLabelText(/สรุปการดำเนินการและผล/)
        .getAttribute("aria-invalid"),
    ).toBe("true");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "สำเร็จ" }),
    );
  });

  it("clears a field's message once it is filled in", async () => {
    show({
      draft: { resultCode: "", actionDate: "", actionTime: "", note: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ส่งรายงาน" }));
    await screen.findByText("กรุณาเลือกผลการดำเนินการ");

    fireEvent.click(screen.getByRole("radio", { name: "ยังไม่สำเร็จ" }));

    await waitFor(() =>
      expect(screen.queryByText("กรุณาเลือกผลการดำเนินการ")).toBeNull(),
    );
    expect(screen.getByText("กรุณาสรุปการดำเนินการและผล")).toBeTruthy();
  });

  it("starts at สำเร็จ, today and the current time", () => {
    show();
    expect(screen.getByRole("radio", { name: "สำเร็จ" })).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.getByLabelText("เวลาที่ดำเนินการ")).toBeTruthy();
  });

  it("sends the trimmed report", async () => {
    const { onSubmit } = show({
      draft: {
        resultCode: "SUCCEEDED",
        actionDate: "2026-01-05",
        actionTime: "14:30",
        note: "",
      },
    });

    fireEvent.change(screen.getByLabelText(/สรุปการดำเนินการและผล/), {
      target: { value: "  ติดตามแล้ว  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "ส่งรายงาน" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
        result_code: "SUCCEEDED",
        action_at: "2026-01-05T07:30:00.000Z",
        result_note: "ติดตามแล้ว",
      }),
    );
  });

  it("does not send again while a report is already going out", async () => {
    const { onSubmit } = show({
      isSubmitting: true,
      draft: {
        resultCode: "SUCCEEDED",
        actionDate: "2026-01-05",
        actionTime: "09:00",
        note: "ติดตามแล้ว",
      },
    });

    fireEvent.submit(
      screen.getByLabelText(/สรุปการดำเนินการและผล/).closest("form")!,
    );

    // Validation is asynchronous; give a valid submit time to arrive.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "กำลังส่ง" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("starts from a draft and reports every change back", async () => {
    const draft: ReferralReportDraft = {
      resultCode: "NOT_SUCCEEDED",
      actionDate: "2026-01-05",
      actionTime: "09:00",
      note: "ยังติดต่อผู้ปกครองไม่ได้",
    };
    const onDraftChange = vi.fn();
    const { onSubmit } = show({ draft, onDraftChange });

    expect(screen.getByRole("radio", { name: "ยังไม่สำเร็จ" })).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.getByLabelText(/สรุปการดำเนินการและผล/)).toHaveProperty(
      "value",
      "ยังติดต่อผู้ปกครองไม่ได้",
    );

    fireEvent.change(screen.getByLabelText(/สรุปการดำเนินการและผล/), {
      target: { value: "ติดต่อได้แล้ว" },
    });
    await waitFor(() =>
      expect(onDraftChange).toHaveBeenLastCalledWith({
        ...draft,
        note: "ติดต่อได้แล้ว",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "ส่งรายงาน" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
        result_code: "NOT_SUCCEEDED",
        action_at: "2026-01-05T02:00:00.000Z",
        result_note: "ติดต่อได้แล้ว",
      }),
    );
  });
});
