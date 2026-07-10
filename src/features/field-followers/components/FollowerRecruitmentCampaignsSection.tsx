import { useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Clock, Link2, Lock } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Combobox,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { RefreshButton } from "../../../components/layout/refresh-button";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { formatThaiDate } from "../../../lib/date-time";
import { getApiErrorMessage } from "../../../lib/api-error";
import {
  useDeleteFollowerRecruitmentCampaign,
  useFollowerRecruitmentCampaigns,
  useUpdateFollowerRecruitmentCampaign,
} from "../hooks/useFollowerRecruitmentCampaigns";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useStatusCatalog, findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { FollowerRecruitmentCampaign } from "../types/follower-recruitment-campaign.types";

type CampaignStatusFilter = "ALL" | "ACTIVE" | "LOCKED" | "EXPIRED";

interface FollowerRecruitmentCampaignsSectionProps {
  actions?: ReactNode;
}

function buildPublicUrl(publicCode: string): string {
  return `${window.location.origin}/apply/field-follower/${publicCode}`;
}

/** Map status codes to icons for SummaryMetrics cards */
const STATUS_ICON_MAP: Record<string, typeof Link2> = {
  ACTIVE: CheckCircle2,
  LOCKED: Lock,
  EXPIRED: Clock,
};

function includesOrUnscoped(values: string[] | undefined, selected: string): boolean {
  return !selected || !values?.length || values.includes(selected);
}

function campaignMatchesArea(
  campaign: FollowerRecruitmentCampaign,
  area: { province: string; district: string; subDistrict: string },
): boolean {
  return (
    includesOrUnscoped(campaign.data_scope.provinces, area.province) &&
    includesOrUnscoped(campaign.data_scope.districts, area.district) &&
    includesOrUnscoped(campaign.data_scope.sub_districts, area.subDistrict)
  );
}

function CopyLinkButton({ publicCode }: { publicCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    await navigator.clipboard?.writeText(buildPublicUrl(publicCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button onClick={() => void handleCopy()} size="sm" variant="outline">
      <Link2 className="mr-1.5 size-3.5" />
      {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
    </Button>
  );
}

interface CampaignRowActionsProps {
  campaign: FollowerRecruitmentCampaign;
  isMutating: boolean;
  onDelete: (campaign: FollowerRecruitmentCampaign) => void;
  onToggleActive: (campaign: FollowerRecruitmentCampaign) => void;
}

function CampaignRowActions({
  campaign,
  isMutating,
  onDelete,
  onToggleActive,
}: CampaignRowActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <CopyLinkButton publicCode={campaign.public_code} />
      <Button
        disabled={isMutating}
        onClick={() => onToggleActive(campaign)}
        size="sm"
        variant="outline"
      >
        {campaign.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      </Button>
      <Button disabled={isMutating} onClick={() => onDelete(campaign)} size="sm" variant="destructive">
        ลบลิงก์
      </Button>
    </div>
  );
}

export function FollowerRecruitmentCampaignsSection({
  actions,
}: FollowerRecruitmentCampaignsSectionProps) {
  const [status, setStatus] = useState<CampaignStatusFilter>("ALL");
  const area = useSchoolAreaFilter();
  const query = useFollowerRecruitmentCampaigns();
  const updateMutation = useUpdateFollowerRecruitmentCampaign();
  const deleteMutation = useDeleteFollowerRecruitmentCampaign();
  const { confirm, dialog } = useConfirm();
  const stateCatalog = useStatusCatalog("RECRUITMENT_CAMPAIGN_STATE");

  const campaigns = query.data?.data ?? [];
  const filteredCampaigns = campaigns.filter((campaign) =>
    (status === "ALL" ? true : campaign.status === status) &&
    campaignMatchesArea(campaign, area),
  );
  const summary = campaigns.reduce(
    (acc, campaign) => {
      acc.views += campaign.view_count;
      acc.submissions += campaign.submission_count;
      if (campaign.status === "ACTIVE") acc.active += 1;
      if (campaign.status === "LOCKED") acc.locked += 1;
      if (campaign.status === "EXPIRED") acc.expired += 1;
      return acc;
    },
    { active: 0, locked: 0, expired: 0, views: 0, submissions: 0 },
  );
  const isMutating = updateMutation.isPending || deleteMutation.isPending;

  function handleToggleActive(campaign: FollowerRecruitmentCampaign): void {
    updateMutation.mutate({
      id: campaign.id,
      payload: { is_active: !campaign.is_active },
    });
  }

  async function handleDelete(campaign: FollowerRecruitmentCampaign): Promise<void> {
    const accepted = await confirm({
      title: "ลบลิงก์รับสมัคร",
      description: `ลิงก์ "${campaign.name}" จะใช้สมัครไม่ได้อีก (ใบสมัครที่ส่งมาแล้วยังอยู่)`,
      confirmText: "ลบลิงก์",
      variant: "destructive",
    });
    if (accepted) {
      deleteMutation.mutate(campaign.id);
    }
  }

  return (
    <section className="space-y-5">
      <ListPageToolbar
        description="ตรวจสอบลิงก์รับสมัคร อสม./ผู้ติดตาม และปิดหรือเปิดใช้งานได้ทันที"
        filters={
          <>
            <Combobox
              onChange={area.setProvince}
              options={[
                { value: "", label: "ทุกจังหวัด" },
                ...area.provinces.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาจังหวัด"
              value={area.province}
            />
            <Combobox
              disabled={!area.province}
              onChange={area.setDistrict}
              options={[
                { value: "", label: "ทุกอำเภอ/เขต" },
                ...area.districts.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาอำเภอ/เขต"
              value={area.district}
            />
            <Combobox
              disabled={!area.district}
              onChange={area.setSubDistrict}
              options={[
                { value: "", label: "ทุกตำบล/แขวง" },
                ...area.subDistricts.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาตำบล/แขวง"
              value={area.subDistrict}
            />
            <FilterSelect
              ariaLabel="สถานะลิงก์รับสมัคร"
              className="sm:w-[220px]"
              onChange={(value) => setStatus(value as CampaignStatusFilter)}
              value={status}
            >
              <option value="ALL">ทั้งหมด</option>
              {stateCatalog.items.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </>
        }
        icon={Link2}
        actions={actions}
        tableActions={<RefreshButton onRefresh={() => query.refetch()} />}
        title="ลิงก์รับสมัคร"
      />

      <SummaryMetrics
        items={[
          { code: "ALL", label: "ทั้งหมด", badgeVariant: "secondary" as const },
          ...stateCatalog.items,
        ].map((option) => ({
          label: option.label,
          value:
            option.code === "ACTIVE"
              ? summary.active
              : option.code === "LOCKED"
                ? summary.locked
                : option.code === "EXPIRED"
                  ? summary.expired
                  : campaigns.length,
          tone:
            option.badgeVariant === "success"
              ? "success"
              : option.badgeVariant === "warning"
                ? "warning"
                : option.badgeVariant === "destructive"
                  ? "danger"
                  : "default",
          icon: STATUS_ICON_MAP[option.code] ?? Link2,
        }))}
      />

      {updateMutation.isError || deleteMutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              updateMutation.error ?? deleteMutation.error,
              "ดำเนินการลิงก์รับสมัครไม่สำเร็จ",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {query.isError || stateCatalog.isError ? (
        <ErrorState
          title="ไม่สามารถโหลดข้อมูลลิงก์รับสมัครได้"
          description="ตรวจสอบสิทธิ์หรือการเชื่อมต่อ backend แล้วลองอีกครั้ง"
          onRetry={() => {
            void query.refetch();
            stateCatalog.refetch();
          }}
        />
      ) : query.isLoading || stateCatalog.isLoading ? (
        <SkeletonTable />
      ) : campaigns.length === 0 ? (
        <EmptyState
          description="ไปที่หน้า “สร้างลิงก์” เพื่อสร้างลิงก์รับสมัครรายการแรก"
          icon={Link2}
          title="ยังไม่มีลิงก์รับสมัคร"
        />
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          description="ลองเปลี่ยนตัวกรองสถานะลิงก์รับสมัคร"
          icon={Link2}
          title="ไม่พบลิงก์รับสมัครตามตัวกรอง"
        />
      ) : (
        <>
          <DataTable
            headings={[
              "ชื่อลิงก์",
              "สถานะ",
              { label: "เข้าชม", className: "whitespace-nowrap" },
              { label: "สมัครแล้ว", className: "whitespace-nowrap" },
              { label: "สร้างเมื่อ", className: "whitespace-nowrap" },
              "จัดการ",
            ]}
            minWidthClassName="min-w-full"
            responsiveBreakpoint="lg"
          >
            {filteredCampaigns.map((campaign) => {
              const catalogItem = findStatusCatalogItem(stateCatalog.items, campaign.status);
              return (
                <DataTableRow key={campaign.id}>
                  <DataTableCell className="font-bold text-slate-900">
                    {campaign.name}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge className="whitespace-nowrap text-[11px]" variant={catalogItem?.badgeVariant ?? "secondary"}>
                      {catalogItem?.label ?? campaign.status}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>{campaign.view_count}</DataTableCell>
                  <DataTableCell>{campaign.submission_count}</DataTableCell>
                  <DataTableCell>{formatThaiDate(campaign.created_at)}</DataTableCell>
                  <DataTableCell className="text-right">
                    <CampaignRowActions
                      campaign={campaign}
                      isMutating={isMutating}
                      onDelete={(row) => void handleDelete(row)}
                      onToggleActive={handleToggleActive}
                    />
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTable>

          <TableCardList desktopBreakpoint="lg">
            {filteredCampaigns.map((campaign) => {
              const catalogItem = findStatusCatalogItem(stateCatalog.items, campaign.status);
              return (
                <TableCard className="space-y-3" key={campaign.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-slate-900">{campaign.name}</div>
                    <Badge className="shrink-0 whitespace-nowrap text-[11px]" variant={catalogItem?.badgeVariant ?? "secondary"}>
                      {catalogItem?.label ?? campaign.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500">
                    เข้าชม {campaign.view_count} · สมัครแล้ว {campaign.submission_count} · สร้างเมื่อ{" "}
                    {formatThaiDate(campaign.created_at)}
                  </div>
                  <CampaignRowActions
                    campaign={campaign}
                    isMutating={isMutating}
                    onDelete={(row) => void handleDelete(row)}
                    onToggleActive={handleToggleActive}
                  />
                </TableCard>
              );
            })}
          </TableCardList>
        </>
      )}

      {dialog}
    </section>
  );
}
