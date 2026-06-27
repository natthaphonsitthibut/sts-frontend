import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, KeyRound, Search, UserPlus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Combobox,
  Input,
  Label,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SummaryMetrics,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { adminService } from "../api/admin.service";
import type {
  StudentAccountCandidate,
  StudentAccountCredential,
  StudentAccountFilter,
} from "../types/admin.types";

function ScopeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function buildFilter(scope: ReturnType<typeof useScopeCascade>, limit: number): StudentAccountFilter {
  return {
    schoolId: scope.schoolId ? Number(scope.schoolId) : undefined,
    grade: scope.grade || undefined,
    room: scope.room ? Number(scope.room) : undefined,
    onlyWithoutAccount: true,
    limit,
  };
}

function credentialsToTsv(credentials: StudentAccountCredential[]): string {
  const header = ["ชื่อ", "โรงเรียน", "ชั้น", "ห้อง", "username", "temp password"];
  return [
    header.join("\t"),
    ...credentials.map((credential) =>
      [
        credential.studentName,
        credential.schoolName ?? "",
        credential.grade ?? "",
        credential.room ?? "",
        credential.username,
        credential.tempPassword,
      ].join("\t"),
    ),
  ].join("\n");
}

function CandidateTable({ candidates }: { candidates: StudentAccountCandidate[] }) {
  if (candidates.length === 0) {
    return <EmptyState icon={UserPlus} title="ไม่มีนักเรียนที่ต้องสร้างบัญชี" />;
  }

  return (
    <>
      <DataTable
        headings={["ชื่อ", "โรงเรียน", "ชั้น/ห้อง", "ปี/เทอม", "สถานะบัญชี"]}
        minWidthClassName="min-w-[860px]"
      >
        {candidates.map((candidate) => (
          <DataTableRow key={candidate.studentId}>
            <DataTableCell className="font-bold text-slate-800">
              {candidate.studentName}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {candidate.schoolName ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {candidate.grade ?? "-"} / {candidate.room ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {candidate.academicYear ?? "-"} / {candidate.semester ?? "-"}
            </DataTableCell>
            <DataTableCell>
              <Badge variant={candidate.hasActiveAccount ? "secondary" : "warning"}>
                {candidate.hasActiveAccount ? "มีบัญชีแล้ว" : "พร้อมสร้าง"}
              </Badge>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>
      <TableCardList>
        {candidates.map((candidate) => (
          <TableCard key={candidate.studentId} className="space-y-2">
            <div className="font-bold text-slate-900">{candidate.studentName}</div>
            <div className="text-sm text-slate-600">
              {candidate.schoolName ?? "-"} · {candidate.grade ?? "-"} / {candidate.room ?? "-"}
            </div>
            <Badge variant={candidate.hasActiveAccount ? "secondary" : "warning"}>
              {candidate.hasActiveAccount ? "มีบัญชีแล้ว" : "พร้อมสร้าง"}
            </Badge>
          </TableCard>
        ))}
      </TableCardList>
    </>
  );
}

function CredentialTable({ credentials }: { credentials: StudentAccountCredential[] }) {
  if (credentials.length === 0) return null;
  return (
    <>
      <DataTable
        headings={["ชื่อ", "โรงเรียน", "ชั้น/ห้อง", "username", "temp password"]}
        minWidthClassName="min-w-[940px]"
      >
        {credentials.map((credential) => (
          <DataTableRow key={credential.userId}>
            <DataTableCell className="font-bold text-slate-800">
              {credential.studentName}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {credential.schoolName ?? "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {credential.grade ?? "-"} / {credential.room ?? "-"}
            </DataTableCell>
            <DataTableCell className="font-mono text-sm text-slate-700">
              {credential.username}
            </DataTableCell>
            <DataTableCell className="font-mono text-sm font-bold text-slate-900">
              {credential.tempPassword}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>
      <TableCardList>
        {credentials.map((credential) => (
          <TableCard key={credential.userId} className="space-y-2">
            <div className="font-bold text-slate-900">{credential.studentName}</div>
            <div className="text-sm text-slate-600">
              {credential.schoolName ?? "-"} · {credential.grade ?? "-"} / {credential.room ?? "-"}
            </div>
            <div className="grid gap-1 text-sm">
              <span className="font-mono text-slate-700">{credential.username}</span>
              <span className="font-mono font-bold text-slate-900">
                {credential.tempPassword}
              </span>
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </>
  );
}

export function StudentAccountsPage() {
  const scope = useScopeCascade({ lockToActorScope: true });
  const [limit, setLimit] = useState(50);
  const schoolsQuery = useQuery({
    queryKey: ["student-account-schools"],
    queryFn: () => attendanceLookupService.getSchools({ limit: 100 }),
  });
  const filter = useMemo(() => buildFilter(scope, limit), [scope, limit]);
  const previewMutation = useMutation({
    mutationFn: () => adminService.previewStudentAccounts(filter),
  });
  const generateMutation = useMutation({
    mutationFn: () => adminService.generateStudentAccounts(filter),
  });
  const preview = previewMutation.data;
  const credentials = generateMutation.data?.credentials ?? [];

  async function copyCredentials(): Promise<void> {
    if (credentials.length === 0) return;
    await navigator.clipboard.writeText(credentialsToTsv(credentials));
  }

  return (
    <PageShell maxWidthClassName="max-w-[1180px]">
      <PageToolbar
        icon={KeyRound}
        title="บัญชีนักเรียน"
        description="สร้าง username และรหัสผ่านชั่วคราวจาก roster ปัจจุบัน"
        actions={
          <Button
            icon={Search}
            isLoading={previewMutation.isPending}
            loadingText="กำลังตรวจ"
            onClick={() => previewMutation.mutate()}
          >
            ดูตัวอย่าง
          </Button>
        }
      >
        <ToolbarControls className="sm:grid sm:grid-cols-5 sm:items-end">
          <ScopeField label="โรงเรียน">
            <Combobox
              disabled={scope.schoolLocked}
              onChange={scope.setSchoolId}
              options={[
                { value: "", label: "ทุกโรงเรียน" },
                ...(schoolsQuery.data ?? []).map((school) => ({
                  value: String(school.id),
                  label: school.name,
                })),
              ]}
              placeholder="ค้นหาโรงเรียน"
              value={scope.schoolId}
            />
          </ScopeField>
          <ScopeField label="ชั้น">
            <Combobox
              disabled={!scope.schoolId || scope.gradeLocked}
              onChange={scope.setGrade}
              options={[
                { value: "", label: "ทุกชั้น" },
                ...scope.gradeLevels.map((grade) => ({ value: grade.label, label: grade.label })),
              ]}
              searchable={false}
              value={scope.grade}
            />
          </ScopeField>
          <ScopeField label="ห้อง">
            <Combobox
              disabled={!scope.grade || scope.roomLocked}
              onChange={scope.setRoom}
              options={[
                { value: "", label: "ทุกห้อง" },
                ...scope.rooms.map((room) => ({ value: room, label: `ห้อง ${room}` })),
              ]}
              searchable={false}
              value={scope.room}
            />
          </ScopeField>
          <ScopeField label="จำนวนสูงสุด">
            <Input
              min={1}
              max={200}
              onChange={(event) => setLimit(Number(event.target.value) || 1)}
              type="number"
              value={limit}
            />
          </ScopeField>
          <Button
            disabled={!preview || preview.summary.withoutAccountCount === 0}
            icon={UserPlus}
            isLoading={generateMutation.isPending}
            loadingText="กำลังสร้าง"
            onClick={() => generateMutation.mutate()}
          >
            สร้างบัญชี
          </Button>
        </ToolbarControls>
      </PageToolbar>

      {previewMutation.isError ? (
        <ErrorState
          title="ตรวจรายชื่อไม่สำเร็จ"
          description={getApiErrorMessage(previewMutation.error, "กรุณาลองใหม่")}
          onRetry={() => previewMutation.mutate()}
        />
      ) : preview ? (
        <div className="space-y-5">
          <SummaryMetrics
            items={[
              { label: "ในขอบเขต", value: preview.summary.totalCount },
              { label: "ยังไม่มีบัญชี", value: preview.summary.withoutAccountCount },
              { label: "มีบัญชีแล้ว", value: preview.summary.existingAccountCount },
            ]}
          />
          <CandidateTable candidates={preview.candidates} />
        </div>
      ) : (
        <EmptyState icon={KeyRound} title="เลือกขอบเขตแล้วดูตัวอย่าง" />
      )}

      {generateMutation.isError ? (
        <div className="mt-5">
          <ErrorState
            title="สร้างบัญชีไม่สำเร็จ"
            description={getApiErrorMessage(generateMutation.error, "กรุณาลองใหม่")}
            onRetry={() => generateMutation.mutate()}
          />
        </div>
      ) : null}

      {credentials.length > 0 ? (
        <div className="mt-5 space-y-4">
          <Alert>
            <AlertTitle>สร้างบัญชีแล้ว {credentials.length} คน</AlertTitle>
            <AlertDescription>
              รหัสผ่านชั่วคราวจะแสดงเฉพาะผลลัพธ์รอบนี้
            </AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button icon={Copy} onClick={() => void copyCredentials()} variant="outline">
              คัดลอกตาราง
            </Button>
          </div>
          <CredentialTable credentials={credentials} />
        </div>
      ) : null}
    </PageShell>
  );
}
