import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { Button } from "../../../components/base";
import { cn } from "../../../lib/utils";

export interface ConversationalReportStep {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
  content: ReactNode;
}

interface ConversationalReportFlowProps {
  steps: ConversationalReportStep[];
  onAdvance?: (
    stepIndex: number,
    step: ConversationalReportStep,
  ) => Promise<boolean> | boolean;
  isSubmitting?: boolean;
  submitLabel: string;
}

export function ConversationalReportFlow({
  steps,
  onAdvance,
  isSubmitting = false,
  submitLabel,
}: ConversationalReportFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [furthestIndex, setFurthestIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const step = steps[currentIndex];
  const isReview = currentIndex === steps.length - 1;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [currentIndex]);

  function moveTo(index: number): void {
    if (index < 0 || index >= steps.length || index > furthestIndex) return;
    setCurrentIndex(index);
  }

  async function advance(validate: boolean): Promise<void> {
    if (validate && onAdvance && !(await onAdvance(currentIndex, step))) return;
    const next = Math.min(currentIndex + 1, steps.length - 1);
    setFurthestIndex((value) => Math.max(value, next));
    setCurrentIndex(next);
  }

  return (
    <section
      aria-label="ขั้นตอนการกรอกรายงาน"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      data-conversational-report
    >
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div
          aria-label={`ข้อ ${currentIndex + 1} จาก ${steps.length}`}
          className="grid gap-1.5"
          role="list"
          style={{
            gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          }}
        >
          {steps.map((item, index) => {
            const completed = index < currentIndex;
            const reachable = index <= furthestIndex;
            return (
              <div key={item.id} role="listitem">
                <button
                  aria-current={index === currentIndex ? "step" : undefined}
                  aria-label={`${index === currentIndex ? "กำลังทำ" : completed ? "ทำแล้ว" : "ยังไม่ถึง"}: ${item.title}`}
                  className={cn(
                    "block h-2 w-full min-w-0 rounded-full transition-colors duration-200 motion-reduce:transition-none",
                    index === currentIndex
                      ? "bg-primary"
                      : completed
                        ? "bg-primary/45 hover:bg-primary/65"
                        : "bg-slate-200",
                    reachable && index !== currentIndex
                      ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      : "cursor-default",
                  )}
                  disabled={!reachable || index === currentIndex}
                  onClick={() => moveTo(index)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    moveTo(index);
                  }}
                  type="button"
                />
              </div>
            );
          })}
        </div>
        <p
          aria-live="polite"
          className="mt-2 text-xs font-semibold text-slate-500"
        >
          ข้อ {currentIndex + 1} จาก {steps.length}
        </p>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="relative min-h-[13rem] sm:min-h-[22rem]">
          {steps.map((item, index) => {
            const active = index === currentIndex;
            return (
              <div
                aria-hidden={!active}
                className={cn(
                  // Inactive steps stay mounted but leave the layout flow, so
                  // the card is only as tall as the step being answered.
                  "mx-auto w-full max-w-3xl transition-opacity duration-200 motion-reduce:transition-none",
                  active
                    ? "relative visible opacity-100"
                    : "invisible pointer-events-none absolute inset-0 opacity-0",
                )}
                data-conversational-step={active ? item.id : undefined}
                key={item.id}
              >
                <div className="mb-5 sm:mb-6">
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-balance text-xl font-bold leading-8 text-slate-900 outline-none sm:text-2xl"
                      ref={active ? headingRef : undefined}
                      tabIndex={active ? -1 : undefined}
                    >
                      {item.title}
                    </h2>
                    {item.optional ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        ไม่บังคับ
                      </span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                {item.content}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <Button
          disabled={currentIndex === 0 || isSubmitting}
          icon={ArrowLeft}
          onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
          type="button"
          variant="outline"
        >
          ย้อนกลับ
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {isReview ? (
            <Button
              icon={Send}
              isLoading={isSubmitting}
              key="submit-report"
              loadingText="กำลังส่งรายงาน"
              type="submit"
            >
              {submitLabel}
            </Button>
          ) : (
            <Button
              icon={currentIndex === steps.length - 2 ? Check : ArrowRight}
              key="advance-report"
              onClick={(event) => {
                // React reuses this DOM node when the next step is the review
                // step, changing it from type=button to type=submit before the
                // browser finishes the same click. Cancel that click's default
                // action so opening review can never submit the report.
                event.preventDefault();
                void advance(true);
              }}
              type="button"
            >
              {currentIndex === steps.length - 2 ? "ตรวจทาน" : "ถัดไป"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
