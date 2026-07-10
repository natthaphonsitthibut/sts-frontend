import type { BadgeProps } from "../../../components/base";
import { formatThaiDateTime } from "../../../lib/date-time";
import { isLinkLocked } from "../../../lib/link-lock";
import { findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import type { VisitLink, VisitLinkState } from "../types/visit-links.types";

type VisitLinkLockInput = Pick<VisitLink, "admin_locked">;
type VisitLinkStateInput = Pick<
  VisitLink,
  "admin_locked" | "expires_at" | "opens_at" | "link_state"
>;

export function isVisitLinkLocked(link: VisitLinkLockInput): boolean {
  return isLinkLocked(link.admin_locked);
}

interface VisitLinkStatusMeta {
  label: string;
  variant: BadgeProps["variant"];
}

export function getVisitLinkState(link: VisitLinkStateInput): VisitLinkState {
  // Prefer the server-computed state (it already accounts for opens_at/expiry);
  // fall back to the local heuristic for payloads without link_state.
  if (
    link.link_state === "ACTIVE" ||
    link.link_state === "LOCKED" ||
    link.link_state === "EXPIRED" ||
    link.link_state === "SCHEDULED"
  ) {
    return link.link_state;
  }
  const expiresAt = new Date(link.expires_at);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    return "EXPIRED";
  }
  if (isVisitLinkLocked(link)) {
    return "LOCKED";
  }
  if (link.opens_at) {
    const opensAt = new Date(link.opens_at);
    if (!Number.isNaN(opensAt.getTime()) && opensAt.getTime() > Date.now()) {
      return "SCHEDULED";
    }
  }
  return "ACTIVE";
}

function statusMeta(
  catalog: readonly StatusCatalogItem[],
  code: string,
): VisitLinkStatusMeta {
  const item = findStatusCatalogItem(catalog, code);
  return { label: item?.label ?? code, variant: item?.badgeVariant ?? "secondary" };
}

export function getVisitLinkStateMeta(
  link: VisitLinkStateInput,
  catalog: readonly StatusCatalogItem[],
): VisitLinkStatusMeta {
  return statusMeta(catalog, getVisitLinkState(link));
}

export function formatVisitLinkDateTime(value: string): string {
  return formatThaiDateTime(value);
}
