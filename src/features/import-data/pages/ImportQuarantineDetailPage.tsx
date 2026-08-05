import { useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Badge, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { formatThaiDateTime } from "../../../lib/date-time";
import { QuarantineSourceGrid } from "../components/ImportQuarantineDialogs";
import { useImportQuarantineItem } from "../hooks/useSubmitImport";

export function ImportQuarantineDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const detailQuery = useImportQuarantineItem(id);

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-6">
          <SkeletonStack lines={5} />
        </Card>
      </PageShell>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageShell>
        <ErrorState
          onRetry={() => void detailQuery.refetch()}
          title="ไม่สามารถโหลดรายละเอียดรายการนำเข้าได้"
        />
      </PageShell>
    );
  }

  const item = detailQuery.data;
  const isResolved = item.status === "RESOLVED";

  return (
    <PageShell>
      <PageToolbar
        description={`student-import-quarantine-row-${item.id}`}
        icon={ClipboardList}
        navigation={
          <NavButton icon={ArrowLeft} to={-1} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title="รายละเอียดรายการนำเข้า"
      />

      <div className="space-y-5">
        <Card className="rounded-lg p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">ข้อมูลรายการ</h2>
              <p className="mt-1 text-sm text-slate-500">
                สาเหตุที่ติดตรวจสอบ: {item.reasonLabel}
              </p>
            </div>
            <Badge className="whitespace-nowrap" variant={item.statusBadgeVariant}>
              {item.statusLabel}
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm text-slate-500">แถวในไฟล์</div>
              <div className="font-bold tabular-nums">{item.sourceRowNumber}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">สถานะตรวจแก้</div>
              <div className="font-bold">{item.resolution.label}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">สร้างเมื่อ</div>
              <div className="font-bold tabular-nums">{formatThaiDateTime(item.createdAt)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">ดำเนินการเมื่อ</div>
              <div className="font-bold tabular-nums">
                {item.resolvedAt ? formatThaiDateTime(item.resolvedAt) : "-"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ข้อมูลจากไฟล์นำเข้า</h2>
          <QuarantineSourceGrid item={item} />
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ผลการดำเนินการ</h2>
          <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt className="font-semibold text-slate-500">สถานะ</dt>
            <dd>
              <Badge className="whitespace-nowrap" variant={item.statusBadgeVariant}>
                {item.statusLabel}
              </Badge>
            </dd>
            <dt className="font-semibold text-slate-500">ผู้ดำเนินการ</dt>
            <dd className="font-medium text-slate-800">{item.resolvedByName ?? "-"}</dd>
            {isResolved ? (
              <>
                <dt className="font-semibold text-slate-500">ข้อมูลที่แก้</dt>
                <dd className="font-medium text-slate-800">
                  {item.changedFieldDetails.length > 0 ? (
                    <div className="space-y-2">
                      {item.changedFieldDetails.map((detail) => (
                        <div
                          className="rounded-md border border-slate-100 bg-slate-50 p-3"
                          key={detail.label}
                        >
                          <div className="font-bold text-slate-900">{detail.label}</div>
                          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                              <div className="text-xs font-semibold text-slate-500">
                                ข้อมูลเดิม
                              </div>
                              <div className="mt-1 break-words text-slate-800">
                                {detail.oldValue}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-500">
                                ข้อมูลที่แก้แล้ว
                              </div>
                              <div className="mt-1 break-words text-slate-800">
                                {detail.newValue}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : item.changedFieldLabels.length > 0 ? (
                    item.changedFieldLabels.join(", ")
                  ) : (
                    "นำเข้าโดยไม่แก้ข้อมูล (ผ่านการตรวจซ้ำหลังข้อมูลหลักครบ)"
                  )}
                </dd>
              </>
            ) : (
              <>
                <dt className="font-semibold text-slate-500">เหตุผลที่ปฏิเสธ</dt>
                <dd className="font-medium text-slate-800">
                  {item.resolutionNote?.trim() || "-"}
                </dd>
              </>
            )}
          </dl>
        </Card>
      </div>
    </PageShell>
  );
}
