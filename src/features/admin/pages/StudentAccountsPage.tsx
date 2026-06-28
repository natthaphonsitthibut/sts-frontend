import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { adminService } from "../api/admin.service";
import type {
  StudentAccountCandidate,
  StudentAccountCredential,
  StudentAccountFilter,
} from "../types/admin.types";

const MIN_BULK_LIMIT = 1;
const MAX_BULK_LIMIT = 200;

function ScopeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function buildFilter(scope: ReturnType<typeof useScopeCascade>, limit: number): StudentAccountFilter {
  const safeLimit = Math.min(Math.max(limit, MIN_BULK_LIMIT), MAX_BULK_LIMIT);
  return {
    schoolId: scope.schoolId ? Number(scope.schoolId) : undefined,
    grade: scope.grade || undefined,
    room: scope.room ? Number(scope.room) : undefined,
    onlyWithoutAccount: true,
    limit: safeLimit,
  };
}

function getStudentAccountErrorMessage(error: unknown): string {
  const message = getApiErrorMessage(error, "กรุณาตรวจสอบตัวกรองแล้วลองใหม่");
  if (message.includes("limit must not be greater than 200")) {
    return "จำนวนต่อรอบต้องไม่เกิน 200 คน";
  }
  if (message.includes("limit must not be less than 1")) {
    return "จำนวนต่อรอบต้องอย่างน้อย 1 คน";
  }
  return message;
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
  const area = useSchoolAreaFilter();
  const [limit, setLimit] = useState(50);
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

  function setAreaAndClearSchool(
    level: "province" | "district" | "subDistrict",
    value: string,
  ): void {
    area.setSchoolSearch("");
    if (level === "province") {
      area.setProvince(value);
    } else if (level === "district") {
      area.setDistrict(value);
    } else {
      area.setSubDistrict(value);
    }
    scope.setSchoolId("");
  }

  function setSchool(nextSchoolId: string): void {
    scope.setSchoolId(nextSchoolId);
    const school = area.filteredSchools.find(
      (candidate) => String(candidate.id) === nextSchoolId,
    );
    area.setAreaFromSchool(school);
  }

  function handleLimitChange(value: string): void {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      setLimit(MIN_BULK_LIMIT);
      return;
    }
    setLimit(Math.min(Math.max(numericValue, MIN_BULK_LIMIT), MAX_BULK_LIMIT));
  }

  return (
    <PageShell maxWidthClassName="max-w-[1180px]">
      <PageToolbar
        icon={KeyRound}
        title="บัญชีนักเรียน"
        description="สร้าง username และรหัสผ่านชั่วคราวจาก roster ปัจจุบัน"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={Search}
              isLoading={previewMutation.isPending}
              loadingText="กำลังตรวจ"
              onClick={() => previewMutation.mutate()}
            >
              ดูตัวอย่าง
            </Button>
            <Button
              disabled={!preview || preview.summary.withoutAccountCount === 0}
              icon={UserPlus}
              isLoading={generateMutation.isPending}
              loadingText="กำลังสร้าง"
              onClick={() => generateMutation.mutate()}
            >
              สร้างบัญชี
            </Button>
          </div>
        }
      >
        <ToolbarControls className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 md:items-start">
          {scope.schoolLocked ? null : (
            <>
              <ScopeField label="จังหวัด">
                <Combobox
                  onChange={(next) => {
                    setAreaAndClearSchool("province", next);
                  }}
                  options={[
                    { value: "", label: "ทุกจังหวัด" },
                    ...area.provinces.map((name) => ({ value: name, label: name })),
                  ]}
                  placeholder="ค้นหาจังหวัด"
                  value={area.province}
                />
              </ScopeField>
              <ScopeField label="อำเภอ">
                <Combobox
                  disabled={!area.province}
                  onChange={(next) => {
                    setAreaAndClearSchool("district", next);
                  }}
                  options={[
                    { value: "", label: "ทุกอำเภอ" },
                    ...area.districts.map((name) => ({ value: name, label: name })),
                  ]}
                  placeholder="ค้นหาอำเภอ"
                  value={area.district}
                />
              </ScopeField>
              <ScopeField label="ตำบล">
                <Combobox
                  disabled={!area.district}
                  onChange={(next) => {
                    setAreaAndClearSchool("subDistrict", next);
                  }}
                  options={[
                    { value: "", label: "ทุกตำบล" },
                    ...area.subDistricts.map((name) => ({ value: name, label: name })),
                  ]}
                  placeholder="ค้นหาตำบล"
                  value={area.subDistrict}
                />
              </ScopeField>
            </>
          )}
          <ScopeField label="โรงเรียน">
            <Combobox
              disabled={scope.schoolLocked}
              emptyText={
                area.schoolsEnabled
                  ? "ไม่พบโรงเรียน"
                  : "พิมพ์ชื่อโรงเรียน หรือเลือกจังหวัด/อำเภอ/ตำบล"
              }
              onChange={setSchool}
              onSearchChange={area.setSchoolSearch}
              options={[
                { value: "", label: "ทุกโรงเรียน" },
                ...area.filteredSchools.map((school) => ({
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
          <ScopeField label={`จำนวนคนต่อรอบ (${MIN_BULK_LIMIT}-${MAX_BULK_LIMIT})`}>
            <Input
              min={MIN_BULK_LIMIT}
              max={MAX_BULK_LIMIT}
              onChange={(event) => handleLimitChange(event.target.value)}
              type="number"
              value={limit}
            />
          </ScopeField>
        </ToolbarControls>
      </PageToolbar>

      {previewMutation.isError ? (
        <ErrorState
          title="ตรวจรายชื่อไม่สำเร็จ"
          description={getStudentAccountErrorMessage(previewMutation.error)}
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
            description={getStudentAccountErrorMessage(generateMutation.error)}
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
