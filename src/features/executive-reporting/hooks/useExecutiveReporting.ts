import { useQuery } from "@tanstack/react-query";
import { fetchExecutiveReportingOverview } from "../api/executive-reporting.service";
import type {
  ExecutiveReportingFilters,
  ExecutiveReportingOption,
} from "../types/executive-reporting.types";

const QUERY_KEY = "executive-reporting";

export function useExecutiveReportingOverview(
  filters: ExecutiveReportingFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: [QUERY_KEY, "overview", filters],
    queryFn: () => fetchExecutiveReportingOverview(filters),
    enabled,
    staleTime: 60_000,
  });
}

function uniqueOptions(
  options: ExecutiveReportingOption[],
): ExecutiveReportingOption[] {
  return Array.from(
    new Map(options.map((option) => [option.value, option])).values(),
  ).sort((left, right) => left.label.localeCompare(right.label, "th"));
}

interface ExecutiveAreaOptionsInput {
  enabled?: boolean;
  province?: string;
  district?: string;
  from?: string;
  to?: string;
}

export function useExecutiveAreaOptions(input: ExecutiveAreaOptionsInput) {
  const enabled = input.enabled ?? true;
  const period = { from: input.from, to: input.to };
  const provincesQuery = useExecutiveReportingOverview(
    { groupBy: "PROVINCE", ...period },
    enabled,
  );
  const districtsQuery = useExecutiveReportingOverview(
    {
      groupBy: "DISTRICT",
      province: input.province,
      ...period,
    },
    enabled && Boolean(input.province),
  );
  const schoolsQuery = useExecutiveReportingOverview(
    {
      groupBy: "SCHOOL",
      province: input.province,
      district: input.district,
      ...period,
    },
    enabled && Boolean(input.province && input.district),
  );

  const provinces = uniqueOptions(
    (provincesQuery.data?.areas ?? []).flatMap((area) =>
      area.province ? [{ label: area.province, value: area.province }] : [],
    ),
  );
  const districts = uniqueOptions(
    (districtsQuery.data?.areas ?? []).flatMap((area) =>
      area.district ? [{ label: area.district, value: area.district }] : [],
    ),
  );
  const schools = uniqueOptions(
    (schoolsQuery.data?.areas ?? []).flatMap((area) =>
      area.schoolId !== null && area.schoolName
        ? [{ label: area.schoolName, value: String(area.schoolId) }]
        : [],
    ),
  );

  return {
    provinces,
    districts,
    schools,
    isFetching:
      provincesQuery.isFetching ||
      districtsQuery.isFetching ||
      schoolsQuery.isFetching,
    isError:
      provincesQuery.isError || districtsQuery.isError || schoolsQuery.isError,
    refetch: async () => {
      const requests = [provincesQuery.refetch()];
      if (input.province) {
        requests.push(districtsQuery.refetch());
      }
      if (input.province && input.district) {
        requests.push(schoolsQuery.refetch());
      }
      await Promise.all(requests);
    },
  };
}
