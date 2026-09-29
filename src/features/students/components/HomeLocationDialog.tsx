import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { AddressLocationView } from "../../../components/maps/AddressLocationView";

export interface HomeLocation {
  address: string | null | undefined;
  province: string | null | undefined;
  district: string | null | undefined;
  subDistrict: string | null | undefined;
  postalCode: string | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
  isApproximate: boolean | undefined;
}

interface HomeLocationDialogProps {
  location: HomeLocation;
  /** Shown as the heading when the address is empty. */
  name: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * A student's home address and pin — one dialog for the student profile and the
 * case page, so both show the same address, the same pin and the same
 * "approximate" label.
 */
export function HomeLocationDialog({
  location,
  name,
  onOpenChange,
  open,
}: HomeLocationDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[90vh] max-w-5xl overflow-y-auto"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle icon={MapPin}>ที่อยู่และแผนที่</DialogTitle>
        </DialogHeader>
        <AddressLocationView
          address={location.address}
          emptyDescription="ยังไม่มีพิกัดบ้านจากข้อมูลนักเรียน ระบบจะแสดงหมุดเมื่อมีการบันทึกตำแหน่ง"
          fallbackTitle={name}
          lat={location.lat ?? null}
          lng={location.lng ?? null}
          markerLabel={
            // Unknown is not the same as confirmed: a follow-up form carries the
            // pin without saying how it was captured, so it gets a plain label.
            location.isApproximate === undefined
              ? "บ้านนักเรียน"
              : location.isApproximate
                ? "พิกัดโดยประมาณ (ยังไม่ยืนยัน)"
                : "พิกัดที่ยืนยันแล้ว"
          }
          parts={[
            ["จังหวัด", location.province],
            ["อำเภอ/เขต", location.district],
            ["ตำบล/แขวง", location.subDistrict],
            ["รหัสไปรษณีย์", location.postalCode],
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}
