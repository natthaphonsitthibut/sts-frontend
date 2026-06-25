import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Combobox,
  FormErrorAlert,
  Label,
  Textarea,
} from "../../../components/base";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { casesService } from "../api/cases.service";
import { useUpdateCase } from "../hooks/useUpdateCase";
import {
  CASE_REVIEW_ACTIONS,
  CASE_RESOLUTION_OUTCOMES,
  getCaseReviewActionPermission,
} from "../lib/case-presentation";
import type {
  CaseRecord,
  CaseResolutionOutcome,
  CaseReviewAction,
} from "../types/cases.types";

interface CaseStatusUpdateDialogProps {
  caseRecord: CaseRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function CaseStatusUpdateDialog({
  caseRecord,
  open,
  onOpenChange,
  onUpdated,
}: CaseStatusUpdateDialogProps) {
  const { can } = usePermissions();
  const updateCase = useUpdateCase();
  const [action, setAction] = useState<CaseReviewAction>("ASSIST");
  const [note, setNote] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [resolutionOutcome, setResolutionOutcome] = useState("");

  const allowedActions = useMemo(
    () =>
      CASE_REVIEW_ACTIONS.filter(
        (option) =>
          can("review-cases") && can(getCaseReviewActionPermission(option.value)),
      ),
    [can],
  );

  const selectedAction = allowedActions.some((option) => option.value === action)
    ? action
    : (allowedActions[0]?.value ?? "ASSIST");
  const agencyQuery = useQuery({
    queryKey: ["case-referral-agencies", caseRecord?.id],
    queryFn: () => casesService.getReferralAgencies(caseRecord?.id ?? 0),
    enabled: open && selectedAction === "FORWARD" && Boolean(caseRecord?.id),
  });
  const selectedAgencyId = agencyQuery.data?.some(
    (agency) => String(agency.id) === agencyId,
  )
    ? agencyId
    : "";
  const requiresAgency = selectedAction === "FORWARD";
  const requiresResolutionOutcome = selectedAction === "CLOSE";
  const selectedResolutionOutcome = CASE_RESOLUTION_OUTCOMES.some(
    (option) => option.value === resolutionOutcome,
  )
    ? (resolutionOutcome as CaseResolutionOutcome)
    : "";
  const submitDisabled =
    !caseRecord ||
    allowedActions.length === 0 ||
    (requiresAgency && !selectedAgencyId) ||
    (requiresResolutionOutcome && !selectedResolutionOutcome);

  function handleSubmit(): void {
    if (submitDisabled) {
      return;
    }
    updateCase.mutate(
      {
        caseId: caseRecord.id,
        payload: {
          review_action: selectedAction,
          review_note: note.trim() || null,
          agency_id: requiresAgency ? Number(selectedAgencyId) : null,
          referral_note: requiresAgency ? note.trim() || null : null,
          resolution_outcome: requiresResolutionOutcome
            ? selectedResolutionOutcome || null
            : null,
        },
      },
      {
        onSuccess: () => {
          onUpdated?.();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(92vw,460px)]"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>อัปเดตสถานะเคส</DialogTitle>
          <DialogDescription>
            {caseRecord
              ? `${caseRecord.student_name} · ${caseRecord.student_school || "-"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <FormErrorAlert
              error={updateCase.error}
              fallback="ไม่สามารถอัปเดตเคสได้ กรุณาลองอีกครั้ง"
            />

            <div className="space-y-2">
              <Label htmlFor="case-action">การดำเนินการ</Label>
              <Combobox
                id="case-action"
                onChange={(next) => setAction(next as CaseReviewAction)}
                options={allowedActions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                searchable={false}
                value={selectedAction}
              />
            </div>
            {allowedActions.length === 0 ? (
              <p className="text-sm font-medium text-danger-700">
                บัญชีนี้ไม่มีสิทธิ์เปลี่ยนสถานะเคส
              </p>
            ) : null}

            {requiresAgency ? (
              <div className="space-y-2">
                <Label htmlFor="case-referral-agency">หน่วยงานปลายทาง</Label>
                <Combobox
                  disabled={agencyQuery.isLoading}
                  id="case-referral-agency"
                  onChange={setAgencyId}
                  options={[
                    { value: "", label: "เลือกหน่วยงาน" },
                    ...(agencyQuery.data ?? []).map((agency) => ({
                      value: String(agency.id),
                      label: `${agency.name} · ${agency.agency_type}`,
                    })),
                  ]}
                  placeholder="ค้นหาหน่วยงาน"
                  value={selectedAgencyId}
                />
                {agencyQuery.isLoading ? (
                  <p className="text-sm text-slate-500">กำลังโหลดหน่วยงาน...</p>
                ) : null}
                {!agencyQuery.isLoading && (agencyQuery.data ?? []).length === 0 ? (
                  <p className="text-sm font-medium text-warning-700">
                    ไม่พบหน่วยงานที่ตรงกับพื้นที่ของเคสนี้
                  </p>
                ) : null}
              </div>
            ) : null}

            {requiresResolutionOutcome ? (
              <div className="space-y-2">
                <Label htmlFor="case-resolution-outcome">ผลลัพธ์การติดตาม</Label>
                <Combobox
                  id="case-resolution-outcome"
                  onChange={setResolutionOutcome}
                  options={[
                    { value: "", label: "เลือกผลลัพธ์" },
                    ...CASE_RESOLUTION_OUTCOMES,
                  ]}
                  searchable={false}
                  value={selectedResolutionOutcome}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="case-note">บันทึกเพิ่มเติม</Label>
              <Textarea
                id="case-note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="ระบุรายละเอียดการช่วยเหลือ / เหตุผล (ถ้ามี)"
                value={note}
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button
            disabled={submitDisabled}
            isLoading={updateCase.isPending}
            loadingText="กำลังบันทึก"
            onClick={handleSubmit}
            type="button"
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
