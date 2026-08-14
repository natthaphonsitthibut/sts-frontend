import { Link } from "react-router-dom";
import { StsLogo } from "../../../components/base";

export function LoginBrandMark() {
  return (
    <Link
      aria-label="กลับหน้าหลัก"
      className="flex h-32 w-36 items-center justify-center rounded-4xl bg-white shadow-login-brand-mark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 sm:h-[clamp(10rem,18vh,14rem)] sm:w-[clamp(12rem,20vh,16rem)] sm:rounded-login-brand-mark"
      to="/"
    >
      <StsLogo aria-hidden="true" className="size-24 sm:size-32" />
    </Link>
  );
}
