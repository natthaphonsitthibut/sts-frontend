import { LoginCard } from "../components/LoginCard";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";

export function AdminAccessPage() {
  return (
    <GuestPageShell
      as="main"
      className="relative isolate overflow-x-hidden bg-surface-page px-0 py-0 before:absolute before:inset-x-0 before:top-0 before:h-[clamp(18rem,39vh,31rem)] before:rounded-b-login-hero before:bg-login-hero before:content-['']"
      containerClassName="max-w-none px-0 py-0 sm:px-0 sm:py-0"
      contentClassName="relative z-10 max-w-[1380px] px-4 pb-0 pt-[clamp(2rem,5vh,5rem)] sm:px-6"
      showHeader={false}
    >
      <LoginCard />
    </GuestPageShell>
  );
}
