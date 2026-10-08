import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { casesService } from "../api/cases.service";
import { ReferralAccessCodeButton } from "./ReferralAccessCodeButton";

function show(props: { disabled?: boolean; canRefresh?: boolean } = {}) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <ReferralAccessCodeButton
        compact
        caseId={1}
        referralId="referral"
        {...props}
      />
    </QueryClientProvider>,
  );
}
afterEach(() => vi.restoreAllMocks());
describe("referral code controls", () => {
  it("keeps an unavailable key visible and disabled", () => {
    const get = vi.spyOn(casesService, "getReferralAccessCode");
    show({ disabled: true });
    const key = screen.getByRole("button", { name: "ดูรหัส" });
    expect(key).toHaveProperty("disabled", true);
    fireEvent.click(key);
    expect(get).not.toHaveBeenCalled();
  });
  it("refreshes the displayed code only when requested", async () => {
    vi.spyOn(casesService, "getReferralAccessCode").mockResolvedValue(
      "CODE_BEFORE",
    );
    const refresh = vi
      .spyOn(casesService, "refreshReferralAccessCode")
      .mockResolvedValue("CODE_AFTER");
    show();
    fireEvent.click(screen.getByRole("button", { name: "ดูรหัส" }));
    await screen.findByText("CODE_BEFORE");
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "เปลี่ยนรหัส" }));
    await screen.findByText("CODE_AFTER");
    expect(refresh).toHaveBeenCalledExactlyOnceWith(1, "referral");
    fireEvent.click(screen.getByRole("button", { name: "เสร็จสิ้น" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("allows viewing while refresh is unavailable", async () => {
    vi.spyOn(casesService, "getReferralAccessCode").mockResolvedValue(
      "CODE_PLACEHOLDER",
    );
    show({ canRefresh: false });
    fireEvent.click(screen.getByRole("button", { name: "ดูรหัส" }));
    expect(
      await screen.findByRole("button", { name: "เปลี่ยนรหัส" }),
    ).toHaveProperty("disabled", true);
  });
});
