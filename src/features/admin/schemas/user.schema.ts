import { z } from "zod";
import {
  nullableLatitude,
  nullableLongitude,
  optionalEmail,
  requiredThaiPhone,
} from "../../../lib/validation";

export const userFormSchema = z
  .object({
    username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้งาน"),
    password: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || value.length >= 8, {
        message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      }),
    FirstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
    LastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
    PersonID_Onec: z
      .string()
      .trim()
      .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),
    phone: requiredThaiPhone,
    email: optionalEmail.refine((value) => value.length > 0, {
      message: "กรุณากรอกอีเมล",
    }),
    affiliation: z.string().trim().min(1, "กรุณากรอกสังกัด"),
    line_id: z.string().trim().max(64, "LINE ID ยาวเกินไป"),
    address_line: z.string().trim().max(255, "บ้านเลขที่ยาวเกินไป"),
    address_village_no: z.string().trim().max(100, "หมู่ยาวเกินไป"),
    address_street: z.string().trim().max(150, "ชื่อถนนยาวเกินไป"),
    address_soi: z.string().trim().max(150, "ชื่อซอยยาวเกินไป"),
    address_trok: z.string().trim().max(150, "ชื่อตรอกยาวเกินไป"),
    address_sub_district: z.string().trim().max(100, "ตำบล/แขวงยาวเกินไป"),
    address_district: z.string().trim().max(100, "อำเภอ/เขตยาวเกินไป"),
    address_province: z.string().trim().max(100, "จังหวัดยาวเกินไป"),
    address_postal_code: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{5}$/.test(value), {
        message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
      }),
    address_latitude: nullableLatitude,
    address_longitude: nullableLongitude,
    role: z.string().trim().min(1, "กรุณาเลือกบทบาท"),
  })
  .superRefine((values, context) => {
    if ((values.address_latitude === null) !== (values.address_longitude === null)) {
      context.addIssue({
        code: "custom",
        message: "กรุณาระบุ latitude และ longitude ให้ครบทั้งคู่",
        path: [values.address_latitude === null ? "address_latitude" : "address_longitude"],
      });
    }
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
};
