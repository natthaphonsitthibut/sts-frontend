import { useState } from "react";
import { CirclePlus, FolderOpen } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { OpenCaseDialog } from "../../cases/components/OpenCaseDialog";
import type { StudentCase } from "../types/students.types";

export function StudentProfileCaseActions({
  cases,
  canOpenCase,
  disabled,
  studentId,
  studentName,
}: {
  cases: StudentCase[];
  canOpenCase: boolean;
  disabled: boolean;
  studentId: string;
  studentName: string;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [openCase, setOpenCase] = useState(false);
  const navigate = useContextualNavigate();
  const hasActiveCase = cases.some((record) => record.status !== "RESOLVED");

  return (
    <>
      <Button
        disabled={disabled || cases.length === 0}
        icon={FolderOpen}
        onClick={() => setViewOpen(true)}
        title={cases.length === 0 ? "ยังไม่มีเคสให้ดู" : "ดูเคสทั้งหมด"}
      >
        ดูเคส
      </Button>
      <Button
        disabled={disabled || !canOpenCase || hasActiveCase}
        icon={CirclePlus}
        onClick={() => setOpenCase(true)}
        title={
          !canOpenCase
            ? "ไม่มีสิทธิ์เปิดเคส"
            : hasActiveCase
              ? "มีเคสที่กำลังติดตามอยู่"
              : "เปิดเคสใหม่"
        }
      >
        เปิดเคสใหม่
      </Button>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent
          className="flex h-[min(80dvh,40rem)] max-w-3xl flex-col overflow-hidden text-left"
          onClose={() => setViewOpen(false)}
          aria-labelledby="student-case-list-title"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle id="student-case-list-title">
              เคสทั้งหมดของนักเรียน
            </DialogTitle>
            <DialogDescription>
              {studentName} · รวมเคสที่กำลังติดตามและเคสที่เสร็จสิ้น
            </DialogDescription>
          </DialogHeader>
          <DialogBody
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2"
            role="region"
            aria-label="รายการเคส"
            tabIndex={0}
          >
            <ul className="space-y-3">
              {cases.map((record) => (
                <li
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
                  key={record.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        เคส #{record.id}
                      </span>
                      <CaseStatusBadge status={record.status} />
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                      {record.reason_flagged || "ไม่ระบุเหตุผล"}
                    </p>
                  </div>
                  <DetailLinkButton to={`/cases/${record.id}`}>
                    ดูรายละเอียด
                  </DetailLinkButton>
                </li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter className="shrink-0">
            <Button onClick={() => setViewOpen(false)} variant="outline">
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OpenCaseDialog
        onOpenChange={setOpenCase}
        onOpened={(record) => navigate(`/cases/${record.id}`)}
        open={openCase}
        studentId={studentId}
        studentName={studentName}
      />
    </>
  );
}
