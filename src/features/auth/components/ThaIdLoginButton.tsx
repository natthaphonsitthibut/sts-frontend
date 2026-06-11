import { useState } from "react";
import { Alert, AlertDescription, Button } from "../../../components/base";
import { appConfig } from "../../../config/env";
import { ThaIdMockLoginDialog } from "./ThaIdMockLoginDialog";

export function ThaIdLoginButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modeWarningVisible, setModeWarningVisible] = useState(false);
  const isMockThaIdMode = appConfig.thaidMode === "mock";

  function handleClick(): void {
    if (!isMockThaIdMode) {
      setModeWarningVisible(true);
      return;
    }

    setModeWarningVisible(false);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-3">
      {modeWarningVisible ? (
        <Alert variant="warning">
          <AlertDescription>
            ThaID mock mode ยังไม่ได้เปิดใช้งานใน environment นี้
          </AlertDescription>
        </Alert>
      ) : null}

      <Button
        className="h-12 text-base font-bold"
        fullWidth
        onClick={handleClick}
        type="button"
      >
        เข้าสู่ระบบด้วย ThaID
      </Button>

      <ThaIdMockLoginDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
