import { Alert, AlertDescription, Button } from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";

interface AraIdLoginButtonProps {
  error: unknown;
  isPending: boolean;
  onClick: () => void;
}

/**
 * Starts the AraID login. The challenge it asks for belongs to the page, which
 * swaps to the QR screen — the button never renders it.
 */
export function AraIdLoginButton({ error, isPending, onClick }: AraIdLoginButtonProps) {
  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(error, "สร้าง QR สำหรับ AraID ไม่สำเร็จ กรุณาลองใหม่")}
          </AlertDescription>
        </Alert>
      ) : null}
      <Button
        className="mx-auto flex h-12 max-w-sm text-base font-bold"
        fullWidth
        isLoading={isPending}
        loadingText="กำลังสร้าง QR"
        onClick={onClick}
        type="button"
      >
        เข้าสู่ระบบด้วย AraID
      </Button>
    </div>
  );
}
