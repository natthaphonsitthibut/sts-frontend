import { useState } from "react";
import { UserCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { FilterSelect, ListPageToolbar, PageShell } from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { formatThaiDateTime } from "../../../lib/date-time";
import { getApiErrorMessage } from "../../../lib/api-error";
import { useFieldFollowers, useReviewFieldFollower } from "../hooks/useFieldFollowers";
import {
  getAvailableFieldFollowerActions,
  getFieldFollowerAreaText,
  getFieldFollowerFullName,
  getFieldFollowerReviewActionLabel,
  getFieldFollowerStatusMeta,
} from "../lib/field-follower-presentation";
import {
  FIELD_FOLLOWER_STATUSES,
  type FieldFollower,
  type FieldFollowerReviewAction,
  type FieldFollowerStatus,
} from "../types/field-follower.types";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUS_FILTER_LABELS: Record<FieldFollowerStatus, string> = {
  APPLIED: "รอตรวจสอบ",
  VERIFIED: "ยืนยันตัวตนแล้ว",
  ACTIVE: "ใช้งานได้",
  SUSPENDED: "ระงับ/ปฏิเสธ",
};

interface FieldFollowerRowActionsProps {
  follower: FieldFollower;
  isPending: boolean;
  onReview: (id: string, action: FieldFollowerReviewAction) => void;
}

function FieldFollowerRowActions({ follower, isPending, onReview }: FieldFollowerRowActionsProps) {
  const actions = getAvailableFieldFollowerActions(follower.status);
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {actions.map((action) => (
        <Button
          className="whitespace-nowrap"
          disabled={isPending}
          key={action}
          onClick={() => onReview(follower.id, action)}
          size="sm"
          variant={action === "REJECT" || action === "SUSPEND" ? "destructive" : "outline"}
        >
          {getFieldFollowerReviewActionLabel(action)}
        </Button>
      ))}
    </div>
  );
}

export function FieldFollowersReviewPage() {
  const [status, setStatus] = useState<FieldFollowerStatus | "">("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  const query = useFieldFollowers({
    status: status || undefined,
    province: province.trim() || undefined,
    district: district.trim() || undefined,
    subDistrict: subDistrict.trim() || undefined,
    page,
    limit,
  });
  const reviewMutation = useReviewFieldFollower();
  const { confirm, dialog } = useConfirm();

  const followers = query.data?.data ?? [];

  async function handleReview(id: string, action: FieldFollowerReviewAction): Promise<void> {
    const accepted = await confirm({
      title: `${getFieldFollowerReviewActionLabel(action)}ผู้สมัคร`,
      description: "การดำเนินการนี้จะถูกบันทึกในประวัติการตรวจสอบ",
      confirmText: getFieldFollowerReviewActionLabel(action),
      variant: action === "REJECT" || action === "SUSPEND" ? "destructive" : "default",
    });
    if (accepted) {
      reviewMutation.mutate({ id, action });
    }
  }

  function resetToFirstPage(): void {
    setPage(1);
  }

  return (
    <PageShell>
      <ListPageToolbar
        count={{ value: query.data?.meta.totalCount ?? 0 }}
        filters={
          <>
            <FilterSelect
              ariaLabel="กรองตามสถานะ"
              onChange={(value) => {
                setStatus(value as FieldFollowerStatus | "");
                resetToFirstPage();
              }}
              value={status}
            >
              <option value="">ทุกสถานะ</option>
              {FIELD_FOLLOWER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_FILTER_LABELS[value]}
                </option>
              ))}
            </FilterSelect>
            <Input
              className="sm:w-[160px]"
              onChange={(event) => {
                setProvince(event.target.value);
                resetToFirstPage();
              }}
              placeholder="จังหวัด"
              value={province}
            />
            <Input
              className="sm:w-[160px]"
              onChange={(event) => {
                setDistrict(event.target.value);
                resetToFirstPage();
              }}
              placeholder="อำเภอ/เขต"
              value={district}
            />
            <Input
              className="sm:w-[160px]"
              onChange={(event) => {
                setSubDistrict(event.target.value);
                resetToFirstPage();
              }}
              placeholder="ตำบล/แขวง"
              value={subDistrict}
            />
          </>
        }
        icon={UserCheck}
        title="ตรวจสอบใบสมัคร อสม./ผู้ติดตาม"
      />

      {query.isError ? (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(query.error, "โหลดรายการผู้สมัครไม่สำเร็จ")}
          </AlertDescription>
        </Alert>
      ) : null}
      {reviewMutation.isError ? (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(reviewMutation.error, "ดำเนินการรายการไม่สำเร็จ")}
          </AlertDescription>
        </Alert>
      ) : null}

      {query.isLoading ? (
        <div className="py-10 text-center text-slate-500">กำลังโหลด...</div>
      ) : null}

      {!query.isLoading && followers.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-10 text-center text-slate-500 shadow-card">
          ไม่พบรายการผู้สมัคร
        </div>
      ) : null}

      {followers.length > 0 ? (
        <>
          <DataTable
            headings={["ผู้สมัคร", "เบอร์โทรศัพท์", "พื้นที่", "สถานะ", "วันที่สมัคร", "จัดการ"]}
            minWidthClassName="min-w-full"
            responsiveBreakpoint="lg"
          >
            {followers.map((follower) => {
              const statusMeta = getFieldFollowerStatusMeta(follower.status);
              return (
                <DataTableRow key={follower.id}>
                  <DataTableCell className="font-bold text-slate-900">
                    {getFieldFollowerFullName(follower)}
                  </DataTableCell>
                  <DataTableCell>{follower.phone}</DataTableCell>
                  <DataTableCell>{getFieldFollowerAreaText(follower)}</DataTableCell>
                  <DataTableCell>
                    <Badge className="whitespace-nowrap text-[11px]" variant={statusMeta.variant}>
                      {statusMeta.label}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>{formatThaiDateTime(follower.created_at)}</DataTableCell>
                  <DataTableCell className="text-right">
                    <FieldFollowerRowActions
                      follower={follower}
                      isPending={reviewMutation.isPending}
                      onReview={(id, action) => void handleReview(id, action)}
                    />
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTable>

          <TableCardList desktopBreakpoint="lg">
            {followers.map((follower) => {
              const statusMeta = getFieldFollowerStatusMeta(follower.status);
              return (
                <TableCard className="space-y-3" key={follower.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">
                        {getFieldFollowerFullName(follower)}
                      </div>
                      <div className="text-sm text-slate-500">{follower.phone}</div>
                    </div>
                    <Badge className="shrink-0 whitespace-nowrap text-[11px]" variant={statusMeta.variant}>
                      {statusMeta.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-700">{getFieldFollowerAreaText(follower)}</div>
                  <div className="text-sm text-slate-500">
                    สมัครเมื่อ {formatThaiDateTime(follower.created_at)}
                  </div>
                  <FieldFollowerRowActions
                    follower={follower}
                    isPending={reviewMutation.isPending}
                    onReview={(id, action) => void handleReview(id, action)}
                  />
                </TableCard>
              );
            })}
          </TableCardList>
        </>
      ) : null}

      {query.data ? (
        <Pagination
          onPageChange={setPage}
          onRowsPerPageChange={(nextRowsPerPage) =>
            setLimit(nextRowsPerPage as (typeof PAGE_SIZE_OPTIONS)[number])
          }
          page={page}
          rowsPerPage={limit}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          totalCount={query.data.meta.totalCount}
        />
      ) : null}
      {dialog}
    </PageShell>
  );
}
