import { useState } from "react";
import { CirclePlus, FolderOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, buttonVariants } from "../../../components/base";
import { cn } from "../../../lib/utils";
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
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasActiveCase = activeCaseCount > 0 && activeCaseId !== null;

  if (hasActiveCase) {
    const multipleCases = activeCaseCount > 1;
    const to = multipleCases
      ? `/students/${studentId}#case-history`
      : `/cases/${activeCaseId}`;
    const label = multipleCases
      ? `ดูเคสที่กำลังติดตาม ${activeCaseCount} เคส`
      : "ดูเคสที่กำลังติดตาม";
    return (
      <Link
        aria-label={label}
        className={cn(
          buttonVariants({ variant: "outline", size: mode === "icon" ? "sm" : "md" }),
          mode === "icon" && "size-9 shrink-0 px-0",
        )}
        title={label}
        to={to}
      >
        <FolderOpen
          className={cn("size-4", mode === "icon" && "text-primary")}
          aria-hidden="true"
        />
        {mode === "button" ? (multipleCases ? "ดูรายการเคส" : "ดูเคส") : null}
      </Link>
    );
  }

  return (
    <>
      <Button
        aria-label="เปิดเคสช่วยเหลือ"
        className={mode === "icon" ? "size-9 shrink-0 px-0" : undefined}
        icon={CirclePlus}
        iconClassName={mode === "icon" ? "text-success-700" : undefined}
        onClick={() => setDialogOpen(true)}
        size={mode === "icon" ? "sm" : "md"}
        title="เปิดเคสช่วยเหลือ"
        variant={mode === "icon" ? "outline" : "default"}
      >
        {mode === "button" ? "เปิดเคส" : null}
      </Button>
      <OpenCaseDialog
        initialReason={initialReason}
        onOpenChange={setDialogOpen}
        onOpened={(caseRecord) => void navigate(`/cases/${caseRecord.id}`)}
        open={dialogOpen}
        studentId={studentId}
        studentName={studentName}
      />
    </>
  );
}
