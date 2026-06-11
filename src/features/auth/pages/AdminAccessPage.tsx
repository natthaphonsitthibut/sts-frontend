import { LoginBrandMark } from "../components/LoginBrandMark";
import { LoginCard } from "../components/LoginCard";

export function AdminAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <div className="w-full max-w-[600px] p-8">
        <LoginBrandMark />
        <LoginCard />
      </div>
    </main>
  );
}
