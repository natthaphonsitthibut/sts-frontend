import { Card } from "../../../components/base";
import { AdminLoginForm } from "./AdminLoginForm";
import { LoginDivider } from "./LoginDivider";
import { ThaIdLoginButton } from "./ThaIdLoginButton";

export function LoginCard() {
  return (
    <Card className="rounded-[60px] border-slate-200/80 px-[60px] pb-[60px] pt-[100px] shadow-[0_10px_60px_rgba(0,0,0,0.04)] max-sm:rounded-[40px] max-sm:px-[30px] max-sm:pb-10 max-sm:pt-20">
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-extrabold text-slate-900">
          เข้าสู่ระบบ STS
        </h1>
        <div className="mx-auto max-w-xs text-base font-medium leading-6 text-slate-400">
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
