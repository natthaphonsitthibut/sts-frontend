export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedSearchQuery extends PaginationParams {
  searchTerm?: string;
}

interface PaginatedEnvelope<T> {
  data?: T[];
  meta?: PaginationMeta;
}

/** Serialize page/limit into query-string params (omitting unset values). */
export function toPaginationParams(
  params: PaginationParams,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof params.page === "number") {
    result.page = String(params.page);
  }
  if (typeof params.limit === "number") {
    result.limit = String(params.limit);
  }
  return result;
}

/**
 * Normalize a list response into `{ items, meta }`, tolerating either a raw
 * array (legacy/unpaginated) or the `{ data, meta }` envelope. Falls back to a
 * derived meta when the server doesn't send one.
 */
export function normalizePaginatedResponse<T>(
  body: T[] | PaginatedEnvelope<T> | null | undefined,
  requested: PaginationParams = {},
): PaginatedResult<T> {
  const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  const meta = Array.isArray(body) ? undefined : body?.meta;

  const limit = meta?.limit ?? requested.limit ?? DEFAULT_PAGE_SIZE;
  const page = meta?.page ?? requested.page ?? DEFAULT_PAGE;
  const totalCount = meta?.totalCount ?? items.length;

  return {
    items,
    meta: {
      ...meta,
      page,
      limit,
      totalCount,
      totalPages: meta?.totalPages ?? (limit > 0 ? Math.ceil(totalCount / limit) : 0),
    },
  };
}
