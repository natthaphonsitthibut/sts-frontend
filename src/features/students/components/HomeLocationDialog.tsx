import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { LocationMapPicker } from "../../../components/maps/LocationMapPicker";

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

function toDisplay(value: unknown): string {
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
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
  const address = location.address?.trim() || "";
  const lat = location.lat ?? null;
  const lng = location.lng ?? null;
  const hasMapCoordinates = lat !== null && lng !== null;
  const addressDetails = (
    <dl className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["จังหวัด", location.province],
        ["อำเภอ/เขต", location.district],
        ["ตำบล/แขวง", location.subDistrict],
        ["รหัสไปรษณีย์", location.postalCode],
      ].map(([label, value]) => (
        <div key={String(label)}>
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {toDisplay(value)}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[90vh] max-w-5xl overflow-y-auto"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle icon={MapPin}>ที่อยู่และแผนที่</DialogTitle>
        </DialogHeader>
        <LocationMapPicker
          address={address || undefined}
          className="border-0 p-0"
          details={addressDetails}
          emptyDescription="ยังไม่มีพิกัดบ้านจากข้อมูลนักเรียน ระบบจะแสดงหมุดเมื่อมีการบันทึกตำแหน่ง"
          emptyTitle={hasMapCoordinates ? "มีพิกัด" : "ยังไม่มีพิกัด"}
          lat={lat}
          lng={lng}
          mapClassName="min-h-[50vh] sm:min-h-[60vh]"
          markerLabel={
            location.isApproximate
              ? "พิกัดโดยประมาณ (ยังไม่ยืนยัน)"
              : "พิกัดที่ยืนยันแล้ว"
          }
          title={address || name}
        />
      </DialogContent>
    </Dialog>
  );
}
