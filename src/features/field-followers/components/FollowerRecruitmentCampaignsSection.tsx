import { useState } from "react";
import { Link2, Plus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { EmptyState, SkeletonTable } from "../../../components/layout/page-primitives";
import { formatThaiDate } from "../../../lib/date-time";
import { getApiErrorMessage } from "../../../lib/api-error";
import { CreateFollowerRecruitmentCampaignDialog } from "./CreateFollowerRecruitmentCampaignDialog";
import {
  useCreateFollowerRecruitmentCampaign,
  useDeleteFollowerRecruitmentCampaign,
  useFollowerRecruitmentCampaigns,
  useUpdateFollowerRecruitmentCampaign,
} from "../hooks/useFollowerRecruitmentCampaigns";
import type { FollowerRecruitmentCampaign } from "../types/follower-recruitment-campaign.types";

function buildPublicUrl(publicCode: string): string {
  return `${window.location.origin}/apply/field-follower/${publicCode}`;
}

function getCampaignStatusMeta(campaign: FollowerRecruitmentCampaign) {
  if (!campaign.is_active) {
    return { label: "ปิดรับสมัคร", variant: "secondary" as const };
  }
  if (!campaign.is_open) {
    return { label: "นอกช่วงเวลาที่กำหนด", variant: "warning" as const };
  }
  return { label: "เปิดรับสมัคร", variant: "success" as const };
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
        {campaign.is_active ? "ปิดรับสมัคร" : "เปิดรับสมัคร"}
      </Button>
      <Button disabled={isMutating} onClick={() => onDelete(campaign)} size="sm" variant="destructive">
        ลบลิงก์
      </Button>
    </div>
  );
}

export function FollowerRecruitmentCampaignsSection() {
  const [createOpen, setCreateOpen] = useState(false);
  const query = useFollowerRecruitmentCampaigns();
  const createMutation = useCreateFollowerRecruitmentCampaign();
  const updateMutation = useUpdateFollowerRecruitmentCampaign();
  const deleteMutation = useDeleteFollowerRecruitmentCampaign();
  const { confirm, dialog } = useConfirm();

  const campaigns = query.data?.data ?? [];
  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  function handleCreate(payload: Parameters<typeof createMutation.mutate>[0]): void {
    createMutation.mutate(payload, { onSuccess: () => setCreateOpen(false) });
  }

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
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">ลิงก์รับสมัคร อสม./ผู้ติดตาม</h2>
          <p className="text-sm text-slate-500">
            สร้างลิงก์รับสมัครแยกตามพื้นที่/รุ่น พร้อมติดตามยอดเข้าชมและยอดสมัครต่อลิงก์
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-1.5 size-4" />
          สร้างลิงก์รับสมัคร
        </Button>
      </div>

      {createMutation.isError || updateMutation.isError || deleteMutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              createMutation.error ?? updateMutation.error ?? deleteMutation.error,
              "ดำเนินการลิงก์รับสมัครไม่สำเร็จ",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {query.isLoading ? (
        <SkeletonTable />
      ) : campaigns.length === 0 ? (
        <EmptyState
          description="สร้างลิงก์แรกเพื่อเริ่มรับสมัคร อสม./ผู้ติดตามภาคสนาม"
          icon={Link2}
          title="ยังไม่มีลิงก์รับสมัคร"
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
            {campaigns.map((campaign) => {
              const statusMeta = getCampaignStatusMeta(campaign);
              return (
                <DataTableRow key={campaign.id}>
                  <DataTableCell className="font-bold text-slate-900">
                    {campaign.name}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge className="whitespace-nowrap text-[11px]" variant={statusMeta.variant}>
                      {statusMeta.label}
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
            {campaigns.map((campaign) => {
              const statusMeta = getCampaignStatusMeta(campaign);
              return (
                <TableCard className="space-y-3" key={campaign.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-slate-900">{campaign.name}</div>
                    <Badge className="shrink-0 whitespace-nowrap text-[11px]" variant={statusMeta.variant}>
                      {statusMeta.label}
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

      <CreateFollowerRecruitmentCampaignDialog
        error={createMutation.error}
        isPending={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        open={createOpen}
      />
      {dialog}
    </section>
  );
}
