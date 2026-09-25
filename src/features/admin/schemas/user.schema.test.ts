import { describe, expect, it } from "vitest";
import { EMPTY_USER_FORM, createUserFormSchema } from "./user.schema";

const valid = {
  ...EMPTY_USER_FORM,
  username: "burapha.admin",
  FirstName: "สมชาย",
  LastName: "ใจดี",
  PersonID_Onec: "1234567890123",
  phone: "0812345678",
  email: "admin@example.com",
  role: "ADMIN",
};

function messagesFor(
  values: Partial<typeof valid>,
  field: "username" | "password",
  originalUsername?: string,
) {
  const result = createUserFormSchema(originalUsername).safeParse({
    ...valid,
    ...values,
  });
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
}

describe("user form credentials", () => {
  it("accepts English letters, digits and symbols", () => {
    expect(messagesFor({ username: "burapha.admin_01" }, "username")).toEqual(
      [],
    );
    expect(messagesFor({ password: "Pa$$w0rd!" }, "password")).toEqual([]);
  });

  it("explains a short, Thai or spaced value under its own field", () => {
    expect(messagesFor({ username: "admin" }, "username")).toEqual([
      "ชื่อผู้ใช้งานต้องมีอย่างน้อย 8 ตัวอักษร",
    ]);
    expect(
      messagesFor({ username: "ผู้ดูแลระบบบูรพา" }, "username")[0],
    ).toContain("ใช้ได้เฉพาะภาษาอังกฤษ");
    expect(messagesFor({ password: "1234 5678" }, "password")[0]).toContain(
      "ห้ามเว้นวรรค",
    );
    expect(messagesFor({ password: "a".repeat(51) }, "password")).toEqual([
      "รหัสผ่านต้องไม่เกิน 50 ตัวอักษร",
    ]);
  });

  it("allows an empty password (keep it, or let the server issue one)", () => {
    expect(messagesFor({ password: "" }, "password")).toEqual([]);
  });

  it("lets an older account keep a username shorter than today's minimum", () => {
    expect(messagesFor({ username: "Tha" }, "username", "Tha")).toEqual([]);
    expect(messagesFor({ username: "Thai" }, "username", "Tha")).toEqual([
      "ชื่อผู้ใช้งานต้องมีอย่างน้อย 8 ตัวอักษร",
    ]);
  });
});
