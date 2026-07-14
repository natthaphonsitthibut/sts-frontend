import { BarChart3, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonCards,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { ExecutiveAreaTable } from "../components/ExecutiveAreaTable";
import { ExecutiveReportingFilters } from "../components/ExecutiveReportingFilters";
import { ExecutiveReportingSummary } from "../components/ExecutiveReportingSummary";
import {
  useExecutiveAreaOptions,
  useExecutiveReportingOverview,
} from "../hooks/useExecutiveReporting";
import type { ExecutiveReportingGroup } from "../types/executive-reporting.types";

function toApiDate(
  date: string,
  boundary: "start" | "end",
): string | undefined {
  if (!date) return undefined;
  return boundary === "start"
    ? `${date}T00:00:00.000+07:00`
    : `${date}T23:59:59.999+07:00`;
}

export function ExecutiveReportingPage() {
  const [groupBy, setGroupBy] = useState<ExecutiveReportingGroup>("PROVINCE");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const from = toApiDate(fromDate, "start");
  const to = toApiDate(toDate, "end");
  const invalidPeriod = Boolean(fromDate && toDate && fromDate > toDate);

  const overviewQuery = useExecutiveReportingOverview(
    {
      groupBy,
      province: province || undefined,
      district: district || undefined,
      schoolId: schoolId ? Number(schoolId) : undefined,
      from,
      to,
    },
    !invalidPeriod,
  );
  const areaOptions = useExecutiveAreaOptions({
    enabled: !invalidPeriod,
    province: province || undefined,
    district: district || undefined,
    from,
    to,
  });

  function handleProvinceChange(value: string) {
    setProvince(value);
    setDistrict("");
    setSchoolId("");
    if (!value && groupBy !== "PROVINCE") setGroupBy("PROVINCE");
  }

  function resetFilters() {
    setGroupBy("PROVINCE");
    setProvince("");
    setDistrict("");
    setSchoolId("");
    setFromDate("");
    setToDate("");
  }

  const overview = overviewQuery.data;

  return (
    <PageShell>
      <PageToolbar
        actions={
          <Button
            disabled={invalidPeriod}
            icon={RefreshCw}
            isLoading={overviewQuery.isFetching}
            loadingIconMotion="refresh"
            onClick={() => void overviewQuery.refetch()}
            variant="outline"
          >
            รีเฟรช
          </Button>
        }
        description="ติดตามนักเรียน ความเสี่ยง และสถานะเคสแบบข้อมูลรวมตามขอบเขตที่ได้รับอนุญาต"
        icon={BarChart3}
        title="รายงานภาพรวมผู้บริหาร"
      >
        <ExecutiveReportingFilters
          district={district}
          districts={areaOptions.districts}
          fromDate={fromDate}
          groupBy={groupBy}
          isFetchingOptions={areaOptions.isFetching}
          onDistrictChange={(value) => {
            setDistrict(value);
            setSchoolId("");
          }}
          onFromDateChange={setFromDate}
          onGroupByChange={setGroupBy}
          onProvinceChange={handleProvinceChange}
          onReset={resetFilters}
          onSchoolChange={setSchoolId}
          onToDateChange={setToDate}
          province={province}
          provinces={areaOptions.provinces}
          schoolId={schoolId}
          schools={areaOptions.schools}
          toDate={toDate}
        />
      </PageToolbar>

      <div className="mb-4 flex items-start gap-2 text-sm text-slate-600">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p>
          หน้านี้อ่านอย่างเดียวและไม่แสดงรายชื่อนักเรียนหรือข้อความบันทึกรายบุคคล
        </p>
      </div>

      {invalidPeriod ? (
        <Alert className="mb-4" variant="destructive">
          <AlertTitle>ช่วงเวลาไม่ถูกต้อง</AlertTitle>
          <AlertDescription>
            วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด
          </AlertDescription>
        </Alert>
      ) : null}

      {areaOptions.isError ? (
        <Alert className="mb-4" variant="warning">
          <AlertTitle>โหลดตัวเลือกพื้นที่ไม่ครบ</AlertTitle>
          <AlertDescription>
            รายงานยังใช้งานได้ แต่ตัวเลือกจังหวัด อำเภอ
            หรือโรงเรียนบางส่วนอาจไม่ครบ
          </AlertDescription>
          <Button
            className="mt-3"
            onClick={() => void areaOptions.refetch()}
            size="sm"
            variant="outline"
          >
            โหลดตัวเลือกใหม่
          </Button>
        </Alert>
      ) : null}

      {overviewQuery.isLoading ? (
        <div className="space-y-5">
          <SkeletonCards count={4} />
          <SkeletonTable rows={5} />
        </div>
      ) : overviewQuery.isError ? (
        <ErrorState
          description="ไม่สามารถโหลดข้อมูลรวมในขอบเขตนี้ได้ กรุณาลองใหม่"
          onRetry={() => void overviewQuery.refetch()}
          title="โหลดรายงานไม่สำเร็จ"
        />
      ) : overview && overview.areas.length === 0 ? (
        <Card className="border-dashed border-slate-300 p-8 text-center">
          <h2 className="font-semibold text-slate-900">
            ยังไม่มีข้อมูลรวมในขอบเขตนี้
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            ลองขยายพื้นที่หรือช่วงเวลา โดยระบบจะยังคงตรวจสิทธิ์ตามบัญชีปัจจุบัน
          </p>
          <Button
            className="mt-4"
            onClick={resetFilters}
            size="sm"
            variant="outline"
          >
            ล้างตัวกรอง
          </Button>
        </Card>
      ) : overview ? (
        <div aria-busy={overviewQuery.isFetching} className="space-y-5">
          <ExecutiveReportingSummary
            minimumCellSize={overview.suppression.minimumCellSize}
            summary={overview.summary}
          />
          <ExecutiveAreaTable areas={overview.areas} />
        </div>
      ) : null}
    </PageShell>
  );
}
