import { Card } from "../../../components/base";
import { AdminLoginForm } from "./AdminLoginForm";
import { LoginBrandMark } from "./LoginBrandMark";
import { LoginDivider } from "./LoginDivider";
import { ThaIdLoginButton } from "./ThaIdLoginButton";

export function LoginCard() {
  return (
    <Card className="relative rounded-lg border-slate-200 px-10 pb-10 pt-16 shadow-card max-sm:px-6 max-sm:pt-14">
      {/* Floating mark is absolute so it overlaps the card edge without adding
          flow height — keeps the whole card short enough to fit small screens. */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2">
        <LoginBrandMark />
      </div>

      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-extrabold text-slate-900">
          เข้าสู่ระบบ STS
        </h1>
        <div className="mx-auto max-w-xs text-sm font-medium leading-6 text-slate-400">
          <div>ระบบดูแลช่วยเหลือนักเรียนโครงการ</div>
          <div>Zero Dropout เพื่อเด็กไทยทุกคน</div>
        </div>
      </div>

      <AdminLoginForm />
      <LoginDivider />
      <ThaIdLoginButton />
    </Card>
  );
}
