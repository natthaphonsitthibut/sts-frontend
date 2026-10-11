import { useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button, IconButton } from "../../../components/base";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import {
  useReferralAccessCode,
  useRefreshReferralAccessCode,
} from "../hooks/useReferralLink";

export function ReferralAccessCodeButton({
  caseId,
  referralId,
  compact = false,
  disabled = false,
  canRefresh = true,
}: {
  caseId: number;
  referralId: string;
  compact?: boolean;
  disabled?: boolean;
  canRefresh?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const credential = useReferralAccessCode();
  const refresh = useRefreshReferralAccessCode();
  return (
    <>
      {compact ? (
        <IconButton
          aria-label="ดูรหัส"
          title="ดูรหัส"
          icon={KeyRound}
          disabled={disabled || credential.isPending || refresh.isPending}
          variant="credential"
          onClick={() => {
            refresh.reset();
            setOpen(true);
            credential.mutate({ caseId, referralId });
          }}
        />
      ) : (
        <Button
          icon={KeyRound}
          disabled={disabled || credential.isPending || refresh.isPending}
          onClick={() => {
            refresh.reset();
            setOpen(true);
            credential.mutate({ caseId, referralId });
          }}
          type="button"
          variant="outline"
          size="sm"
        >
          ดูรหัส
        </Button>
      )}
      <CredentialDialog
        open={open && credential.isSuccess}
        title="รหัสสำหรับหน่วยงาน"
        description="แจ้งรหัสกับหน่วยงานแยกจากลิงก์ ผู้รายงานต้องยืนยัน AraID ก่อนรายงานผล เมื่อเปลี่ยนรหัส รหัสเดิมและการยืนยันเดิมจะใช้ไม่ได้"
        value={refresh.data ?? credential.data ?? ""}
        actions={
          <Button
            icon={RefreshCw}
            onClick={() => refresh.mutate({ caseId, referralId })}
            disabled={disabled || !canRefresh || refresh.isPending}
            isLoading={refresh.isPending}
            loadingText="กำลังเปลี่ยนรหัส"
            type="button"
            variant="outline"
            size="lg"
          >
            เปลี่ยนรหัส
          </Button>
        }
        onClose={() => {
          setOpen(false);
          credential.reset();
          refresh.reset();
        }}
      />
    </>
  );
}
