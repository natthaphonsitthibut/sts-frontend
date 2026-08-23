import { useQuery } from "@tanstack/react-query";
import { Link2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  appToast,
  Button,
  FormErrorAlert,
  useConfirm,
} from "../../../components/base";
import { LinkShareDialog } from "../../../components/layout/link-share-dialog";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  FilterCombobox,
  FilterSelect,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatClassLabel } from "../../../lib/room-presentation";
import { attendanceService } from "../../attendance/api/attendance.service";
import { useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { ClassroomLinksTable } from "../components/ClassroomLinksTable";
import {
  useBulkCreateClassroomLinks,
  useClassroomLinks,
  useDeactivateClassroomLink,
  useRedisplayClassroomLink,
  useResendClassroomLinkLine,
  useRotateClassroomLink,
} from "../hooks/useClassroomLinks";
import type {
  ClassroomLinkListItem,
  ClassroomLinkStatus,
} from "../types/classroom-links.types";

const PAGE_ICON = PAGE_IDENTITIES["/attendance/classroom-links"].icon;

export function ClassroomLinksPage() {
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const [schoolInput, setSchoolInput] = useState("");
  const [termInput, setTermInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [gradeInput, setGradeInput] = useState("");
  const [linkStatusInput, setLinkStatusInput] = useState("");
  const [homeroomInput, setHomeroomInput] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    action: string;
    id: string | number;
  } | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const schoolId =
    Number(schools.length === 1 ? schools[0]?.id : schoolInput) || null;
  const termsQuery = useQuery({
    queryKey: ["classroom-links", "terms", schoolId],
    queryFn: () => attendanceService.getTerms(schoolId!),
    enabled: schoolId !== null,
  });
  const gradeLevelsQuery = useQuery({
    queryKey: ["classroom-links", "grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
  });
  const terms = termsQuery.data ?? [];
  const selectedTerm =
    terms.find((term) => term.id === termInput) ??
    terms.find((term) => term.status === "ACTIVE") ??
    terms[0] ??
    null;
  const termId = selectedTerm ? Number(selectedTerm.id) : null;
  const linksQuery = useClassroomLinks(
    schoolId && termId
      ? {
          schoolId,
          schoolTermId: termId,
          search: search || undefined,
          gradeLevelId: Number(gradeInput) || undefined,
          linkStatus: (linkStatusInput || undefined) as
            | ClassroomLinkStatus
            | undefined,
          homeroomStatus: (homeroomInput || undefined) as
            | "ASSIGNED"
            | "UNASSIGNED"
            | undefined,
          page,
          limit: rowsPerPage,
        }
      : null,
  );
  const bulkCreate = useBulkCreateClassroomLinks();
  const redisplay = useRedisplayClassroomLink();
  const rotate = useRotateClassroomLink();
  const deactivate = useDeactivateClassroomLink();
  const resendLine = useResendClassroomLinkLine();
  const rows = linksQuery.data?.data ?? [];

  function resetListState(): void {
    setPage(1);
    setSelected(new Set());
  }

  async function createLinks(
    classroomIds?: number[],
    allClassrooms = false,
  ): Promise<void> {
    if (!schoolId || !termId) return;
    const actionId = classroomIds?.[0] ?? "all";
    setPending({ action: "create", id: actionId });
    try {
      const result = await bulkCreate.mutateAsync({
        schoolId,
        schoolTermId: termId,
        classroomIds: allClassrooms ? undefined : classroomIds,
        allClassrooms: allClassrooms || undefined,
      });
      const createdCount = result.data.filter((item) => item.created).length;
      const sentCount = result.data.filter(
        (item) => item.lineDelivery?.status === "SENT",
      ).length;
      appToast.success(
        `พร้อมใช้งาน ${result.data.length.toLocaleString("th-TH")} ห้อง${sentCount ? ` · ส่ง LINE สำเร็จ ${sentCount.toLocaleString("th-TH")} ห้อง` : ""}`,
      );
      if (
        createdCount === 1 &&
        result.data.length === 1 &&
        result.data[0].accessUrl
      ) {
        setSharedUrl(result.data[0].accessUrl);
      }
      setSelected(new Set());
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  async function handleCreateAll(): Promise<void> {
    const accepted = await confirm({
      title: "สร้างลิงก์ให้ทุกห้องในภาคเรียนนี้?",
      description:
        "ลิงก์ที่ใช้งานอยู่จะไม่ถูกเปลี่ยน ส่วนห้องที่ยังไม่มีหรือถูกปิดจะได้รับลิงก์ใหม่และระบบจะลองส่งให้ครูประจำชั้นผ่าน LINE",
      confirmText: "สร้างทั้งหมด",
    });
    if (accepted) await createLinks(undefined, true);
  }

  async function handleCopy(row: ClassroomLinkListItem): Promise<void> {
    if (!row.id) return;
    setPending({ action: "copy", id: row.id });
    try {
      setSharedUrl((await redisplay.mutateAsync(row.id)).accessUrl);
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  async function handleRotate(row: ClassroomLinkListItem): Promise<void> {
    if (!row.id) return;
    const accepted = await confirm({
      title: `หมุนลิงก์ ${formatClassLabel(row.gradeLabel, row.roomNumber)}?`,
      description:
        "ลิงก์เดิมจะหยุดใช้งานทันที หลังหมุนแล้วต้องส่งหรือแชร์ลิงก์ใหม่",
      confirmText: "หมุนลิงก์",
      variant: "destructive",
    });
    if (!accepted) return;
    setPending({ action: "rotate", id: row.id });
    try {
      const result = await rotate.mutateAsync(row.id);
      setSharedUrl(result.accessUrl);
      appToast.success("หมุนลิงก์แล้ว กรุณาส่งลิงก์ใหม่ให้ผู้ใช้งาน");
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  async function handleDeactivate(row: ClassroomLinkListItem): Promise<void> {
    if (!row.id) return;
    const accepted = await confirm({
      title: `ปิดลิงก์ ${formatClassLabel(row.gradeLabel, row.roomNumber)}?`,
      description:
        "ผู้ที่มีลิงก์เดิมจะไม่สามารถเปิดห้องนี้ได้จนกว่าจะสร้างลิงก์ใหม่",
      confirmText: "ปิดลิงก์",
      variant: "destructive",
    });
    if (!accepted) return;
    setPending({ action: "deactivate", id: row.id });
    try {
      await deactivate.mutateAsync(row.id);
      appToast.success("ปิดลิงก์แล้ว");
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  async function handleResendLine(row: ClassroomLinkListItem): Promise<void> {
    if (!row.id) return;
    setPending({ action: "line", id: row.id });
    try {
      const delivery = await resendLine.mutateAsync(row.id);
      if (delivery.status === "SENT")
        appToast.success("ส่งลิงก์ผ่าน LINE สำเร็จ");
      else
        appToast.error("ส่ง LINE ไม่สำเร็จ สามารถคัดลอกลิงก์เพื่อแชร์เองได้");
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  const actionError =
    bulkCreate.error ??
    redisplay.error ??
    rotate.error ??
    deactivate.error ??
    resendLine.error;
  const pageError =
    schoolsQuery.error ??
    termsQuery.error ??
    gradeLevelsQuery.error ??
    linksQuery.error;
  const isLoading =
    schoolsQuery.isLoading ||
    gradeLevelsQuery.isLoading ||
    Boolean(schoolId && termsQuery.isLoading) ||
    Boolean(schoolId && termId && linksQuery.isLoading);

  return (
    <PageShell>
      <PageToolbar
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={selected.size === 0}
              icon={Plus}
              isLoading={bulkCreate.isPending && pending?.id !== "all"}
              onClick={() => void createLinks([...selected])}
              variant="outline"
            >
              สร้างที่เลือก ({selected.size.toLocaleString("th-TH")})
            </Button>
            <Button
              disabled={!schoolId || !termId}
              icon={Link2}
              isLoading={bulkCreate.isPending && pending?.id === "all"}
              onClick={() => void handleCreateAll()}
            >
              สร้างทั้งหมด
            </Button>
          </div>
        }
        title="จัดการลิงก์ห้องเรียน"
      />

      <ToolbarControls className="mb-6">
        <SearchInput
          className="sm:max-w-[420px]"
          onChange={(value) => {
            setSearchInput(value);
            resetListState();
          }}
          placeholder="ค้นหาห้อง ระดับชั้น หรือครูประจำชั้น"
          value={searchInput}
        />
        {schools.length > 1 ? (
          <FilterCombobox
            ariaLabel="เลือกโรงเรียน"
            emptyText="ไม่พบโรงเรียน"
            onChange={(value) => {
              setSchoolInput(value);
              setTermInput("");
              resetListState();
            }}
            options={schools.map((school) => ({
              value: String(school.id),
              label: school.name,
            }))}
            placeholder="เลือกโรงเรียน"
            value={schoolInput}
          />
        ) : null}
        <FilterSelect
          ariaLabel="เลือกภาคเรียน"
          disabled={!schoolId || terms.length === 0}
          onChange={(value) => {
            setTermInput(value);
            resetListState();
          }}
          value={selectedTerm?.id ?? ""}
        >
          {terms.length === 0 ? (
            <option value="">ยังไม่มีภาคเรียน</option>
          ) : null}
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              ปีการศึกษา {term.academicYear}/{term.semester}
            </option>
          ))}
        </FilterSelect>
        <FilterCombobox
          ariaLabel="กรองระดับชั้น"
          emptyText="ไม่พบระดับชั้น"
          onChange={(value) => {
            setGradeInput(value);
            resetListState();
          }}
          options={(gradeLevelsQuery.data ?? []).map((grade) => ({
            value: String(grade.id),
            label: grade.label,
          }))}
          placeholder="ทุกระดับชั้น"
          value={gradeInput}
        />
        <FilterSelect
          ariaLabel="กรองสถานะลิงก์"
          onChange={(value) => {
            setLinkStatusInput(value);
            resetListState();
          }}
          value={linkStatusInput}
        >
          <option value="">ทุกสถานะลิงก์</option>
          <option value="ACTIVE">ใช้งานอยู่</option>
          <option value="INACTIVE">ปิดใช้งาน</option>
          <option value="NOT_CREATED">ยังไม่ได้สร้าง</option>
        </FilterSelect>
        <FilterSelect
          ariaLabel="กรองครูประจำชั้น"
          onChange={(value) => {
            setHomeroomInput(value);
            resetListState();
          }}
          value={homeroomInput}
        >
          <option value="">ครูประจำชั้นทั้งหมด</option>
          <option value="ASSIGNED">กำหนดแล้ว</option>
          <option value="UNASSIGNED">ยังไม่ได้กำหนด</option>
        </FilterSelect>
      </ToolbarControls>

      <FormErrorAlert
        className="mb-4"
        error={actionError}
        fallback="ดำเนินการกับลิงก์ไม่สำเร็จ"
      />

      {pageError ? (
        <ErrorState
          description="ไม่สามารถโหลดข้อมูลลิงก์ห้องเรียนได้ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            void schoolsQuery.refetch();
            void termsQuery.refetch();
            void gradeLevelsQuery.refetch();
            void linksQuery.refetch();
          }}
          title="โหลดข้อมูลไม่สำเร็จ"
        />
      ) : isLoading ? (
        <SkeletonTable rows={8} />
      ) : schools.length === 0 ? (
        <EmptyState
          description="บัญชีนี้ยังไม่มีโรงเรียนในขอบเขตการดูแล"
          icon={PAGE_ICON}
          title="ไม่พบโรงเรียนในขอบเขต"
        />
      ) : schools.length > 1 && !schoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบน"
          icon={PAGE_ICON}
          title="เลือกโรงเรียน"
        />
      ) : !selectedTerm ? (
        <EmptyState
          description="เพิ่มภาคเรียนในหน้าจัดการภาคเรียนและห้องเรียนก่อน"
          icon={PAGE_ICON}
          title="ยังไม่มีภาคเรียน"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            search || gradeInput || linkStatusInput || homeroomInput
              ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
              : "ยังไม่มีห้องเรียนในภาคเรียนนี้"
          }
          icon={PAGE_ICON}
          title="ไม่พบห้องเรียน"
        />
      ) : (
        <>
          <ClassroomLinksTable
            onCopy={(row) => void handleCopy(row)}
            onCreate={(row) => void createLinks([row.classroomId])}
            onDeactivate={(row) => void handleDeactivate(row)}
            onResendLine={(row) => void handleResendLine(row)}
            onRotate={(row) => void handleRotate(row)}
            onSelectionChange={setSelected}
            pending={pending}
            rows={rows}
            selected={selected}
          />
          <Pagination
            onPageChange={(value) => {
              setPage(value);
              setSelected(new Set());
            }}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
              setSelected(new Set());
            }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={linksQuery.data?.meta.total ?? 0}
            unitLabel="ห้อง"
          />
        </>
      )}

      <LinkShareDialog
        description="ลิงก์นี้เปิดได้เฉพาะห้องเรียนที่กำหนด ครูที่ active ในโรงเรียนต้องยืนยันตัวตนก่อนเช็กชื่อ"
        link={sharedUrl ?? ""}
        onOpenChange={(open) => {
          if (!open) setSharedUrl(null);
        }}
        open={Boolean(sharedUrl)}
        title="คัดลอกหรือแชร์ลิงก์ห้องเรียน"
      />
      {confirmDialog}
    </PageShell>
  );
}
