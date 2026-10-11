import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { casesService } from "../api/cases.service";
import { ReferralForm } from "./ReferralForm";

interface PickerStubProps {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  "aria-invalid"?: boolean;
}

// The calendar, clock and agency popovers have their own tests; a plain input
// per picker keeps this file about the form's rules and its confirm step.
vi.mock("../../../components/base", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../components/base")>();
  function PickerStub(props: PickerStubProps) {
    return (
      <input
        aria-invalid={props["aria-invalid"]}
        aria-label={props.ariaLabel}
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      />
    );
  }
  return {
    ...actual,
    Combobox: PickerStub,
    DatePicker: PickerStub,
    TimePicker: PickerStub,
  };
});
vi.mock("../../../components/layout/credential-dialog", () => ({
  CredentialDialog: (props: {
    open: boolean;
    value: string;
    onClose: () => void;
  }) =>
    props.open ? (
      <div>
        <p>{props.value}</p>
        <button onClick={props.onClose} type="button">
          เสร็จสิ้น
        </button>
      </div>
    ) : null,
}));

const WINDOW_ORDER_MESSAGE = "วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่ม";

function show() {
  vi.spyOn(casesService, "getReferralAgencies").mockResolvedValue([]);
  const sendReferral = vi
    .spyOn(casesService, "sendReferral")
    .mockResolvedValue({
      success: true,
      data: {
        referral_id: "referral",
        url: "https://example.test/referral-report/link-token",
        access_code: "CODE_PLACEHOLDER",
        starts_at: "2026-10-11T02:00:00.000Z",
        expires_at: "2026-10-18T09:30:00.000Z",
      },
    });
  const onSent = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <ReferralForm caseId={42} onSent={onSent} />
    </QueryClientProvider>,
  );
  return { onSent, sendReferral };
}

function fill(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValidReferral(): void {
  fill("วันที่เริ่มส่งต่อ", "2026-10-11");
  fill("เวลาเริ่มส่งต่อ", "09:00");
  fill("วันที่สิ้นสุดส่งต่อ", "2026-10-18");
  fill("เวลาสิ้นสุดส่งต่อ", "16:30");
  fill("หน่วยงานที่ส่งต่อ", "3");
  fireEvent.change(screen.getByPlaceholderText("เหตุผลการส่งต่อ"), {
    target: { value: "  ต้องการความช่วยเหลือด้านสุขภาพ  " },
  });
}

function send(): void {
  fireEvent.click(screen.getByRole("button", { name: "ส่งต่อ" }));
}

describe("ReferralForm", () => {
  it("names each missing field and does not ask to confirm", async () => {
    const { sendReferral } = show();

    send();

    expect(await screen.findByText("กรุณาเลือกวันที่สิ้นสุด")).toBeTruthy();
    expect(screen.getByText("กรุณาเลือกหน่วยงานที่ส่งต่อ")).toBeTruthy();
    expect(screen.getByText("กรุณาระบุเหตุผลการส่งต่อ")).toBeTruthy();
    // The start opens "now" by default, so it is not among the missing.
    expect(screen.queryByText("กรุณาเลือกวันที่เริ่ม")).toBeNull();
    expect(
      screen.getByLabelText("วันที่สิ้นสุดส่งต่อ").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(
      screen.getByLabelText("วันที่เริ่มส่งต่อ").getAttribute("aria-invalid"),
    ).not.toBe("true");
    expect(screen.queryByText("ยืนยันการส่งต่อ")).toBeNull();
    expect(sendReferral).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByLabelText("วันที่สิ้นสุดส่งต่อ"),
    );
  });

  it("flags a window that ends before it starts, and clears once fixed", async () => {
    const { sendReferral } = show();
    fillValidReferral();
    fill("วันที่สิ้นสุดส่งต่อ", "2026-10-11");
    fill("เวลาสิ้นสุดส่งต่อ", "08:00");

    send();

    await waitFor(() =>
      expect(screen.getAllByText(WINDOW_ORDER_MESSAGE)).toHaveLength(2),
    );
    expect(sendReferral).not.toHaveBeenCalled();

    // Moving the *start* fixes the end fields too: the rule spans all four.
    fill("เวลาเริ่มส่งต่อ", "07:00");

    await waitFor(() =>
      expect(screen.queryByText(WINDOW_ORDER_MESSAGE)).toBeNull(),
    );
  });

  it("sends only after the owner confirms", async () => {
    const { onSent, sendReferral } = show();
    fillValidReferral();

    send();
    fireEvent.click(await screen.findByRole("button", { name: "ยกเลิก" }));
    await waitFor(() =>
      expect(screen.queryByText("ยืนยันการส่งต่อ")).toBeNull(),
    );
    expect(sendReferral).not.toHaveBeenCalled();

    send();
    fireEvent.click(await screen.findByRole("button", { name: "ยืนยัน" }));

    await waitFor(() =>
      expect(sendReferral).toHaveBeenCalledExactlyOnceWith(42, {
        referral_agency_id: 3,
        referral_note: "ต้องการความช่วยเหลือด้านสุขภาพ",
        starts_at: "2026-10-11T02:00:00.000Z",
        expires_at: "2026-10-18T09:30:00.000Z",
      }),
    );
    // The access code is shown once; closing it hands control back.
    expect(await screen.findByText("CODE_PLACEHOLDER")).toBeTruthy();
    expect(onSent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "เสร็จสิ้น" }));
    expect(onSent).toHaveBeenCalledOnce();
  });
});
