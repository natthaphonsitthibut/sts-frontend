import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { DataTableSortState } from "../components/layout/data-table";

type SearchParamValue = string | number | boolean | null | undefined;

function serializeEntries(
  values: Readonly<Record<string, SearchParamValue>>,
): string {
  return JSON.stringify(
    Object.entries(values)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, value == null ? "" : String(value)]),
  );
}

/**
 * Keeps list/report controls in the URL so a contextual detail navigation,
 * browser Back and a refresh all restore the same view. Empty/default values
 * are removed and updates replace the current history entry. Callers must not
 * pass free-text values that may contain names, identifiers or other PII.
 */
export function useSyncedSearchParams(
  values: Readonly<Record<string, SearchParamValue>>,
): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const serializedEntries = serializeEntries(values);

  useEffect(() => {
    const entries = JSON.parse(serializedEntries) as [string, string][];
    const preview = new URLSearchParams(searchParams);
    for (const [key, value] of entries) {
      if (value) preview.set(key, value);
      else preview.delete(key);
    }
    if (preview.toString() === searchParams.toString()) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of entries) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }, [searchParams, serializedEntries, setSearchParams]);
}

export function readOptionalPositiveIntegerSearchParam(
  searchParams: URLSearchParams,
  key: string,
): number | undefined {
  const value = Number(searchParams.get(key));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export function readPositiveIntegerSearchParam(
  searchParams: URLSearchParams,
  key: string,
  fallback: number,
): number {
  return readOptionalPositiveIntegerSearchParam(searchParams, key) ?? fallback;
}

export function readIsoDateSearchParam(
  searchParams: URLSearchParams,
  key: string,
  fallback = "",
): string {
  const value = searchParams.get(key) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : fallback;
}

export function readBooleanSearchParam(
  searchParams: URLSearchParams,
  key: string,
  fallback: boolean,
): boolean {
  const value = searchParams.get(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function readSortSearchParam(
  searchParams: URLSearchParams,
  key: string,
  allowedKeys: readonly string[],
  fallback?: DataTableSortState,
): DataTableSortState | undefined {
  const [sortKey, direction] = (searchParams.get(key) ?? "").split(":");
  if (
    allowedKeys.includes(sortKey) &&
    (direction === "asc" || direction === "desc")
  ) {
    return { key: sortKey, direction };
  }
  return fallback;
}

export function serializeSortSearchParam(
  sort: DataTableSortState | undefined,
  fallback?: DataTableSortState,
): string | undefined {
  if (!sort) return undefined;
  if (sort.key === fallback?.key && sort.direction === fallback.direction) {
    return undefined;
  }
  return `${sort.key}:${sort.direction}`;
}
