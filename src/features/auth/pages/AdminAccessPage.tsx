import { LoginCard } from "../components/LoginCard";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";

export function AdminAccessPage() {
  return (
    <GuestPageShell
      centered
      as="main"
      contentClassName="max-w-[520px] px-6 pb-8 pt-16"
    >
      <LoginCard />
    </GuestPageShell>
  );
}
