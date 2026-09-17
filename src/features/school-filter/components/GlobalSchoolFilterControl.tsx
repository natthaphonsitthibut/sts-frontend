import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import { formatScopeSummary } from "../../../lib/scope-presentation";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import {
  useGlobalSchoolFilter,
  type GlobalSchoolFilter,
} from "../hooks/useGlobalSchoolFilter";

interface GlobalSchoolFilterControlProps {
  className?: string;
}

const PILL_CLASSES =
  "inline-flex min-w-0 max-w-full items-center justify-between gap-2 rounded-xl bg-brand-soft px-4 py-2 text-sm font-bold text-primary";

/**
 * The dialog's own body — split out so its `useSchoolAreaFilter` instance
 * only exists while the dialog is actually open. `Dialog` unmounts its
 * children entirely while closed, so a fresh instance seeds from whatever
 * the shared filter holds *at that moment* every time this reopens — instead
 * of one instance living for the whole session and going stale the moment
 * something outside this control (a map/chart drill-down elsewhere on the
 * page) changes the area without this dialog open to see it.
 */
function SchoolPickerDialogBody({
  globalFilter,
  onClose,
}: {
  globalFilter: GlobalSchoolFilter;
  onClose: () => void;
}) {
  const area = useSchoolAreaFilter({
    province: globalFilter.province,
    district: globalFilter.district,
    subDistrict: globalFilter.subDistrict,
  });

  // The cascade's own province → district → sub-district resets are already
  // correct (the same hook every other scope picker uses) — mirror its
  // settled values into the shared filter rather than re-deriving them here.
  useEffect(() => {
    if (globalFilter.locked) return;
    if (
      area.province === globalFilter.province &&
      area.district === globalFilter.district &&
      area.subDistrict === globalFilter.subDistrict
    ) {
      return;
    }
    globalFilter.setArea({
      province: area.province,
      district: area.district,
      subDistrict: area.subDistrict,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- globalFilter is a fresh object every render; its setArea/locked read the latest store already
  }, [area.province, area.district, area.subDistrict]);

  function handleClear(): void {
    area.reset();
    globalFilter.setArea({ province: "", district: "", subDistrict: "" });
    onClose();
  }

  return (
    <>
      <DialogBody className="grid gap-3">
        <SchoolAreaSchoolFilter
          area={area}
          onSchoolChange={(nextSchoolId) => {
            // Fires with "" both when the user deliberately picks
            // "ทุกโรงเรียน" and, incidentally, whenever changing province/
            // district/sub-district clears whatever school no longer
            // applies — the two are indistinguishable here, so this must
            // never auto-close the dialog. "เสร็จสิ้น" is the only close.
            if (!nextSchoolId) {
              globalFilter.clearSchool();
              return;
            }
            // Re-clicking the already-selected school (or clicking it while
            // it's only present via `selectedSchoolFallback`, not in the
            // current server-narrowed list) must not blank out its name and
            // area — fall back to what's already stored instead of "".
            const school = area.filteredSchools.find(
              (candidate) => String(candidate.id) === nextSchoolId,
            );
            const isSameSchool = nextSchoolId === globalFilter.schoolId;
            globalFilter.setSchool(
              nextSchoolId,
              school?.name ?? (isSameSchool ? globalFilter.schoolName : ""),
              {
                province:
                  school?.province ?? (isSameSchool ? area.province : ""),
                district:
                  school?.district ?? (isSameSchool ? area.district : ""),
                subDistrict:
                  school?.sub_district ??
                  (isSameSchool ? area.subDistrict : ""),
              },
            );
            onClose();
          }}
          schoolId={globalFilter.schoolId}
          selectedSchoolFallback={
            globalFilter.schoolId
              ? {
                  id: globalFilter.schoolId,
                  name: globalFilter.schoolName,
                }
              : undefined
          }
        />
      </DialogBody>
      <DialogFooter align="between">
        <Button onClick={handleClear} variant="outline">
          ล้างตัวกรอง
        </Button>
        <Button onClick={onClose}>เสร็จสิ้น</Button>
      </DialogFooter>
    </>
  );
}

/**
 * The one school filter shown in the header, on every signed-in page — pick a
 * school (or an area — every school within it) here, or on any page that
 * embeds this same control, and every page that browses that scope reads it
 * back via `useGlobalSchoolFilter`. Opens the same dialog every other scope
 * picker in the app uses (`ScopeFilterField`'s pattern), not a bespoke
 * dropdown. A locked (single-school) actor gets a static label instead of a
 * picker, since there is nothing left to choose.
 */
export function GlobalSchoolFilterControl({
  className,
}: GlobalSchoolFilterControlProps) {
  const globalFilter = useGlobalSchoolFilter();
  const [open, setOpen] = useState(false);

  // Same wording as every other scope chip in the app (`ScopeFilterField`'s
  // summary): the deepest level picked, falling back to "ทุกจังหวัด" for a
  // fully open scope — never a bare "ทุกโรงเรียน" that hides an area already
  // narrowed down to.
  const label = formatScopeSummary({
    province: globalFilter.province,
    district: globalFilter.district,
    subDistrict: globalFilter.subDistrict,
    schoolName: globalFilter.schoolName,
  }).join(" · ");

  if (globalFilter.locked) {
    return (
      <div className={cn("min-w-0", className)}>
        <span className={cn(PILL_CLASSES, "truncate")}>
          <span className="truncate">{label}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="เลือกโรงเรียนที่จะดูข้อมูล"
        className={cn(
          PILL_CLASSES,
          "transition-colors hover:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      </button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>เลือกโรงเรียน</DialogTitle>
          </DialogHeader>
          <SchoolPickerDialogBody
            globalFilter={globalFilter}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
