import { LoginCard } from "../components/LoginCard";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";

export function AdminAccessPage() {
  return (
    <GuestPageShell
      as="main"
      className="relative isolate overflow-hidden bg-surface-page px-0 py-0 before:absolute before:inset-x-0 before:top-0 before:h-64 before:rounded-b-login-hero before:bg-surface-app before:content-[''] sm:before:h-80"
      containerClassName="max-w-none"
      contentClassName="relative z-10 max-w-5xl px-4 pb-10 pt-9 sm:px-6"
    >
      <LoginCard />
    </GuestPageShell>
  );
}
