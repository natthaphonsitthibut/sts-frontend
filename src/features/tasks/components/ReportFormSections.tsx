import type { ReactNode } from "react";
import { Save } from "lucide-react";
import { Button, Divider } from "../../../components/base";
import type { ConversationalReportStep } from "./ConversationalReportFlow";

interface ReportFormSectionsProps {
  /** The same sections the step-by-step flow uses, shown all at once. */
  sections: ConversationalReportStep[];
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  /** Draft status shown beside the submit button. */
  footerNote?: ReactNode;
}

/**
 * A report as one form: every section stacked, one submit at the bottom — the
 * layout the follow-up report had before the step-by-step flow (owner,
 * 2026-09-25: "เอา UI แบบเก่า ... แต่ logic validate เอาแบบปัจจุบัน"). The
 * sections, their fields and the form's validation are the current ones.
 */
export function ReportFormSections({
  sections,
  isSubmitting = false,
  submitDisabled = false,
  submitLabel,
  footerNote,
}: ReportFormSectionsProps) {
  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section
          aria-labelledby={`report-section-${section.id}`}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          key={section.id}
        >
          <div className="mb-4">
            {/* Sizes are explicit: unclassed text falls back below this
                app's text-sm, which made titles smaller than descriptions. */}
            <h3
              className="text-base font-bold text-slate-900"
              id={`report-section-${section.id}`}
            >
              {section.title}
              {section.optional ? (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  (ไม่บังคับ)
                </span>
              ) : null}
            </h3>
            {section.description ? (
              <p className="mt-1 text-sm text-slate-500">
                {section.description}
              </p>
            ) : null}
          </div>
          {section.content}
        </section>
      ))}

      <Divider className="bg-slate-200" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">{footerNote}</div>
        <Button
          disabled={submitDisabled}
          icon={Save}
          isLoading={isSubmitting}
          loadingText="กำลังบันทึก"
          type="submit"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
