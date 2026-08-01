import { SchoolIcon } from "../../../components/base";

export function LoginBrandMark() {
  return (
    <div className="flex h-32 w-36 items-center justify-center rounded-4xl bg-white shadow-login-brand-mark sm:h-[clamp(10rem,18vh,14rem)] sm:w-[clamp(12rem,20vh,16rem)] sm:rounded-login-brand-mark">
      <SchoolIcon
        aria-hidden="true"
        className="size-24 text-primary drop-shadow-login-icon sm:size-32"
      />
    </div>
  );
}
