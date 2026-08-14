import { ChevronRight, Info, Languages, LogOut, Shield } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AraIdAppShell } from "../components/AraIdAppShell";
import { useAraIdLogout, useAraIdSession } from "../hooks/useAraId";

export function AraIdSettingsPage() {
  const navigate = useNavigate();
  const profile = useAraIdSession().data;
  const logout = useAraIdLogout();
  const [aboutOpen, setAboutOpen] = useState(false);

  async function signOut() {
    await logout.mutateAsync();
    void navigate("/araid/login", { replace: true });
  }

  return (
    <AraIdAppShell>
      <div className="min-h-full bg-araid-surface px-3.5 pb-7 pt-4 sm:px-6 sm:pt-6">
        <header className="mx-auto max-w-4xl text-center">
          <h1 className="text-base font-bold text-araid-brand-deep sm:text-lg">การตั้งค่า</h1>
        </header>

        <div className="mx-auto mt-7 w-full max-w-4xl sm:mt-10">
          <h2 className="text-sm font-medium text-araid-brand-deep">ปรับแต่งฟังก์ชันของแอปพลิเคชัน</h2>
          <p className="mt-0.5 text-xs text-slate-400">ตรวจสอบบัญชี ภาษา และข้อมูลแอปพลิเคชัน</p>

          <section className="mt-4 overflow-hidden rounded-xl bg-white shadow-araid-subtle">
            <div className="flex min-h-16 w-full items-center gap-3 px-3.5">
              <span className="grid size-9 place-items-center rounded-full bg-success-100 text-success">
                <Shield className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">สถานะบัญชี</span>
                <span className="mt-0.5 block truncate text-xs text-araid-text-faint">{profile ? "เข้าสู่ระบบแล้ว" : "ยังไม่ได้เข้าสู่ระบบ"}</span>
              </span>
            </div>
            <div className="flex min-h-16 w-full items-center gap-3 border-t border-araid-border px-3.5">
              <span className="grid size-9 place-items-center rounded-full bg-araid-surface-icon text-araid-brand">
                <Languages className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">ภาษา</span>
                <span className="mt-0.5 block text-xs text-araid-text-faint">ภาษาไทย</span>
              </span>
            </div>
            <button
              type="button"
              aria-expanded={aboutOpen}
              onClick={() => setAboutOpen((open) => !open)}
              className="flex min-h-16 w-full items-center gap-3 border-t border-araid-border px-3.5 text-left transition-colors hover:bg-araid-surface-hover"
            >
              <span className="grid size-9 place-items-center rounded-full bg-araid-surface-icon text-araid-brand">
                <Info className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">เกี่ยวกับ AraID</span>
                <span className="mt-0.5 block truncate text-xs text-araid-text-faint">ข้อมูลแอปพลิเคชัน AraID</span>
              </span>
              <ChevronRight className={`size-4 text-slate-300 transition-transform ${aboutOpen ? "rotate-90" : ""}`} />
            </button>
            {aboutOpen && (
              <p className="border-t border-araid-border bg-araid-surface-hover px-4 py-3 text-xs leading-5 text-slate-500">
                AraID ใช้สำหรับยืนยันตัวตนและแสดงข้อมูลเอกสารที่จัดการไว้ในระบบ
              </p>
            )}
          </section>

          {profile && (
            <p className="mt-3 px-1 text-center font-mono text-xs text-slate-400">{profile.identityNumberMasked}</p>
          )}

          {profile && (
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={logout.isPending}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-araid-brand shadow-araid-subtle transition-colors hover:bg-araid-surface-hover disabled:opacity-40"
            >
              <LogOut className="size-5" /> ออกจากระบบ
            </button>
          )}
        </div>
      </div>
    </AraIdAppShell>
  );
}
