import { SchoolIcon } from "../../../components/base";

export function LoginBrandMark() {
  return (
    <div className="flex h-32 w-36 items-center justify-center rounded-4xl bg-white shadow-login-brand-mark sm:h-44 sm:w-52 sm:rounded-login-brand-mark">
      <SchoolIcon
        aria-hidden="true"
        className="size-24 text-primary drop-shadow-login-icon sm:size-32"
      />
    </div>
  );
}
