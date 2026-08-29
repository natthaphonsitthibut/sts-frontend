import { useState } from "react";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import type { ScopeSummaryInput } from "../../../lib/scope-presentation";
import type { useSchoolAreaFilter } from "./useSchoolAreaFilter";
import type { useScopeCascade } from "./useScopeCascade";

type AreaInput = Pick<
  ReturnType<typeof useSchoolAreaFilter>,
  "province" | "district" | "subDistrict" | "filteredSchools"
>;

type ScopeInput = Pick<
  ReturnType<typeof useScopeCascade>,
  "schoolId" | "grade" | "room"
>;

/**
 * The two cascade hooks, restated as the levels worth showing on the page.
 *
 * Only the school needs resolving: the cascade carries its id, while the name
 * lives in whichever list the page happens to be holding. Three sources, in
 * order of freshness — the school list on screen, the name remembered from the
 * last time it was on screen (the server-side list is a search result, so
 * typing a new term drops the selected school straight out of it), and the
 * actor's own scope labels, which is where a locked teacher's single school
 * comes from. Falling through all three would leave the summary claiming a
 * nationwide view while a school is in fact selected, so the id is kept as a
 * last resort rather than nothing.
 */
export function useScopeSummary(
  area: AreaInput,
  scope: ScopeInput,
): ScopeSummaryInput {
  const scopeLabels = useAuthSessionStore(
    (state) => state.user?.data_scope_labels,
  );
  // Adjust-state-during-render (same pattern as Sheet's closing flag): the
  // remembered name has to be up to date in *this* render, since an effect
  // would land a frame after the summary already rendered the fallback.
  const [remembered, setRemembered] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const listedName = area.filteredSchools.find(
    (school) => String(school.id) === scope.schoolId,
  )?.name;
  const lockedName = scopeLabels?.schools?.find(
    (school) => String(school.id) === scope.schoolId,
  )?.name;
  if (
    scope.schoolId &&
    listedName &&
    (remembered?.id !== scope.schoolId || remembered.name !== listedName)
  ) {
    setRemembered({ id: scope.schoolId, name: listedName });
  }
  const rememberedName =
    remembered?.id === scope.schoolId ? remembered.name : undefined;

  const schoolName = scope.schoolId
    ? (listedName ??
      rememberedName ??
      lockedName ??
      `โรงเรียน ${scope.schoolId}`)
    : undefined;

  return {
    province: area.province,
    district: area.district,
    subDistrict: area.subDistrict,
    schoolName,
    grade: scope.grade,
    room: scope.room,
  };
}
