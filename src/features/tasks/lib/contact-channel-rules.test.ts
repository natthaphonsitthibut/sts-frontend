import { describe, expect, it } from "vitest";
import { contactChannelRequiresDetail } from "./contact-channel-rules";

describe("contact channel detail rules", () => {
  const options = [
    { code: "FAX", requiresDetail: true },
    { code: "OTHER", requiresDetail: false },
  ];

  it("uses catalog flags instead of the channel name", () => {
    expect(contactChannelRequiresDetail(options, "FAX")).toBe(true);
    expect(contactChannelRequiresDetail(options, "OTHER")).toBe(false);
  });

  it("does not retain detail for empty or unknown channels", () => {
    expect(contactChannelRequiresDetail(options, "")).toBe(false);
    expect(contactChannelRequiresDetail(options, "RETIRED")).toBe(false);
    expect(contactChannelRequiresDetail([], "FAX")).toBe(false);
  });
});
