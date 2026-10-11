import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { referralReportService } from "../api/referral-report.service";
import { ReferralReportAccessGate } from "./ReferralReportAccessGate";

vi.mock("../../../components/layout/guest-page-shell", () => ({
  GuestPageShell: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("../../auth/components/AraIdQrChallengeView", () => ({
  AraIdQrChallengeView: (props: { onRefresh: () => void }) => (
    <button onClick={props.onRefresh} type="button">
      ขอ QR ใหม่
    </button>
  ),
}));

const CODE_MESSAGE = "กรุณากรอกรหัส 6 หลัก";

function show(notice?: string) {
  const createChallenge = vi
    .spyOn(referralReportService, "createAraIdChallenge")
    .mockResolvedValue({
      challengeToken: "CHALLENGE",
      verificationUrl: "https://example.test/verify",
      qrDataUrl: "data:image/png;base64,",
      referenceCode: "REF",
      expiresAt: "2026-10-11T10:00:00.000Z",
    });
  vi.spyOn(referralReportService, "pollAraIdChallenge").mockResolvedValue({
    status: "PENDING",
  });
  const onVerified = vi.fn();
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
      <ReferralReportAccessGate
        maskedStudentName="ด.ช. ท*** ส***"
        notice={notice}
        onVerified={onVerified}
        referral={{
          agency_name: "โรงพยาบาลทดสอบ",
          agency_kind_label: "สาธารณสุข",
          starts_at: null,
          expires_at: null,
        }}
        token="link-token"
      />
    </QueryClientProvider>,
  );
  return { createChallenge, onVerified };
}

function codeInput(): HTMLInputElement {
  return screen.getByLabelText(/รหัสจากโรงเรียน/) as HTMLInputElement;
}

function submit(): void {
  fireEvent.click(
    screen.getByRole("button", { name: "ยืนยันตัวตนด้วย AraID" }),
  );
}

describe("ReferralReportAccessGate", () => {
  it("explains an incomplete code under the field and asks nothing of the server", async () => {
    const { createChallenge } = show();

    submit();
    expect(await screen.findByText(CODE_MESSAGE)).toBeTruthy();
    expect(codeInput().getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(codeInput(), { target: { value: "12345" } });
    submit();
    await waitFor(() => expect(screen.getByText(CODE_MESSAGE)).toBeTruthy());
    expect(createChallenge).not.toHaveBeenCalled();
  });

  it("keeps digits only as the code is typed or pasted", () => {
    show();

    fireEvent.change(codeInput(), { target: { value: "12-34 5a6" } });

    expect(codeInput().value).toBe("123456");
  });

  it("starts the AraID challenge with the code, and reuses it for a new QR", async () => {
    const { createChallenge } = show();

    fireEvent.change(codeInput(), { target: { value: "123456" } });
    submit();

    await waitFor(() =>
      expect(createChallenge).toHaveBeenCalledExactlyOnceWith(
        "link-token",
        "123456",
      ),
    );
    fireEvent.click(await screen.findByRole("button", { name: "ขอ QR ใหม่" }));
    await waitFor(() => expect(createChallenge).toHaveBeenCalledTimes(2));
    expect(createChallenge).toHaveBeenLastCalledWith("link-token", "123456");
  });

  it("says why the agency is back at the gate", () => {
    show("การยืนยันตัวตนหมดอายุ กรุณายืนยันอีกครั้ง");

    expect(
      screen.getByText("การยืนยันตัวตนหมดอายุ กรุณายืนยันอีกครั้ง"),
    ).toBeTruthy();
  });
});
