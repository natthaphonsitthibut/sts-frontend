import { Card } from "../../../components/base";
import { AdminLoginForm } from "./AdminLoginForm";
import { LoginBrandMark } from "./LoginBrandMark";
import { LoginDivider } from "./LoginDivider";
import { AraIdLoginButton } from "./AraIdLoginButton";

interface LoginCardProps {
  araIdError: unknown;
  araIdPending: boolean;
  onAraIdLogin: () => void;
}

export function LoginCard({
  araIdError,
  araIdPending,
  onAraIdLogin,
}: LoginCardProps) {
  return (
    // The brand mark is absolutely positioned at the top of this box, so the
    // padding has to clear its height (clamp(10rem,18vh,14rem)) and nothing
    // more. The extra air it used to reserve pushed the card past the fold on a
    // 1440x900 laptop once the Sarabun type ramp made the form taller.
    <div className="relative pt-[clamp(11rem,22vh,18rem)]">
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <LoginBrandMark />
      </div>

      <Card className="rounded-login-card border-transparent px-6 py-8 shadow-login-surface sm:px-10 sm:py-10">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-extrabold text-slate-900">
              เข้าสู่ระบบ STS
            </h1>
            <div className="mx-auto max-w-xs text-sm font-medium leading-6 text-slate-500">
              <div>ระบบติดตามผู้เรียน</div>
              <div>Zero Dropout เพื่อเด็กไทยทุกคน</div>
            </div>
          </div>

          <AdminLoginForm />
          <LoginDivider />
          <AraIdLoginButton
            error={araIdError}
            isPending={araIdPending}
            onClick={onAraIdLogin}
          />
        </div>
      </Card>
    </div>
  );
}
