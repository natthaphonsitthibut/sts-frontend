import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "../../../lib/utils";
import { ROLE_LABELS } from "../../auth/lib/permissions";
import type { RoleDefinition } from "../types/admin.types";

type RoleGroupOption = Pick<
  RoleDefinition,
  "name" | "label" | "default_permissions"
>;

interface RoleGroupSelectorProps {
  roleGroups: RoleGroupOption[];
  value: string;
  onChange: (roleName: string) => void;
  /** Turns a permission id into its Thai label for the expanded detail. */
  labelOf: (permissionId: string) => string;
  disabled?: boolean;
}

/**
 * "กำหนดสิทธิ์การเข้าถึง" — pick the role group the account belongs to and expand
 * one to see the permissions it carries.
 *
 * Rendered as a radio group rather than checkboxes: an account holds exactly one
 * role (`users.role`), so multi-select would imply a relationship the data model
 * does not have.
 */
export function RoleGroupSelector({
  roleGroups,
  value,
  onChange,
  labelOf,
  disabled,
}: RoleGroupSelectorProps) {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3" role="radiogroup">
      {roleGroups.map((group) => {
        const isSelected = group.name === value;
        const isExpanded = expandedRole === group.name;
        const groupLabel = group.label || ROLE_LABELS[group.name] || group.name;
        const detailId = `role-group-detail-${group.name}`;

        return (
          <div
            className={cn(
              "rounded-xl border transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-slate-200 bg-white",
            )}
            key={group.name}
          >
            <div className="flex items-center gap-3 p-4">
              <input
                aria-label={groupLabel}
                checked={isSelected}
                className="size-5 shrink-0 accent-primary"
                disabled={disabled}
                name="role-group"
                onChange={() => onChange(group.name)}
                type="radio"
                value={group.name}
              />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
                {groupLabel}
              </span>
              <button
                aria-controls={detailId}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "ซ่อน" : "ดู"}สิทธิ์ของ${groupLabel}`}
                className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                onClick={() =>
                  setExpandedRole(isExpanded ? null : group.name)
                }
                type="button"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-5 transition-transform",
                    isExpanded && "rotate-180",
                  )}
                />
              </button>
            </div>

            {isExpanded ? (
              <div className="border-t border-slate-200 px-4 py-3" id={detailId}>
                {group.default_permissions.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {group.default_permissions.map((permission) => (
                      <li
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                        key={permission}
                      >
                        {labelOf(permission)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    กลุ่มนี้ยังไม่ได้กำหนดสิทธิ์
                  </p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
