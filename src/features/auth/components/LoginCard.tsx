import { Card } from "../../../components/base";
import { AdminLoginForm } from "./AdminLoginForm";
import { LoginBrandMark } from "./LoginBrandMark";
import { LoginDivider } from "./LoginDivider";
import { ThaIdLoginButton } from "./ThaIdLoginButton";

export function LoginCard() {
  return (
    <div className="relative pt-48 sm:pt-60">
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <LoginBrandMark />
      </div>

      <Card className="rounded-login-card border-transparent px-6 py-10 shadow-login-surface sm:px-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-extrabold text-slate-900">
              เข้าสู่ระบบ STS
            </h1>
            <div className="mx-auto max-w-xs text-sm font-medium leading-6 text-slate-500">
              <div>ระบบดูแลช่วยเหลือนักเรียนโครงการ</div>
              <div>Zero Dropout เพื่อเด็กไทยทุกคน</div>
            </div>
          </div>

          <AdminLoginForm />
          <LoginDivider />
          <ThaIdLoginButton />
        </div>
      </Card>
    </div>
  );
}
