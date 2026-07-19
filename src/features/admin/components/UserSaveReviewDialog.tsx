import type { ReactNode } from "react";
import { maskNationalId } from "../../../lib/pii-presentation";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";

export interface UserSaveReview {
  isEdit: boolean;
  fullName: string;
  username: string;
  email: string | null;
  phone: string | null;
  affiliation: string | null;
  personId: string | null;
  roleLabel: string;
  status: string;
  scopeText: string;
  isNationwide: boolean;
  isCustomized: boolean;
  permissions: string[];
  addedPermissions: string[];
  removedPermissions: string[];
}

interface UserSaveReviewDialogProps {
  open: boolean;
  data: UserSaveReview | null;
  labelOf: (permissionId: string) => string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-28 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 break-words text-slate-800">{value || "-"}</span>
    </div>
  );
}

export function UserSaveReviewDialog({
  open,
  data,
  labelOf,
  isSubmitting = false,
  onConfirm,
  onClose,
}: UserSaveReviewDialogProps) {
  const accountStatuses = useStatusCatalog("USER_ACCOUNT_STATUS").items;
  if (!open || !data) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-lg" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{data.isEdit ? "ตรวจสอบก่อนบันทึกการแก้ไข" : "ตรวจสอบก่อนสร้างบัญชี"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] space-y-5 overflow-y-auto">
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">ข้อมูลผู้ใช้</h3>
            <InfoRow label="ชื่อ-นามสกุล" value={data.fullName} />
            <InfoRow label="ชื่อผู้ใช้" value={data.username} />
            <InfoRow label="อีเมล" value={data.email} />
            <InfoRow label="เบอร์โทร" value={data.phone} />
            <InfoRow label="สังกัด" value={data.affiliation} />
            <InfoRow label="เลขบัตร ปชช." value={maskNationalId(data.personId)} />
            <InfoRow
              label="สถานะบัญชี"
              value={
                <Badge
                  variant={
                    findStatusCatalogItem(accountStatuses, data.status)?.badgeVariant ??
                    "secondary"
                  }
                >
                  {findStatusCatalogItem(accountStatuses, data.status)?.label ?? data.status}
                </Badge>
              }
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">ตำแหน่งและขอบเขต</h3>
            <InfoRow label="ตำแหน่ง" value={data.roleLabel} />
            <InfoRow
              label="ขอบเขตข้อมูล"
              value={
                data.isNationwide ? (
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge variant="warning">ทั้งประเทศ (ทุกจังหวัด)</Badge>
                    <span className="text-xs font-medium text-warning-700">
                      เข้าถึงข้อมูลได้ทุกจังหวัด — โปรดตรวจสอบให้แน่ใจ
                    </span>
                  </span>
                ) : (
                  <span className="font-medium text-slate-800">{data.scopeText}</span>
                )
              }
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">สิทธิ์การใช้งาน</h3>
            {data.isCustomized ? (
              <>
                {data.addedPermissions.length > 0 ? (
                  <div className="space-y-1 rounded-lg border border-success-200 bg-success-100/40 p-3">
                    <div className="text-xs font-semibold text-success-700">
                      <span aria-hidden="true">+ </span>เพิ่มจากมาตรฐาน ({data.addedPermissions.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.addedPermissions.map((permission) => (
                        <Badge key={permission} variant="success">
                          {labelOf(permission)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {data.removedPermissions.length > 0 ? (
                  <div className="space-y-1 rounded-lg border border-danger-200 bg-danger-100/40 p-3">
                    <div className="text-xs font-semibold text-danger-700">
                      <span aria-hidden="true">− </span>เอาออกจากมาตรฐาน ({data.removedPermissions.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.removedPermissions.map((permission) => (
                        <Badge key={permission} variant="destructive">
                          {labelOf(permission)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">ตามมาตรฐานของตำแหน่ง</p>
            )}
            <div className="space-y-1 pt-1">
              <div className="text-xs font-semibold text-slate-500">
                สิทธิ์ทั้งหมด ({data.permissions.length})
              </div>
              {data.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.permissions.map((permission) => (
                    <Badge key={permission} variant={data.addedPermissions.includes(permission) ? "success" : "secondary"}>
                      {labelOf(permission)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Alert variant="destructive" className="py-2 text-sm font-semibold">
                  ยังไม่ได้เลือกสิทธิ์ใด ๆ
                </Alert>
              )}
            </div>
          </section>
        </DialogBody>
        <DialogFooter>
          <Button disabled={isSubmitting} onClick={onClose} variant="outline">
            ยกเลิก
          </Button>
          <Button isLoading={isSubmitting} loadingText="กำลังบันทึก" onClick={onConfirm}>
            ยืนยันบันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
