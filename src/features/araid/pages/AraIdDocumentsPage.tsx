import { ChevronLeft, ChevronRight, House, IdCard } from "lucide-react";
import { Link } from "react-router-dom";
import { AraIdAppShell } from "../components/AraIdAppShell";
import { useAraIdSession } from "../hooks/useAraId";

export function AraIdDocumentsPage() {
  const profile = useAraIdSession().data;

  return (
    <AraIdAppShell>
      <div className="min-h-full bg-araid-surface px-3.5 py-4 sm:px-6 sm:py-6">
        <header className="relative mx-auto flex max-w-4xl items-center justify-center">
          <Link
            to="/araid/home"
            aria-label="ย้อนกลับ"
            className="absolute left-0 grid size-10 place-items-center rounded-full bg-white text-slate-900 shadow-araid-subtle"
          >
            <ChevronLeft className="size-6" strokeWidth={2.3} />
          </Link>
          <h1 className="text-base font-bold text-araid-brand-deep sm:text-lg">เอกสาร</h1>
        </header>

        <section className="mx-auto mt-7 max-w-4xl sm:mt-10">
          <h2 className="text-sm font-semibold text-araid-brand-deep">รวมเอกสารที่เกี่ยวข้อง</h2>
          <p className="mt-0.5 text-xs text-slate-400">แสดงรายการเอกสารทั้งหมด</p>

          <div className="mt-4 space-y-3">
            <article className="rounded-xl bg-white p-3.5 shadow-araid-subtle">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-araid-surface-icon text-araid-brand">
                  <IdCard className="size-5" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-slate-900">บัตรประจำตัวประชาชน</h3>
                  <p className="mt-0.5 font-mono text-xs text-araid-text-faint">{profile?.identityNumberMasked ?? "-"}</p>
                </div>
                <ChevronRight className="size-4 text-slate-300" />
              </div>
            </article>

            <article className="rounded-xl bg-white p-3.5 shadow-araid-subtle">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-success-100 text-success">
                  <House className="size-5" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-slate-900">ทะเบียนบ้าน</h3>
                  <p className="mt-0.5 truncate text-xs text-araid-text-faint">{profile?.addressLine || "ยังไม่มีข้อมูลที่อยู่"}</p>
                </div>
                <ChevronRight className="size-4 text-slate-300" />
              </div>
            </article>
          </div>
        </section>
      </div>
    </AraIdAppShell>
  );
}
