import {
  ErrorState,
  PageShell,
  SkeletonCards,
} from "../../../components/layout/page-primitives";
import { DataExportCard } from "../components/DataExportCard";
import { HelpStatusPanel } from "../components/HelpStatusPanel";
import { OverviewSummaryCards } from "../components/OverviewSummaryCards";
import { ResolvedHelpCard } from "../components/ResolvedHelpCard";
import { UserOverviewCard } from "../components/UserOverviewCard";
import { useCurrentUserPresentation } from "../hooks/useCurrentUserPresentation";
import { useOverviewStats } from "../hooks/useOverviewStats";

export function MainPage() {
  const { displayName, roleLabel, initials, affiliation } =
    useCurrentUserPresentation();
  const { overviewData, isLoading, isError, refetch } = useOverviewStats();

  return (
    <PageShell>
      <div className="space-y-5">
        <UserOverviewCard
          affiliation={affiliation}
          displayName={displayName}
          initials={initials}
          roleLabel={roleLabel}
        />

        {isLoading ? (
          <>
            <SkeletonCards count={3} />
            <SkeletonCards count={3} />
          </>
        ) : isError ? (
          <ErrorState
            title="ไม่สามารถโหลดข้อมูลภาพรวมได้"
            description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลสรุปภาพรวม"
            onRetry={refetch}
          />
        ) : (
          <>
            <OverviewSummaryCards overviewData={overviewData} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <HelpStatusPanel
                inProgress={overviewData.helpStats.inProgress}
                waiting={overviewData.helpStats.waiting}
              />
              <ResolvedHelpCard resolved={overviewData.helpStats.resolved} />
              <DataExportCard />
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
