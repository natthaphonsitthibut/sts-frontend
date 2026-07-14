import type {
  DataExportCatalogItem,
  DataExportFilterDefinition,
} from "../types/data-export.types";

type ExportContextValue = string | number | null | undefined;

interface AreaFilters {
  province?: ExportContextValue;
  district?: ExportContextValue;
  subDistrict?: ExportContextValue;
  schoolId?: ExportContextValue;
}

export interface DataExportContextFilters {
  student_roster_basic: AreaFilters & {
    grade?: ExportContextValue;
    room?: ExportContextValue;
  };
  student_risk: AreaFilters & {
    grade?: ExportContextValue;
    room?: ExportContextValue;
    riskTier?: ExportContextValue;
  };
  attendance_summary: AreaFilters & {
    grade?: ExportContextValue;
    room?: ExportContextValue;
    dateFrom?: ExportContextValue;
    dateTo?: ExportContextValue;
  };
  case_summary: AreaFilters & {
    status?: ExportContextValue;
    dateFrom?: ExportContextValue;
    dateTo?: ExportContextValue;
  };
}

export type DataExportContextDataset = keyof DataExportContextFilters;

export interface ParsedDataExportContext {
  datasetCode: string;
  filters: Record<string, string>;
}

export function buildDataExportContextUrl<Dataset extends DataExportContextDataset>(
  dataset: Dataset,
  filters: DataExportContextFilters[Dataset],
): string {
  const params = new URLSearchParams({ dataset });
  for (const [key, rawValue] of Object.entries(filters)) {
    if (rawValue === null || rawValue === undefined) continue;
    const value = String(rawValue).trim();
    if (value) params.set(key, value);
  }
  return `/data-exports?${params.toString()}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateFilterValue(
  definition: DataExportFilterDefinition,
  rawValue: string | null,
): string | null {
  const value = rawValue?.trim() ?? "";
  if (!value) return null;

  if (definition.control === "INTEGER") {
    if (!/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647
      ? String(parsed)
      : null;
  }
  if (definition.control === "DATE") {
    return isValidDate(value) ? value : null;
  }
  if (definition.control === "SELECT") {
    return definition.options?.some((option) => option.value === value)
      ? value
      : null;
  }
  return value.length <= 100 ? value : null;
}

export function parseDataExportContext(
  searchParams: URLSearchParams,
  catalog: DataExportCatalogItem[],
): ParsedDataExportContext | null {
  const datasetCode = searchParams.get("dataset")?.trim();
  if (!datasetCode) return null;

  const dataset = catalog.find(
    (item) =>
      item.code === datasetCode &&
      item.status === "AVAILABLE" &&
      item.deliveryMode === "ASYNC_JOB",
  );
  if (!dataset) return null;

  const filters: Record<string, string> = {};
  for (const definition of dataset.filterDefinitions) {
    const value = validateFilterValue(
      definition,
      searchParams.get(definition.key),
    );
    if (value !== null) filters[definition.key] = value;
  }

  for (const definition of dataset.filterDefinitions) {
    if (
      definition.dependsOn &&
      definition.key in filters &&
      !(definition.dependsOn in filters)
    ) {
      delete filters[definition.key];
    }
  }

  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    delete filters.dateFrom;
    delete filters.dateTo;
  }

  return { datasetCode: dataset.code, filters };
}
