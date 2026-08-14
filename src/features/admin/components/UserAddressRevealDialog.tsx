import { useState } from "react";
import { MapPin } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Combobox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormLabel,
  Input,
} from "../../../components/base";
import { LocationMapPicker } from "../../../components/maps/LocationMapPicker";
import { joinAddressParts } from "../../../components/address/address-format";
import { getApiErrorMessage } from "../../../lib/api-error";
import { PII_REASON_OPTIONS, isPiiReasonCode } from "../../students/pii.constants";
import { adminService } from "../api/admin.service";
import type { UserAddressDetail } from "../types/admin.types";

interface UserAddressRevealDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  userId: number;
}

export function UserAddressRevealDialog({
  onOpenChange,
  open,
  userId,
}: UserAddressRevealDialogProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState<UserAddressDetail | null>(null);

  function close(): void {
    setReasonCode("");
    setReasonNote("");
    setError("");
    setSubmitting(false);
    setAddress(null);
    onOpenChange(false);
  }

  async function reveal(): Promise<void> {
    if (!isPiiReasonCode(reasonCode)) {
      setError("กรุณาเลือกเหตุผลในการแสดงข้อมูล");
      return;
    }
    if (reasonCode === "OTHER" && !reasonNote.trim()) {
      setError("กรุณาระบุเหตุผลเพิ่มเติม");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await adminService.revealUserAddress(userId, {
        reason_code: reasonCode,
        reason_note: reasonNote.trim() || undefined,
      });
      setAddress(result);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "ไม่สามารถแสดงที่อยู่ได้"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        className={address ? "max-h-[90vh] max-w-5xl overflow-y-auto" : "w-[min(92vw,440px)]"}
        onClose={close}
      >
        <DialogHeader>
          <DialogTitle icon={MapPin}>ที่อยู่และแผนที่</DialogTitle>
          {!address ? (
            <DialogDescription>
              ระบบจะบันทึกเหตุผลและผู้เปิดดูในประวัติการเข้าถึง
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {address ? (
          <UserAddressMap address={address} onClose={close} />
        ) : (
          <DialogBody className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <FormLabel htmlFor="user-address-reason" required>
                เหตุผลในการแสดงข้อมูล
              </FormLabel>
              <Combobox
                id="user-address-reason"
                onChange={(value) => setReasonCode(value)}
                options={PII_REASON_OPTIONS}
                placeholder="เลือกเหตุผล"
                searchable={false}
                value={reasonCode}
              />
            </div>
            <div className="space-y-2">
              <FormLabel htmlFor="user-address-note" required={reasonCode === "OTHER"}>
                รายละเอียดเพิ่มเติม
              </FormLabel>
              <Input
                id="user-address-note"
                maxLength={500}
                onChange={(event) => setReasonNote(event.target.value)}
                placeholder={reasonCode === "OTHER" ? "ระบุเหตุผลเพิ่มเติม" : "ระบุได้ถ้ามี"}
                value={reasonNote}
              />
            </div>
            <DialogFooter>
              <Button disabled={submitting} onClick={close} variant="outline">
                ยกเลิก
              </Button>
              <Button
                isLoading={submitting}
                loadingText="กำลังแสดง"
                onClick={() => void reveal()}
              >
                แสดง
              </Button>
            </DialogFooter>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}

function display(value: string | null): string {
  return value?.trim() || "-";
}

function UserAddressMap({
  address,
  onClose,
}: {
  address: UserAddressDetail;
  onClose: () => void;
}) {
  const fullAddress = joinAddressParts([
    address.address_line,
    address.address_village_no,
    address.address_trok,
    address.address_soi,
    address.address_street,
    address.address_sub_district,
    address.address_district,
    address.address_province,
    address.address_postal_code,
  ]);
  const details = (
    <dl className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {[
        ["บ้านเลขที่", address.address_line],
        ["หมู่", address.address_village_no],
        ["ถนน", address.address_street],
        ["ซอย", address.address_soi],
        ["ตรอก", address.address_trok],
        ["ตำบล/แขวง", address.address_sub_district],
        ["อำเภอ/เขต", address.address_district],
        ["จังหวัด", address.address_province],
        ["รหัสไปรษณีย์", address.address_postal_code],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="mt-1 font-semibold text-slate-800">{display(value)}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <DialogBody className="space-y-4">
      <LocationMapPicker
        address={fullAddress || undefined}
        className="border-0 p-0"
        details={details}
        emptyDescription="ยังไม่มีพิกัดที่บันทึกไว้ สามารถเพิ่มได้จากหน้าแก้ไขผู้ใช้งาน"
        lat={address.address_latitude}
        lng={address.address_longitude}
        mapClassName="min-h-[50vh] sm:min-h-[60vh]"
        markerLabel="พิกัดที่อยู่ผู้ใช้งาน"
        title={fullAddress || "ที่อยู่ผู้ใช้งาน"}
      />
      <DialogFooter>
        <Button onClick={onClose}>ปิด</Button>
      </DialogFooter>
    </DialogBody>
  );
}
