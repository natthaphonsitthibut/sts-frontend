import { useMemo, useState } from "react";
import { CirclePlus, FolderOpen } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { formatThaiDate } from "../../../lib/date-time";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { useStudentCases } from "../../students/hooks/useStudentCases";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { OpenCaseDialog } from "./OpenCaseDialog";

interface StudentCaseActionProps {
  activeCaseCount: number;
  activeCaseId: number | null;
  initialReason?: string;
  mode?: "icon" | "button";
  studentId: string;
  studentName: string;
}

export function StudentCaseAction({
  activeCaseCount,
  activeCaseId,
  initialReason,
  mode = "icon",
  studentId,
  studentName,
}: StudentCaseActionProps) {
  const contextualNavigate = useContextualNavigate();
  const [openCaseDialogOpen, setOpenCaseDialogOpen] = useState(false);
  const [caseListDialogOpen, setCaseListDialogOpen] = useState(false);
  const {
    cases,
    isError: casesError,
    isLoading: casesLoading,
    refetch: refetchCases,
  } = useStudentCases(studentId, caseListDialogOpen);
  const activeCases = useMemo(
    () =>
      cases.filter((studentCase) =>
        ["OPEN", "IN_PROGRESS", "PENDING_REVIEW"].includes(studentCase.status),
      ),
    [cases],
  );
  const hasActiveCase = activeCaseCount > 0 && activeCaseId !== null;

  if (hasActiveCase) {
    const multipleCases = activeCaseCount > 1;
    const label = multipleCases
      ? `ดูเคสที่กำลังติดตาม ${activeCaseCount} เคส`
      : "ดูเคสที่กำลังติดตาม";
    return (
      <>
        <Button
          aria-label={label}
          className={mode === "icon" ? "size-9 shrink-0 px-0" : undefined}
          icon={FolderOpen}
          iconClassName={mode === "icon" ? "text-primary" : undefined}
          onClick={() => setCaseListDialogOpen(true)}
          size={mode === "icon" ? "sm" : "md"}
          title={label}
          variant="outline"
        >
          {mode === "button" ? (multipleCases ? "ดูรายการเคส" : "ดูเคส") : null}
        </Button>
        <Dialog open={caseListDialogOpen} onOpenChange={setCaseListDialogOpen}>
          <DialogContent
            className="w-[min(92vw,620px)] text-left"
            onClose={() => setCaseListDialogOpen(false)}
          >
            <DialogHeader>
              <DialogTitle>เคสที่กำลังติดตาม</DialogTitle>
              <DialogDescription>
                {studentName} · เลือกเคสเพื่อดูรายละเอียดและดำเนินการต่อ
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {casesLoading ? (
                <div className="space-y-3" aria-label="กำลังโหลดรายการเคส">
                  {[0, 1].map((item) => (
                    <div
                      className="h-20 animate-pulse rounded-lg bg-slate-100"
                      key={item}
                    />
                  ))}
                </div>
              ) : casesError ? (
                <Alert variant="destructive">
                  <AlertTitle>โหลดรายการเคสไม่สำเร็จ</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                    <span>กรุณาลองใหม่อีกครั้ง</span>
                    <Button onClick={refetchCases} size="sm" variant="outline">
                      ลองใหม่
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : activeCases.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  ไม่พบเคสที่กำลังติดตาม
                </p>
              ) : (
                <ul className="space-y-3">
                  {activeCases.map((studentCase) => (
                    <li
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      key={studentCase.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            เคส #{studentCase.id}
                          </span>
                          <CaseStatusBadge status={studentCase.status} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {studentCase.reason_flagged || "ไม่ระบุเหตุผล"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          เปิดเมื่อ {formatThaiDate(studentCase.created_at)}
                        </p>
                      </div>
                      <Button
                        className="shrink-0"
                        onClick={() => {
                          setCaseListDialogOpen(false);
                          contextualNavigate(`/cases/${studentCase.id}`);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        ดูรายละเอียด
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </DialogBody>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        aria-label="เปิดเคสติดตามนักเรียน"
        className={mode === "icon" ? "size-9 shrink-0 px-0" : undefined}
        icon={CirclePlus}
        iconClassName={mode === "icon" ? "text-success-700" : undefined}
        onClick={() => setOpenCaseDialogOpen(true)}
        size={mode === "icon" ? "sm" : "md"}
        title="เปิดเคสติดตามนักเรียน"
        variant={mode === "icon" ? "outline" : "default"}
      >
        {mode === "button" ? "เปิดเคส" : null}
      </Button>
      <OpenCaseDialog
        initialReason={initialReason}
        onOpenChange={setOpenCaseDialogOpen}
        onOpened={(caseRecord) => contextualNavigate(`/cases/${caseRecord.id}`)}
        open={openCaseDialogOpen}
        studentId={studentId}
        studentName={studentName}
      />
    </>
  );
}
