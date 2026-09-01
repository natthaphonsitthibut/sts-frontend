import { ChartEmptyState, PanelSection } from "./ChartCard";
import type { HomeDashboardProblemAreaMatrix } from "../types/home-dashboard.types";

interface ProblemAreaMatrixCardProps {
  matrix: HomeDashboardProblemAreaMatrix;
}

function intensityStyle(count: number, max: number) {
  if (count === 0) return undefined;
  // One hue, opacity carrying the magnitude, so the table reads as a single
  // ordered scale instead of a set of unrelated colors.
  return {
    backgroundColor: `color-mix(in srgb, var(--color-chart-1) ${Math.round(
      20 + (count / Math.max(max, 1)) * 60,
    )}%, transparent)`,
  };
}

/**
 * ประเภทปัญหาแยกตามพื้นที่ — the national totals above cannot say where to send
 * people; this can.
 */
export function ProblemAreaMatrixSection({
  matrix,
}: ProblemAreaMatrixCardProps) {
  const max = Math.max(
    ...matrix.rows.flatMap((row) => Object.values(row.counts)),
    1,
  );

  return (
    <PanelSection
      description={`จำนวนนักเรียนแยกตามประเภทปัญหาใน${matrix.dimensionLabel}ที่พบมากที่สุด`}
      title={`ประเภทปัญหาราย${matrix.dimensionLabel}`}
    >
      <div data-problem-area-matrix={matrix.dimension}>
        {matrix.rows.length === 0 || matrix.categories.length === 0 ? (
          <ChartEmptyState message="ยังไม่มีผลการติดตามที่ระบุประเภทปัญหาในขอบเขตนี้" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold text-slate-700">
                    {matrix.dimensionLabel}
                  </th>
                  {matrix.categories.map((category) => (
                    <th
                      className="px-3 py-2 text-center text-xs font-semibold text-slate-600"
                      key={category.key}
                      scope="col"
                    >
                      {category.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                    รวม
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr className="border-t border-slate-100" key={row.key}>
                    <th
                      className="sticky left-0 z-10 truncate bg-white px-3 py-2 text-left font-medium text-slate-800"
                      scope="row"
                    >
                      {row.label}
                    </th>
                    {matrix.categories.map((category) => {
                      const count = row.counts[category.key] ?? 0;
                      return (
                        <td
                          className="px-3 py-2 text-center tabular-nums text-slate-800"
                          key={category.key}
                          style={intensityStyle(count, max)}
                        >
                          {count === 0 ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            count.toLocaleString("th-TH")
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900">
                      {row.total.toLocaleString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PanelSection>
  );
}
