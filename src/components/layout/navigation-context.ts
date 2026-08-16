import { useCallback } from "react";
import {
  useLocation,
  useNavigate,
  type Location,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import { MENU_ITEMS } from "../../features/auth/lib/permissions";
import { collectMenuRoutes } from "./menu-routes";
import { getPageIdentity } from "./page-identity";
import { getPageTitle } from "./page-title";

const NAVIGATION_CONTEXT_KEY = "stsNavigationContext";
const MAX_TRAIL_LENGTH = 8;
const AUTH_MENU_ROUTES = collectMenuRoutes(MENU_ITEMS);

export interface NavigationCrumb {
  label: string;
  to: string;
}

export interface AppNavigationContext {
  backTo: string;
  menuRoute: string | null;
  trail: NavigationCrumb[];
}

type StateRecord = Record<string, unknown>;

function isStateRecord(value: unknown): value is StateRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isSafeAppPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !Array.from(value).some((character) => character.charCodeAt(0) < 32)
  );
}

function isBearerCredentialPath(pathname: string): boolean {
  return pathname.startsWith("/task/") || pathname.startsWith("/login/magic/");
}

function routeMatchesPathname(route: string, pathname: string): boolean {
  return (
    route === pathname || (route !== "/" && pathname.startsWith(`${route}/`))
  );
}

function findBestMatchingRoute(
  pathname: string,
  routes: readonly string[],
): string | null {
  return routes.reduce<string | null>((best, route) => {
    if (!routeMatchesPathname(route, pathname)) return best;
    return best === null || route.length > best.length ? route : best;
  }, null);
}

export function getDefaultMenuRoute(pathname: string): string | undefined {
  if (pathname.startsWith("/teacher-access/timetable")) {
    return "/teacher-access/timetable";
  }
  if (pathname.startsWith("/teacher-access")) {
    return "/teacher-access";
  }
  return findBestMatchingRoute(pathname, AUTH_MENU_ROUTES) ?? undefined;
}

const EXACT_ROUTE_LABELS: Record<string, string> = {
  "/attendance/roster": "เช็กชื่อ",
  "/attendance/check-in": "เช็กชื่อ",
  "/attendance/history": "ประวัติการเช็กชื่อ",
  "/attendance/history/attendance": "ประวัติการเช็กชื่อ",
  "/attendance/history/imports": "ประวัติการเช็กชื่อ",
  "/attendance/history/delegations": "ประวัติการเช็กชื่อ",
  "/data-exports/history": "ประวัติการส่งออก",
  "/import-data/history": "ประวัติการนำเข้า",
  "/import-data/quarantine": "รายการรอตรวจสอบ",
  "/settings/master-data-lookups": "ข้อมูลพื้นฐาน",
  "/settings/student-statuses": "สถานะนักเรียน",
  "/students/export": "ส่งออกข้อมูลนักเรียน",
  "/students/history": "ประวัติรายชื่อนักเรียน",
};

export function getNavigationLabel(
  pathname: string,
  fallback?: string,
): string {
  const exactLabel = EXACT_ROUTE_LABELS[pathname];
  if (exactLabel) return exactLabel;
  if (/^\/students\/[^/]+\/edit$/.test(pathname)) return "แก้ไขข้อมูลนักเรียน";
  if (/^\/students\/[^/]+$/.test(pathname)) return "ข้อมูลนักเรียน";
  if (/^\/cases\/[^/]+\/reviews\/[^/]+$/.test(pathname)) {
    return "รายละเอียดผลการพิจารณา";
  }
  if (/^\/cases\/[^/]+$/.test(pathname)) return "ติดตามนักเรียน";
  if (/^\/attendance\/record\/[^/]+$/.test(pathname))
    return "บันทึกการเช็กชื่อ";
  if (/^\/classrooms\/[^/]+$/.test(pathname)) return "รายละเอียดห้องเรียน";
  if (/^\/import-data\/quarantine\/[^/]+$/.test(pathname)) {
    return "รายละเอียดรายการนำเข้า";
  }
  if (pathname === "/manage-users/new") return "เพิ่มผู้ใช้งาน";
  if (/^\/manage-users\/[^/]+\/edit(?:\/permissions)?$/.test(pathname)) {
    return "แก้ไขผู้ใช้งาน";
  }
  if (/^\/manage-users\/[^/]+(?:\/permissions)?$/.test(pathname)) {
    return "รายละเอียดผู้ใช้งาน";
  }
  if (/^\/curriculum\/[^/]+\/subjects\/new$/.test(pathname))
    return "เพิ่มรายวิชา";
  if (/^\/curriculum\/[^/]+\/subjects\/[^/]+\/edit$/.test(pathname)) {
    return "แก้ไขรายวิชา";
  }
  if (/^\/curriculum\/[^/]+$/.test(pathname)) return "รายวิชาในระดับชั้น";
  if (pathname === "/manage-teachers/new") return "เพิ่มข้อมูลคุณครู";
  if (/^\/manage-teachers\/[^/]+\/edit$/.test(pathname))
    return "แก้ไขข้อมูลคุณครู";
  if (pathname === "/manage-role-groups/new") return "เพิ่มกลุ่มเมนู";
  if (/^\/manage-role-groups\/[^/]+\/edit$/.test(pathname))
    return "แก้ไขกลุ่มเมนู";
  if (/^\/audit-log\/[^/]+$/.test(pathname)) return "รายละเอียดบันทึกการใช้งาน";
  if (/^\/tasks\/[^/]+$/.test(pathname)) return "รายละเอียดภารกิจ";
  if (/^\/teacher-access\/classes\/[^/]+\/students\/[^/]+$/.test(pathname)) {
    return "ข้อมูลนักเรียน";
  }
  if (/^\/teacher-access\/classes\/[^/]+\/history$/.test(pathname)) {
    return "ประวัติการเช็กชื่อ";
  }
  return fallback || getPageTitle(pathname);
}

function identityCrumb(route: string): NavigationCrumb {
  return {
    label: getPageIdentity(route)?.title ?? getNavigationLabel(route),
    to: route,
  };
}

function getDynamicParentCrumbs(pathname: string): NavigationCrumb[] | null {
  const caseDetail = /^\/cases\/[^/]+$/.exec(pathname);
  if (caseDetail) {
    // A case detail is opened from the student-status report. Keep that
    // origin even for a direct reload so its child student profile retains
    // the same report → case breadcrumb/back chain.
    return [
      {
        label: "รายงานสถานะนักเรียน",
        to: "/student-risk-report/risk",
      },
    ];
  }

  const importQuarantine = /^\/import-data\/quarantine\/([^/]+)$/.exec(
    pathname,
  );
  if (importQuarantine) {
    return [
      identityCrumb("/import-data"),
      { label: "รายการรอตรวจสอบ", to: "/import-data/quarantine" },
    ];
  }

  const studentEdit = /^\/students\/([^/]+)\/edit$/.exec(pathname);
  if (studentEdit) {
    return [
      identityCrumb("/students"),
      { label: "ข้อมูลนักเรียน", to: `/students/${studentEdit[1]}` },
    ];
  }

  const caseReview = /^\/cases\/([^/]+)\/reviews\/[^/]+$/.exec(pathname);
  if (caseReview) {
    return [
      { label: "รายงานสถานะนักเรียน", to: "/student-risk-report/risk" },
      { label: "ติดตามนักเรียน", to: `/cases/${caseReview[1]}` },
    ];
  }

  const userEdit = /^\/manage-users\/([^/]+)\/edit(?:\/permissions)?$/.exec(
    pathname,
  );
  if (userEdit) {
    return [
      identityCrumb("/manage-users"),
      { label: "รายละเอียดผู้ใช้งาน", to: `/manage-users/${userEdit[1]}` },
    ];
  }

  const curriculumSubject =
    /^\/curriculum\/([^/]+)\/subjects\/(?:new|[^/]+\/edit)$/.exec(pathname);
  if (curriculumSubject) {
    return [
      identityCrumb("/curriculum"),
      {
        label: "รายวิชาในระดับชั้น",
        to: `/curriculum/${curriculumSubject[1]}`,
      },
    ];
  }

  const teacherStudent =
    /^\/teacher-access\/classes\/([^/]+)\/students\/[^/]+$/.exec(pathname);
  const teacherHistory = /^\/teacher-access\/classes\/([^/]+)\/history$/.exec(
    pathname,
  );
  const assignmentId = teacherStudent?.[1] ?? teacherHistory?.[1];
  if (assignmentId) {
    return [
      { label: "ห้องเรียนของฉัน", to: "/teacher-access" },
      {
        label: "ห้องเรียน",
        to: `/teacher-access/classes/${assignmentId}/roster`,
      },
    ];
  }

  return null;
}

export function getDefaultParentCrumbs(pathname: string): NavigationCrumb[] {
  const dynamic = getDynamicParentCrumbs(pathname);
  if (dynamic) return dynamic;

  const menuRoute = getDefaultMenuRoute(pathname);
  if (menuRoute && menuRoute !== pathname) {
    return [identityCrumb(menuRoute)];
  }
  return [];
}

function sanitizeCrumb(value: unknown): NavigationCrumb | null {
  if (!isStateRecord(value)) return null;
  const { label, to } = value;
  if (typeof label !== "string" || !label.trim() || !isSafeAppPath(to))
    return null;
  return { label: label.trim(), to };
}

export function getNavigationContext(
  state: unknown,
): AppNavigationContext | null {
  if (!isStateRecord(state)) return null;
  const value = state[NAVIGATION_CONTEXT_KEY];
  if (
    !isStateRecord(value) ||
    !isSafeAppPath(value.backTo) ||
    !Array.isArray(value.trail)
  ) {
    return null;
  }
  const trail = value.trail
    .map(sanitizeCrumb)
    .filter((crumb): crumb is NavigationCrumb => crumb !== null)
    .slice(-MAX_TRAIL_LENGTH);
  const menuRoute =
    value.menuRoute === null
      ? null
      : isSafeAppPath(value.menuRoute)
        ? value.menuRoute
        : null;
  return { backTo: value.backTo, menuRoute, trail };
}

function currentAppPath(location: Location): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

function dedupeTrail(trail: NavigationCrumb[]): NavigationCrumb[] {
  const result: NavigationCrumb[] = [];
  for (const crumb of trail) {
    // A list/detail flow can add the same semantic page twice: once as the
    // menu parent and once as the filtered source URL. Keep the latter so a
    // back action restores its query filters instead of showing duplicate text.
    const existingIndex = result.findIndex(
      (item) => item.to === crumb.to || item.label === crumb.label,
    );
    if (existingIndex >= 0) result.splice(existingIndex, 1);
    result.push(crumb);
  }
  return result.slice(-MAX_TRAIL_LENGTH);
}

export function createContextualNavigationState(
  location: Location,
  existingState?: unknown,
): StateRecord | unknown {
  if (isBearerCredentialPath(location.pathname)) return existingState;

  const inherited = getNavigationContext(location.state);
  const sourcePath = currentAppPath(location);
  const sourceCrumb: NavigationCrumb = {
    label: getNavigationLabel(location.pathname),
    to: sourcePath,
  };
  const isAttendanceTab =
    location.pathname === "/attendance/roster" ||
    location.pathname === "/attendance/check-in";
  const trail = dedupeTrail([
    ...(inherited?.trail ?? getDefaultParentCrumbs(location.pathname)),
    ...(isAttendanceTab ? [] : [sourceCrumb]),
  ]);
  const context: AppNavigationContext = {
    backTo: sourcePath,
    menuRoute: inherited
      ? inherited.menuRoute
      : (getDefaultMenuRoute(location.pathname) ?? null),
    trail,
  };
  return {
    ...(isStateRecord(existingState) ? existingState : {}),
    [NAVIGATION_CONTEXT_KEY]: context,
  };
}

/**
 * Breadcrumb links move back through an existing trail. Unlike a normal
 * detail link, they must not append the current page to that trail; doing so
 * loses the filtered report URL after a profile → case → report round trip.
 */
export function createBreadcrumbNavigationState(
  location: Location,
  destination: string,
): StateRecord | undefined {
  const inherited = getNavigationContext(location.state);
  if (!inherited) return undefined;

  const destinationIndex = inherited.trail.findIndex(
    (crumb) => crumb.to === destination,
  );
  if (destinationIndex < 0) return undefined;

  const trail = inherited.trail.slice(0, destinationIndex);
  return {
    [NAVIGATION_CONTEXT_KEY]: {
      backTo: trail.at(-1)?.to ?? "/",
      menuRoute: inherited.menuRoute,
      trail,
    } satisfies AppNavigationContext,
  };
}

export function getContextualCrumbs(location: Location): NavigationCrumb[] {
  return getNavigationContext(location.state)?.trail ?? [];
}

export function getSafeBackTarget(location: Location): To {
  const contextualBack = getNavigationContext(location.state)?.backTo;
  if (contextualBack && contextualBack !== currentAppPath(location))
    return contextualBack;

  const studentEdit = /^\/students\/([^/]+)\/edit$/.exec(location.pathname);
  if (studentEdit) return `/students/${studentEdit[1]}`;
  const userEdit = /^\/manage-users\/([^/]+)\/edit(?:\/permissions)?$/.exec(
    location.pathname,
  );
  if (userEdit) return `/manage-users/${userEdit[1]}`;
  const caseReview = /^\/cases\/([^/]+)\/reviews\/[^/]+$/.exec(
    location.pathname,
  );
  if (caseReview) return `/cases/${caseReview[1]}`;
  const teacherChild =
    /^\/teacher-access\/classes\/([^/]+)\/(?:students\/[^/]+|history)$/.exec(
      location.pathname,
    );
  if (teacherChild) return `/teacher-access/classes/${teacherChild[1]}`;

  const parents = getDefaultParentCrumbs(location.pathname);
  return parents.at(-1)?.to ?? "/";
}

export function useContextualNavigationState(
  existingState?: unknown,
): StateRecord | unknown {
  const location = useLocation();
  return createContextualNavigationState(location, existingState);
}

export function useContextualNavigate(): (
  to: To,
  options?: NavigateOptions,
) => void {
  const location = useLocation();
  const navigate = useNavigate();
  return useCallback(
    (to: To, options?: NavigateOptions) => {
      navigate(to, {
        ...options,
        state: createContextualNavigationState(location, options?.state),
      });
    },
    [location, navigate],
  );
}

export function useSafeBackTarget(): To {
  return getSafeBackTarget(useLocation());
}
