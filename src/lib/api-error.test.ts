import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./api-error";

describe("getApiErrorMessage upload errors", () => {
  it.each([
    [
      "Too many fields",
      "ข้อมูลในแบบฟอร์มมีจำนวนเกินที่ระบบรองรับ กรุณาติดต่อผู้ดูแลระบบ",
    ],
    ["Too many files", "จำนวนไฟล์แนบเกินที่ระบบรองรับ"],
    ["File too large", "ไฟล์แนบมีขนาดเกินที่ระบบรองรับ"],
  ])("shows a Thai explanation for %s", (raw, expected) => {
    const error = new AxiosError(raw);
    error.response = { data: { message: raw } } as never;

    expect(getApiErrorMessage(error, "บันทึกไม่สำเร็จ")).toBe(expected);
  });
});
