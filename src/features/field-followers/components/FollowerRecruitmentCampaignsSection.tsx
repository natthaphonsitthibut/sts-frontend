import { useState } from "react";
import type { ReactNode } from "react";
import { CalendarClock, CheckCircle2, Clock, Link2, Lock, Trash2, UserCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Combobox,
  IconButton,
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
import { RefreshButton } from "../../../components/layout/refresh-button";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
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
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import {
  useAddFollowerCampaignTargets,
  useDeleteFollowerRecruitmentCampaign,
  useFollowerCampaignTargets,
  useFollowerRecruitmentCampaigns,
  usePrepareFollowerCampaignAssignment,
  useUpdateFollowerRecruitmentCampaign,
} from "../hooks/useFollowerRecruitmentCampaigns";
import { useFieldFollowers } from "../hooks/useFieldFollowers";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useStatusCatalog, findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { FollowerRecruitmentCampaign } from "../types/follower-recruitment-campaign.types";

type CampaignStatusFilter = "ALL" | "ACTIVE" | "LOCKED" | "EXPIRED" | "SCHEDULED";

interface FollowerRecruitmentCampaignsSectionProps {
  navigation?: ReactNode;
}

function buildPublicUrl(publicCode: string): string {
  return `${window.location.origin}/apply/field-follower/${publicCode}`;
}

/** Map status codes to icons for SummaryMetrics cards */
const STATUS_ICON_MAP: Record<string, typeof Link2> = {
  ACTIVE: CheckCircle2,
  LOCKED: Lock,
  EXPIRED: Clock,
  SCHEDULED: CalendarClock,
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
      <IconButton
        aria-label={`ลบลิงก์ ${campaign.name}`}
        disabled={isMutating}
        icon={Trash2}
        onClick={() => onDelete(campaign)}
        title="ลบลิงก์"
        variant="delete"
      />
    </div>
  );
}

export function FollowerRecruitmentCampaignsSection({
  navigation,
}: FollowerRecruitmentCampaignsSectionProps) {
  const [status, setStatus] = useState<CampaignStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [caseIdsInput, setCaseIdsInput] = useState("");
  const [assignFollowerIds, setAssignFollowerIds] = useState<Record<string, string>>({});
  const area = useSchoolAreaFilter();
  const contextualNavigate = useContextualNavigate();
  const query = useFollowerRecruitmentCampaigns();
  const targetsQuery = useFollowerCampaignTargets(selectedCampaignId);
  const applicantsQuery = useFieldFollowers({
    campaignId: selectedCampaignId ?? undefined,
    page: 1,
    limit: 50,
  }, {
    enabled: Boolean(selectedCampaignId),
  });
  const addTargetsMutation = useAddFollowerCampaignTargets();
  const prepareAssignment = usePrepareFollowerCampaignAssignment();
  const updateMutation = useUpdateFollowerRecruitmentCampaign();
  const deleteMutation = useDeleteFollowerRecruitmentCampaign();
  const { confirm, dialog } = useConfirm();
  const stateCatalog = useStatusCatalog("RECRUITMENT_CAMPAIGN_STATE");
  const debouncedSearch = useDebouncedValue(searchQuery.trim().toLowerCase(), 350);

  const campaigns = query.data?.data ?? [];
  const filteredCampaigns = campaigns.filter((campaign) =>
    (status === "ALL" ? true : campaign.status === status) &&
    campaignMatchesArea(campaign, area) &&
    (!debouncedSearch ||
      campaign.name.toLowerCase().includes(debouncedSearch) ||
      campaign.description?.toLowerCase().includes(debouncedSearch)),
  );

  function clearFilters(): void {
    setStatus("ALL");
    area.setProvince("");
  }
  const summary = campaigns.reduce(
    (acc, campaign) => {
      acc.views += campaign.view_count;
      acc.submissions += campaign.submission_count;
      if (campaign.status === "ACTIVE") acc.active += 1;
      if (campaign.status === "LOCKED") acc.locked += 1;
      if (campaign.status === "EXPIRED") acc.expired += 1;
      if (campaign.status === "SCHEDULED") acc.scheduled += 1;
      return acc;
    },
    { active: 0, locked: 0, expired: 0, scheduled: 0, views: 0, submissions: 0 },
  );
  const isMutating = updateMutation.isPending || deleteMutation.isPending;
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;

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

  function handleAddTargets(): void {
    if (!selectedCampaignId) return;
    const caseIds = Array.from(
      new Set(
        caseIdsInput
          .split(/[,\s]+/)
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );
    if (caseIds.length === 0) return;
    addTargetsMutation.mutate(
      { campaignId: selectedCampaignId, caseIds },
      { onSuccess: () => setCaseIdsInput("") },
    );
  }

  function handleAssignPreview(targetId: string): void {
    const followerId = Number(assignFollowerIds[targetId]);
    if (!Number.isInteger(followerId) || followerId <= 0) return;
    prepareAssignment.mutate(
      { targetId, followerId },
      {
        onSuccess: (result) => {
          contextualNavigate("/create/visit", { state: { prefill: result.data.prefill } });
        },
      },
    );
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
        navigation={navigation}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "ค้นหาชื่อลิงก์หรือแคมเปญ...",
        }}
        tableActions={
          <RefreshButton onRefresh={() => query.refetch()} updatedAt={query.dataUpdatedAt} />
        }
        onClearFilters={clearFilters}
        title="ลิงก์รับสมัคร"
      />

      <SummaryMetrics
        centerRows
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
                  : option.code === "SCHEDULED"
                    ? summary.scheduled
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
          onSelect: () =>
            setStatus(
              status === option.code && option.code !== "ALL"
                ? "ALL"
                : (option.code as CampaignStatusFilter),
            ),
          selected: status === option.code,
          selectionLabel:
            option.code === "ALL"
              ? "แสดงลิงก์รับสมัครทุกสถานะ"
              : `${status === option.code ? "ยกเลิกตัวกรอง" : "กรอง"}${option.label}`,
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
          description="ตรวจสอบสิทธิ์ของคุณแล้วลองใหม่อีกครั้ง"
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
              "เครื่องมือ",
            ]}
            minWidthClassName="min-w-full"
            responsiveBreakpoint="lg"
          >
            {filteredCampaigns.map((campaign) => {
              const catalogItem = findStatusCatalogItem(stateCatalog.items, campaign.status);
              return (
                <DataTableRow key={campaign.id}>
                  <DataTableCell className="text-slate-900">
                    {campaign.name}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge className="whitespace-nowrap" variant={catalogItem?.badgeVariant ?? "secondary"}>
                      {catalogItem?.label ?? campaign.status}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>{campaign.view_count}</DataTableCell>
                  <DataTableCell>{campaign.submission_count}</DataTableCell>
                  <DataTableCell>{formatThaiDate(campaign.created_at)}</DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="space-y-2">
                      <Button
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        size="sm"
                        variant={selectedCampaignId === campaign.id ? "default" : "outline"}
                      >
                        <UserCheck className="mr-1.5 size-3.5" />
                        ดูผู้สมัคร
                      </Button>
                      <CampaignRowActions
                        campaign={campaign}
                        isMutating={isMutating}
                        onDelete={(row) => void handleDelete(row)}
                        onToggleActive={handleToggleActive}
                      />
                    </div>
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
                    <div className="text-slate-900">{campaign.name}</div>
                    <Badge className="shrink-0 whitespace-nowrap" variant={catalogItem?.badgeVariant ?? "secondary"}>
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
                  <Button
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    size="sm"
                    variant={selectedCampaignId === campaign.id ? "default" : "outline"}
                  >
                    ดูผู้สมัคร
                  </Button>
                </TableCard>
              );
            })}
          </TableCardList>
        </>
      )}

      {selectedCampaign ? (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">{selectedCampaign.name}</h3>
              <p className="text-sm text-slate-500">ผู้สมัครและเคสที่ต้องเยี่ยมในลิงก์นี้</p>
            </div>
            <CopyLinkButton publicCode={selectedCampaign.public_code} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="font-semibold text-slate-800">ผู้สมัคร</div>
              {applicantsQuery.isLoading ? (
                <SkeletonTable />
              ) : applicantsQuery.isError ? (
                <ErrorState
                  description={getApiErrorMessage(
                    applicantsQuery.error,
                    "เกิดข้อผิดพลาดระหว่างโหลดผู้สมัครจากลิงก์นี้",
                  )}
                  onRetry={() => void applicantsQuery.refetch()}
                  title="โหลดผู้สมัครไม่สำเร็จ"
                />
              ) : applicantsQuery.data?.data.length ? (
                <div className="space-y-2">
                  {applicantsQuery.data.data.map((follower) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3"
                      key={follower.id}
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {follower.first_name} {follower.last_name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {follower.phone} · {follower.email ?? "ไม่มีอีเมล"} · {follower.status}
                        </div>
                      </div>
                      <Button
                        onClick={() => contextualNavigate(`/field-followers/${follower.id}`)}
                        size="sm"
                        variant="outline"
                      >
                        ดู detail
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  className="px-4 py-10"
                  description="ผู้สมัครที่ส่งใบสมัครผ่านลิงก์นี้จะแสดงที่นี่"
                  icon={UserCheck}
                  title="ยังไม่มีผู้สมัครจากลิงก์นี้"
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="font-semibold text-slate-800">เคสที่ต้องเยี่ยม</div>
              <div className="flex gap-2">
                <Input
                  onChange={(event) => setCaseIdsInput(event.target.value)}
                  placeholder="case id เช่น 12, 13"
                  value={caseIdsInput}
                />
                <Button
                  disabled={addTargetsMutation.isPending}
                  onClick={handleAddTargets}
                  type="button"
                >
                  เพิ่มเคส
                </Button>
              </div>
              {addTargetsMutation.isError || prepareAssignment.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {getApiErrorMessage(
                      addTargetsMutation.error ?? prepareAssignment.error,
                      "ดำเนินการเคสในแคมเปญไม่สำเร็จ",
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
              {targetsQuery.isLoading ? (
                <SkeletonTable />
              ) : targetsQuery.isError ? (
                <ErrorState
                  description={getApiErrorMessage(
                    targetsQuery.error,
                    "เกิดข้อผิดพลาดระหว่างโหลดเคสในแคมเปญนี้",
                  )}
                  onRetry={() => void targetsQuery.refetch()}
                  title="โหลดเคสไม่สำเร็จ"
                />
              ) : targetsQuery.data?.data.length ? (
                <div className="space-y-2">
                  {targetsQuery.data.data.map((target) => (
                    <div className="space-y-2 rounded-md border border-slate-100 p-3" key={target.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            #{target.case_id} {target.case.student_name ?? "ไม่ระบุชื่อ"}
                          </div>
                          <div className="text-sm text-slate-500">
                            {target.case.reason_flagged ?? "ไม่ระบุเหตุผล"} · {target.status}
                          </div>
                        </div>
                        {target.assigned_follower ? (
                          <Badge variant="success">มอบหมายแล้ว</Badge>
                        ) : (
                          <Badge variant="secondary">OPEN</Badge>
                        )}
                      </div>
                      {target.status === "OPEN" ? (
                        <div className="flex gap-2">
                          <Input
                            onChange={(event) =>
                              setAssignFollowerIds((current) => ({
                                ...current,
                                [target.id]: event.target.value,
                              }))
                            }
                            placeholder="follower id"
                            value={assignFollowerIds[target.id] ?? ""}
                          />
                          <Button
                            disabled={prepareAssignment.isPending}
                            onClick={() => handleAssignPreview(target.id)}
                            type="button"
                          >
                            มอบหมายงาน
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  className="px-4 py-10"
                  description="เคสที่เพิ่มไว้สำหรับแคมเปญนี้จะแสดงที่นี่"
                  icon={CalendarClock}
                  title="ยังไม่มีเคสในแคมเปญนี้"
                />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {dialog}
    </section>
  );
}
