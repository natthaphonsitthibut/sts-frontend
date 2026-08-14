import {
  ArrowLeft,
  CircleCheckBig,
  Database,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { appToast, Button, Input, Select, Skeleton, useConfirm } from "../../../components/base";
import { Pagination } from "../../../components/layout/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { getApiErrorMessage } from "../../../lib/api-error";
import { AraIdRecordDialog } from "../components/AraIdRecordDialog";
import {
  useAraIdRecordDetail,
  useAraIdRecords,
  useUpdateAraIdRecordStatus,
} from "../hooks/useAraId";
import type { AraIdRecord, AraIdRecordSummary } from "../types/araid.types";

function fullName(record: Pick<AraIdRecordSummary, "titleTh" | "givenNameTh" | "familyNameTh">): string {
  return `${record.titleTh ?? ""}${record.givenNameTh} ${record.familyNameTh}`;
}

export function AraIdManagePage() {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [recordStatus, setRecordStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AraIdRecord | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const recordsQuery = useAraIdRecords({
    page,
    limit: rowsPerPage,
    search: debouncedSearch || undefined,
    recordStatus: recordStatus || undefined,
  });
  const recordDetail = useAraIdRecordDetail();
  const updateStatus = useUpdateAraIdRecordStatus();
  const records = recordsQuery.data?.data ?? [];
  const counts = recordsQuery.data?.counts ?? { total: 0, active: 0 };
  const totalCount = recordsQuery.data?.meta.totalCount ?? 0;

  function openCreate(): void {
    setSelectedRecord(null);
    setDialogOpen(true);
  }

  async function openEdit(record: AraIdRecordSummary): Promise<void> {
    try {
      const detail = await recordDetail.mutateAsync(record.id);
      setSelectedRecord(detail);
      setDialogOpen(true);
    } catch (error) {
      appToast.error(getApiErrorMessage(error, "โหลดรายละเอียดไม่สำเร็จ"));
    }
  }

  async function toggleStatus(record: AraIdRecordSummary): Promise<void> {
    const nextStatus = record.recordStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const accepted = await confirm({
      title: nextStatus === "ACTIVE" ? "เปิดใช้งานข้อมูล AraID?" : "ปิดใช้งานข้อมูล AraID?",
      description: nextStatus === "ACTIVE"
        ? `${fullName(record)} จะกลับมาเข้าสู่ระบบด้วย AraID ได้`
        : `${fullName(record)} จะเข้าสู่ระบบและยืนยันตัวตนด้วย AraID ไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง`,
      confirmText: nextStatus === "ACTIVE" ? "เปิดใช้งาน" : "ปิดใช้งาน",
      variant: nextStatus === "ACTIVE" ? "default" : "destructive",
    });
    if (!accepted) return;

    try {
      await updateStatus.mutateAsync({ id: record.id, recordStatus: nextStatus });
      appToast.success(nextStatus === "ACTIVE" ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว");
    } catch (error) {
      appToast.error(getApiErrorMessage(error, "เปลี่ยนสถานะไม่สำเร็จ"));
    }
  }

  return (
    <main className="min-h-dvh bg-araid-surface font-araid text-slate-900">
      <header className="sticky top-0 z-30 border-b border-araid-border bg-white">
        <div className="relative flex min-h-16 items-center justify-center px-16">
          <Link
            to="/araid"
            aria-label="กลับหน้า AraID"
            className="absolute left-3 grid size-11 place-items-center rounded-full text-araid-brand transition-colors hover:bg-araid-surface-icon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-araid-brand sm:left-5"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-base font-bold text-araid-brand-deep sm:text-lg">จัดการข้อมูล AraID</h1>
            <p className="hidden text-xs text-slate-500 sm:block">สร้างและดูแลข้อมูลสำหรับเข้าใช้งาน</p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-araid-brand">ศูนย์จัดการข้อมูล</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">ข้อมูลผู้ใช้งาน AraID</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              เพิ่มข้อมูลที่จำเป็นสำหรับเข้าสู่ระบบก่อน แล้วค่อยเติมข้อมูลติดต่อหรือที่อยู่ภายหลังได้
            </p>
          </div>
          <Button
            className="h-11 bg-araid-brand px-5 hover:bg-araid-brand-deep"
            disabled={recordsQuery.isError}
            icon={Plus}
            onClick={openCreate}
            size="lg"
          >
            เพิ่มข้อมูล
          </Button>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-araid-border bg-white">
          <div className="flex flex-col gap-4 border-b border-araid-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-araid-surface-icon text-araid-brand">
                  <Database className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">ข้อมูลทั้งหมด</p>
                  <p className="text-base font-bold tabular-nums text-slate-900">{counts.total}</p>
                </div>
              </div>
              <div className="h-9 w-px bg-slate-200" />
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <CircleCheckBig className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">พร้อมใช้งาน</p>
                  <p className="text-base font-bold tabular-nums text-slate-900">{counts.active}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
              <div className="relative flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="ค้นหาข้อมูล AraID"
                  className="h-11 pl-9"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="ค้นหาชื่อ เลขประจำตัว หรือจังหวัด"
                  value={search}
                />
              </div>
              <Select
                aria-label="กรองสถานะข้อมูล AraID"
                className="h-11 sm:w-40"
                onChange={(event) => {
                  setRecordStatus(event.target.value as "" | "ACTIVE" | "INACTIVE");
                  setPage(1);
                }}
                value={recordStatus}
              >
                <option value="">ทุกสถานะ</option>
                <option value="ACTIVE">พร้อมใช้งาน</option>
                <option value="INACTIVE">ปิดใช้งาน</option>
              </Select>
            </div>
          </div>

          {recordsQuery.isError ? (
            <div className="p-6 sm:p-10">
              <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                <h3 className="text-sm font-bold text-amber-900">ต้องเข้าสู่ระบบผู้ดูแลก่อน</h3>
                <p className="mt-1 text-sm text-amber-800">หน้านี้ใช้สิทธิ์ผู้ดูแล STS เพื่อป้องกันข้อมูลส่วนบุคคล</p>
                <Link
                  to="/login?next=%2Faraid%2Fmanage"
                  className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-amber-900 px-4 text-sm font-semibold text-white"
                >
                  เข้าสู่ระบบผู้ดูแล
                </Link>
              </div>
            </div>
          ) : recordsQuery.isLoading ? (
            <div className="space-y-3 p-4 sm:p-5">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : records.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-araid-surface-icon text-araid-brand">
                <UserRound className="size-7" />
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                {search ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีข้อมูล AraID"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {search ? "ลองเปลี่ยนชื่อ เลขประจำตัว หรือจังหวัดที่ใช้ค้นหา" : "เริ่มต้นโดยเพิ่มข้อมูลผู้ใช้งานคนแรก"}
              </p>
              {!search && (
                <Button className="mt-5 bg-araid-brand hover:bg-araid-brand-deep" icon={Plus} onClick={openCreate}>
                  เพิ่มข้อมูล
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-araid-surface-hover text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-5 py-3">ชื่อ-นามสกุล</th>
                      <th className="px-5 py-3">เลขประจำตัว</th>
                      <th className="px-5 py-3">จังหวัด</th>
                      <th className="px-5 py-3">สถานะ</th>
                      <th className="px-5 py-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-araid-border">
                    {records.map((record) => (
                      <tr key={record.id} className="transition-colors hover:bg-araid-surface-hover">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{fullName(record)}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{record.givenNameEn || record.familyNameEn ? `${record.givenNameEn ?? ""} ${record.familyNameEn ?? ""}`.trim() : "—"}</p>
                        </td>
                        <td className="px-5 py-4 font-mono text-sm text-slate-700">{record.identityNumberMasked}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{record.provinceName || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${record.recordStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-araid-border text-slate-600"}`}>
                            {record.recordStatus === "ACTIVE" ? "พร้อมใช้งาน" : "ปิดใช้งาน"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              disabled={recordDetail.isPending}
                              icon={Pencil}
                              onClick={() => void openEdit(record)}
                              size="sm"
                              variant="outline"
                            >แก้ไข</Button>
                            <Button
                              aria-label={`${record.recordStatus === "ACTIVE" ? "ปิด" : "เปิด"}ใช้งาน ${fullName(record)}`}
                              className="h-9"
                              disabled={updateStatus.isPending}
                              icon={Power}
                              onClick={() => void toggleStatus(record)}
                              size="sm"
                              variant={record.recordStatus === "ACTIVE" ? "destructive" : "outline"}
                            >
                              {record.recordStatus === "ACTIVE" ? "ปิดใช้" : "เปิดใช้"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-araid-border md:hidden">
                {records.map((record) => (
                  <article key={record.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-araid-surface-icon text-araid-brand">
                        <UserRound className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-slate-900">{fullName(record)}</h3>
                        <p className="mt-1 font-mono text-xs text-slate-600">{record.identityNumberMasked}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="size-3.5" /> {record.provinceName || "ไม่ระบุจังหวัด"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.recordStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-araid-border text-slate-600"}`}>
                        {record.recordStatus === "ACTIVE" ? "พร้อมใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                      <Button
                        disabled={recordDetail.isPending}
                        icon={Pencil}
                        onClick={() => void openEdit(record)}
                        variant="outline"
                      >แก้ไขข้อมูล</Button>
                      <Button
                        aria-label={`${record.recordStatus === "ACTIVE" ? "ปิด" : "เปิด"}ใช้งาน ${fullName(record)}`}
                        disabled={updateStatus.isPending}
                        icon={Power}
                        onClick={() => void toggleStatus(record)}
                        variant={record.recordStatus === "ACTIVE" ? "destructive" : "outline"}
                      >
                        {record.recordStatus === "ACTIVE" ? "ปิดใช้" : "เปิดใช้"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="px-4 pb-5 sm:px-5">
                <Pagination
                  onPageChange={setPage}
                  onRowsPerPageChange={(nextRowsPerPage) => {
                    setRowsPerPage(nextRowsPerPage);
                    setPage(1);
                  }}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[10, 20, 50]}
                  totalCount={totalCount}
                  unitLabel="ข้อมูล"
                />
              </div>
            </>
          )}
        </section>
      </div>

      <AraIdRecordDialog onOpenChange={setDialogOpen} open={dialogOpen} record={selectedRecord} />
      {confirmDialog}
    </main>
  );
}
