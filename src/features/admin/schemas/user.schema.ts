import { z } from "zod";
import {
  nullableLatitude,
  nullableLongitude,
  optionalEmail,
  optionalThaiPhone,
  thaiNationalId,
} from "../../../lib/validation";

export const userFormSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้งาน"),
  password: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 8, {
      message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    }),
  FirstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
  LastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
  PersonID_Onec: thaiNationalId,
  phone: optionalThaiPhone,
  email: optionalEmail,
  affiliation: z.string().trim(),
  line_id: z.string().trim().max(64),
  address_line: z.string().trim().max(255),
  address_village_no: z.string().trim().max(100),
  address_street: z.string().trim().max(150),
  address_soi: z.string().trim().max(150),
  address_trok: z.string().trim().max(150),
  address_sub_district: z.string().trim().max(100),
  address_district: z.string().trim().max(100),
  address_province: z.string().trim().max(100),
  address_postal_code: z.string().trim().refine(
    (value) => value === "" || /^\d{5}$/.test(value),
    "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
  ),
  address_latitude: nullableLatitude,
  address_longitude: nullableLongitude,
  role: z.string().trim().min(1, "กรุณาเลือกตำแหน่ง"),
  status: z.string().trim().min(1),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const EMPTY_USER_FORM: UserFormValues = {
  username: "",
  password: "",
  FirstName: "",
  LastName: "",
  PersonID_Onec: "",
  phone: "",
  email: "",
  affiliation: "",
  line_id: "",
  address_line: "",
  address_village_no: "",
  address_street: "",
  address_soi: "",
  address_trok: "",
  address_sub_district: "",
  address_district: "",
  address_province: "",
  address_postal_code: "",
  address_latitude: null,
  address_longitude: null,
  role: "",
  status: "ACTIVE",
};
