import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button, IconButton } from "../../../components/base";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import { useReferralAccessCode } from "../hooks/useReferralLink";

export function ReferralAccessCodeButton({
  caseId,
  referralId,
  compact = false,
}: {
  caseId: number;
  referralId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const credential = useReferralAccessCode();
  return (
    <>
      {compact ? (
        <IconButton
          aria-label="ดูรหัส"
          title="ดูรหัส"
          icon={KeyRound}
          disabled={credential.isPending}
          variant="credential"
          onClick={() => {
            setOpen(true);
            credential.mutate({ caseId, referralId });
          }}
        />
      ) : (
        <Button
          icon={KeyRound}
          disabled={credential.isPending}
          onClick={() => {
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
        description="แจ้งรหัสนี้กับหน่วยงานแยกจากลิงก์ เช่น ทางโทรศัพท์ ผู้รายงานต้องยืนยัน AraID ก่อนรายงานผล รหัสคงเดิมตลอดอายุลิงก์"
        value={credential.data ?? ""}
        onClose={() => {
          setOpen(false);
          credential.reset();
        }}
      />
    </>
  );
}
