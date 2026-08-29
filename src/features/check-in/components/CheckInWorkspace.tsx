import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import {
  CalendarClock,
  Check,
  FileSpreadsheet,
  Grid2X2,
  ScanLine,
  Send,
  Table2,
  Undo2,
  X,
} from "lucide-react";
import {
  appToast,
  Avatar,
  Badge,
  Button,
  Combobox,
  DatePicker,
  FormErrorAlert,
  Label,
  Tabs,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import { formatClassLabel } from "../../../lib/room-presentation";
import {
  AttendanceRosterTable,
  AttendanceStatusButtons,
} from "../../attendance/components/AttendanceRosterTable";
import {
  ATTENDANCE_RECORD_STATUSES,
  getAttendanceStatusPresentation,
} from "../../attendance/lib/attendance-presentation";
import type { AttendanceSelectionStatus } from "../../attendance/types/attendance.types";
import { checkInService } from "../api/check-in.service";
import { ClassroomStudentCommentDialog } from "../../school-structure/components/ClassroomStudentCommentDialog";
import { AttendanceImportDialog } from "../../attendance/components/AttendanceImportDialog";
import { AttendanceQrScannerDialog } from "../../attendance/components/AttendanceQrScannerDialog";
import { attendanceService } from "../../attendance/api/attendance.service";
import { AttendanceAssignmentDialog } from "../../classroom-links/components/AttendanceAssignmentDialog";
import { useCreateAttendanceAssignment } from "../../classroom-links/hooks/useClassroomLinks";
import { ClassroomAttendanceHistory } from "../../school-structure/components/ClassroomAttendanceHistory";
import { ClassroomRosterTab } from "./ClassroomRosterTab";
import { useClassroomLinkComments } from "../hooks/useClassroomLinkComments";
import { useCheckInWorkspace } from "../hooks/useCheckInWorkspace";
import type {
  CheckInAccess,
  CheckInContext,
  CheckInMarkStatus,
  CheckInStudent,
  LocalCheckInMark,
} from "../types/check-in.types";

const STATUS_CONFIG = ATTENDANCE_RECORD_STATUSES.map((status) => {
  const presentation = getAttendanceStatusPresentation(status, []);
  return {
    status: status as CheckInMarkStatus,
    label: presentation.label,
    shortLabel: presentation.shortLabel,
    icon: presentation.icon,
    className: cn(presentation.idleClass, "hover:bg-slate-50"),
    activeClassName: presentation.activeClass,
  };
});
const AUTO_ADVANCE_KEY = "sts_check_in_auto_advance";
/**
 * How long a freshly picked status stays put before the roster moves on.
 * Marking is the only moment the choice is visible, and both surfaces would
 * otherwise erase it on the same frame it appears — the table row jumps to
 * the end of the list, the card flies off. One readable beat: long enough to
 * see which of the four pills filled in, short enough that checking a class
 * of forty still feels like tapping down a list.
 */
const SELECTION_HOLD_MS = 320;

function readAutoAdvance(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(AUTO_ADVANCE_KEY) !== "false";
}

function statusLabel(status?: CheckInMarkStatus): string {
  return (
    STATUS_CONFIG.find((item) => item.status === status)?.label ?? "ยังไม่ระบุ"
  );
}

function motionDelay(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 220;
}

function StudentPhoto({
  access,
  classroomId,
  display = "CARD",
  student,
}: {
  access: CheckInAccess;
  classroomId?: number;
  display?: "AVATAR" | "CARD";
  student: CheckInStudent;
}) {
  const fullName = `${student.firstName} ${student.lastName}`.trim();
  const photoUrl = student.hasPhoto
    ? checkInService.getStudentPhotoUrl({
        access,
        classroomId,
        studentId: student.id,
        photoVersion: student.photoVersion,
      })
    : null;
  return (
    <Avatar
      className={cn(
        "text-white",
        display === "AVATAR"
          ? "size-12 text-sm"
          : "h-full w-full rounded-none text-7xl",
      )}
      fallback={fullName.charAt(0) || "?"}
      gradientName={fullName}
      imageAlt={`รูปประจำตัว ${fullName}`}
      imageUrl={photoUrl}
    />
  );
}

function CheckInTable({
  access,
  autoAdvance,
  classroomId,
  disabled,
  marks,
  onClear,
  onMark,
  onOpenProfile,
  roster,
}: {
  access: CheckInAccess;
  autoAdvance: boolean;
  classroomId?: number;
  disabled: boolean;
  marks: Map<string, LocalCheckInMark>;
  onClear: (studentId: string) => void;
  onMark: (studentId: string, status: CheckInMarkStatus) => void;
  onOpenProfile?: (student: CheckInStudent) => void;
  roster: CheckInStudent[];
}) {
  // Only auto-advance reorders the list, so only auto-advance needs the hold:
  // a just-marked student keeps their place for `SELECTION_HOLD_MS` and then
  // drops to the end. With the option off, rows never move and the filled
  // pill is already visible where it was tapped.
  const [heldIds, setHeldIds] = useState<readonly string[]>([]);
  const holdTimers = useRef(new Map<string, number>());

  useEffect(
    () => () => {
      for (const timer of holdTimers.current.values()) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  function holdRowInPlace(studentId: string): void {
    const running = holdTimers.current.get(studentId);
    if (running !== undefined) window.clearTimeout(running);
    setHeldIds((current) =>
      current.includes(studentId) ? current : [...current, studentId],
    );
    holdTimers.current.set(
      studentId,
      window.setTimeout(() => {
        holdTimers.current.delete(studentId);
        setHeldIds((current) => current.filter((id) => id !== studentId));
      }, SELECTION_HOLD_MS),
    );
  }

  function markAndAdvance(studentId: string, status: CheckInMarkStatus): void {
    const current = marks.get(studentId)?.status;
    if (current === status) {
      onClear(studentId);
      return;
    }
    onMark(studentId, status);
    if (autoAdvance) holdRowInPlace(studentId);
  }

  const displayedRoster = autoAdvance
    ? [
        ...roster.filter(
          (student) => !marks.has(student.id) || heldIds.includes(student.id),
        ),
        ...roster.filter(
          (student) => marks.has(student.id) && !heldIds.includes(student.id),
        ),
      ]
    : roster;
  const selections = Object.fromEntries(
    roster.map((student) => [
      student.id,
      marks.get(student.id)?.status ?? "NONE",
    ]),
  ) as Record<string, AttendanceSelectionStatus>;

  return (
    <AttendanceRosterTable
      catalog={[]}
      disabled={disabled}
      onStatusChange={(studentId, status) => markAndAdvance(studentId, status)}
      rows={displayedRoster.map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        order: roster.findIndex((item) => item.id === student.id) + 1,
        studentNumber: student.studentNumber,
        avatar: onOpenProfile ? (
          // The avatar is the way into the student's profile, the same as on
          // the staff roster.
          <button
            aria-label={`เปิดข้อมูลนักเรียน ${`${student.firstName} ${student.lastName}`.trim()}`}
            className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => onOpenProfile(student)}
            type="button"
          >
            <StudentPhoto
              access={access}
              classroomId={classroomId}
              display="AVATAR"
              student={student}
            />
          </button>
        ) : (
          <StudentPhoto
            access={access}
            classroomId={classroomId}
            display="AVATAR"
            student={student}
          />
        ),
      }))}
      selections={selections}
    />
  );
}

function CheckInCompletionContent({
  interactive = false,
  onReview,
}: {
  interactive?: boolean;
  onReview?: () => void;
}) {
  return (
    <>
      <span className="mb-4 flex size-20 items-center justify-center rounded-full bg-success-100 text-success shadow-sm">
        <Check className="size-11" aria-hidden="true" />
      </span>
      <h2 className="text-xl font-bold text-emerald-900">
        ระบุสถานะครบทุกคนแล้ว
      </h2>
      <div className="mt-5 flex justify-center">
        <Button
          icon={Table2}
          onClick={interactive ? onReview : () => undefined}
          tabIndex={interactive ? undefined : -1}
        >
          ตรวจทานก่อนส่ง
        </Button>
      </div>
    </>
  );
}

function CheckInCards({
  access,
  classroomId,
  disabled,
  marks,
  onMark,
  onReview,
  roster,
}: {
  access: CheckInAccess;
  classroomId?: number;
  disabled: boolean;
  marks: Map<string, LocalCheckInMark>;
  onMark: (studentId: string, status: CheckInMarkStatus) => void;
  onReview: () => void;
  roster: CheckInStudent[];
}) {
  const [departingId, setDepartingId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  // The status the buttons below the deck are showing as picked, while the
  // card waits out `SELECTION_HOLD_MS` before leaving. Swiping never sets it:
  // the drag, the tilt and the stamp already say what was chosen.
  const [pendingStatus, setPendingStatus] = useState<CheckInMarkStatus | null>(
    null,
  );
  const cardRef = useRef<HTMLElement>(null);
  const nextCardRef = useRef<HTMLElement>(null);
  const presentOverlayRef = useRef<HTMLDivElement>(null);
  const absentOverlayRef = useRef<HTMLDivElement>(null);
  const animationFrame = useRef<number | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  const transitionLock = useRef(false);
  const interacted = useRef(false);
  const drag = useRef<{
    axis: "PENDING" | "HORIZONTAL" | "VERTICAL";
    startX: number;
    startY: number;
    x: number;
  } | null>(null);
  const unmarked = roster.filter((student) => !marks.has(student.id));
  const active = departingId
    ? roster.find((student) => student.id === departingId)
    : unmarked[0];
  const cards = active
    ? [
        active,
        ...unmarked.filter((student) => student.id !== active.id).slice(0, 1),
      ]
    : [];
  const complete = !active;
  const progressNumber = Math.min(marks.size + 1, roster.length);

  useEffect(() => {
    if (!active || !interacted.current || transitioning) return;
    cardRef.current?.focus({ preventScroll: true });
  }, [active, transitioning]);

  useEffect(
    () => () => {
      if (animationFrame.current !== null)
        cancelAnimationFrame(animationFrame.current);
      if (transitionTimer.current !== null)
        window.clearTimeout(transitionTimer.current);
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    },
    [],
  );

  function paintNextCard(progress: number): void {
    const nextCard = nextCardRef.current;
    if (!nextCard) return;
    const bounded = Math.max(0, Math.min(1, progress));
    nextCard.style.transform = `translate3d(0, ${8 * (1 - bounded)}px, 0) scale(${0.97 + 0.03 * bounded})`;
    nextCard.style.opacity = String(0.32 + 0.68 * bounded);
  }

  function paintDrag(x: number): void {
    const card = cardRef.current;
    if (!card) return;
    const rotation = Math.max(-6, Math.min(6, x / 28));
    card.style.transform = `translate3d(${x}px, 0, 0) rotate(${rotation}deg)`;
    paintNextCard(Math.abs(x) / 120);
    if (presentOverlayRef.current) {
      presentOverlayRef.current.style.opacity = String(
        Math.max(0, Math.min(1, x / 90)),
      );
    }
    if (absentOverlayRef.current) {
      absentOverlayRef.current.style.opacity = String(
        Math.max(0, Math.min(1, -x / 90)),
      );
    }
  }

  function schedulePaint(x: number): void {
    if (animationFrame.current !== null)
      cancelAnimationFrame(animationFrame.current);
    animationFrame.current = requestAnimationFrame(() => {
      animationFrame.current = null;
      paintDrag(x);
    });
  }

  function resetCard(): void {
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    const card = cardRef.current;
    const nextCard = nextCardRef.current;
    if (card) {
      card.style.transition =
        motionDelay() === 0
          ? "none"
          : "transform 180ms cubic-bezier(.22,1,.36,1)";
      if (nextCard) {
        nextCard.style.transition =
          motionDelay() === 0
            ? "none"
            : "transform 180ms cubic-bezier(.22,1,.36,1), opacity 180ms ease-out";
      }
      paintDrag(0);
      window.setTimeout(() => {
        if (card) card.style.transition = "";
        if (nextCard) nextCard.style.transition = "";
      }, motionDelay());
    }
  }

  function markActive(status: CheckInMarkStatus): void {
    if (!active || disabled || transitionLock.current) return;
    transitionLock.current = true;
    interacted.current = true;
    setTransitioning(true);
    setDepartingId(active.id);
    onMark(active.id, status);
    const delay = motionDelay();
    const card = cardRef.current;
    const nextCard = nextCardRef.current;
    if (card && delay > 0) {
      card.style.transition =
        "transform 220ms cubic-bezier(.22,1,.36,1), opacity 180ms ease-out";
      if (nextCard) {
        nextCard.style.transition =
          "transform 220ms cubic-bezier(.22,1,.36,1), opacity 180ms ease-out";
      }
      if (status === "P_PRESENT") paintDrag(window.innerWidth);
      else if (status === "P_ABSENT") paintDrag(-window.innerWidth);
      else {
        paintNextCard(1);
        card.style.transform = "translate3d(0,-12px,0) scale(.97)";
        card.style.opacity = "0";
      }
    }
    transitionTimer.current = window.setTimeout(() => {
      setDepartingId(null);
      setTransitioning(false);
      transitionLock.current = false;
    }, delay || 1);
  }

  /**
   * The button path onto the same departure the swipe uses, one beat later.
   * Tapping a status would otherwise destroy its own feedback — the card
   * flies off on the frame the button fills in, so nothing is left to read.
   * Holding the pressed button lit first makes the four-way choice visible;
   * a second tap during the hold is ignored rather than queued, so a
   * mis-tap resolves to exactly one status.
   */
  function markFromButton(status: CheckInMarkStatus): void {
    if (!active || disabled || transitionLock.current || pendingStatus) return;
    setPendingStatus(status);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setPendingStatus(null);
      markActive(status);
    }, SELECTION_HOLD_MS);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>): void {
    if (disabled || transitioning) return;
    drag.current = {
      axis: "PENDING",
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
    };
    event.currentTarget.style.transition = "none";
    if (nextCardRef.current) nextCardRef.current.style.transition = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>): void {
    const current = drag.current;
    if (!current) return;
    const x = event.clientX - current.startX;
    const y = event.clientY - current.startY;
    if (current.axis === "PENDING" && Math.max(Math.abs(x), Math.abs(y)) > 8) {
      current.axis =
        Math.abs(x) > Math.abs(y) * 1.2 ? "HORIZONTAL" : "VERTICAL";
    }
    if (current.axis !== "HORIZONTAL") return;
    event.preventDefault();
    current.x = Math.max(-220, Math.min(220, x));
    schedulePaint(current.x);
  }

  function handlePointerUp(): void {
    const current = drag.current;
    drag.current = null;
    if (!current || current.axis !== "HORIZONTAL") {
      resetCard();
      return;
    }
    if (current.x > 80) markActive("P_PRESENT");
    else if (current.x < -80) markActive("P_ABSENT");
    else resetCard();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      markActive("P_PRESENT");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      markActive("P_ABSENT");
    }
  }

  if (complete) {
    return (
      <div className="relative left-1/2 w-dvw -translate-x-1/2 overflow-x-clip px-4 md:left-auto md:mx-auto md:w-full md:max-w-md md:translate-x-0 md:overflow-visible md:px-0">
        <p className="mb-3 text-center text-sm font-bold text-slate-600">
          ครบ {roster.length} คน
        </p>
        <article
          className="mx-auto flex aspect-[4/5] max-h-[min(66vh,620px)] w-full max-w-[496px] select-none flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-10 text-center shadow-xl"
          onDragStart={(event) => event.preventDefault()}
        >
          <CheckInCompletionContent interactive onReview={onReview} />
        </article>
        <div aria-hidden="true" className="invisible mt-5">
          <AttendanceStatusButtons
            buttonClassName="flex-1"
            catalog={[]}
            current="NONE"
            disabled
            isUnmarked
            onStatusChange={() => undefined}
            studentId="complete-placeholder"
            studentName=""
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 w-dvw -translate-x-1/2 overflow-x-clip px-4 md:left-auto md:mx-auto md:w-full md:max-w-md md:translate-x-0 md:overflow-visible md:px-0">
      <p className="mb-3 text-center text-sm font-bold text-slate-600">
        คนที่ {progressNumber} จาก {roster.length}
      </p>
      <div className="relative mx-auto aspect-[4/5] max-h-[min(66vh,620px)] w-full max-w-[496px]">
        {cards.length === 1 ? (
          <article
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[8] flex select-none flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-10 text-center shadow-xl transition-[transform,opacity] duration-200 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform motion-reduce:transition-none"
            data-completion-card="preview"
            ref={nextCardRef}
            style={{ opacity: 0.32, transform: "translateY(8px) scale(0.97)" }}
          >
            <CheckInCompletionContent />
          </article>
        ) : null}
        {[...cards].reverse().map((student, reverseIndex) => {
          const depth = cards.length - 1 - reverseIndex;
          const isActive = depth === 0;
          const stackDepth = transitioning ? Math.max(0, depth - 1) : depth;
          return (
            <article
              aria-label={`นักเรียนคนที่ ${progressNumber} จาก ${roster.length}: ${student.firstName} ${student.lastName}`}
              className={cn(
                // `touch-pinch-zoom` (no pan at all) rather than `pan-y`: with
                // vertical panning allowed the browser could claim a slightly
                // diagonal swipe as a page scroll, cancel the pointer stream
                // mid-drag, and leave the card snapping back while the page
                // slid — the gesture read as unreliable on a phone. Now a
                // finger that lands on the card only ever swipes the card;
                // the page still scrolls from anywhere around it, and pinch
                // to zoom the photo keeps working.
                "absolute inset-0 touch-pinch-zoom select-none overflow-hidden rounded-3xl bg-white shadow-xl outline-none transition-[transform,opacity] duration-200 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform motion-reduce:transition-none focus-visible:ring-4 focus-visible:ring-primary/40",
                isActive && "cursor-grab active:cursor-grabbing",
                !isActive && "pointer-events-none",
              )}
              data-active-card={isActive ? "true" : undefined}
              key={student.id}
              onKeyDown={isActive ? handleKeyDown : undefined}
              onDragStart={
                isActive ? (event) => event.preventDefault() : undefined
              }
              onPointerDown={isActive ? handlePointerDown : undefined}
              onPointerMove={isActive ? handlePointerMove : undefined}
              onPointerUp={isActive ? handlePointerUp : undefined}
              onPointerCancel={isActive ? resetCard : undefined}
              ref={isActive ? cardRef : depth === 1 ? nextCardRef : undefined}
              style={{
                opacity: isActive ? 1 : stackDepth === 0 ? 1 : 0.32,
                transform: isActive
                  ? undefined
                  : `translateY(${stackDepth * 8}px) scale(${1 - stackDepth * 0.03})`,
                zIndex: 10 - depth,
              }}
              tabIndex={isActive ? 0 : -1}
            >
              <div className="absolute inset-0 bg-slate-100">
                <StudentPhoto
                  access={access}
                  classroomId={classroomId}
                  student={student}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-6 pb-6 pt-24 text-left text-white">
                <h2 className="mt-1 min-h-16 text-2xl font-extrabold leading-tight drop-shadow-sm">
                  {student.firstName} {student.lastName}
                </h2>
                <p
                  className="mt-1 min-h-5 text-sm font-semibold text-white/85"
                  aria-hidden={!student.studentNumber}
                >
                  {student.studentNumber
                    ? `รหัสประจำตัว ${student.studentNumber}`
                    : ""}
                </p>
              </div>
              {isActive ? (
                <>
                  <div
                    className="pointer-events-none absolute left-5 top-5 flex rotate-[-8deg] items-center gap-2 rounded-xl border-4 border-emerald-500 bg-white/90 px-4 py-2 text-2xl font-black text-emerald-700 opacity-0"
                    ref={presentOverlayRef}
                  >
                    <Check className="size-7" /> มา
                  </div>
                  <div
                    className="pointer-events-none absolute right-5 top-5 flex rotate-[8deg] items-center gap-2 rounded-xl border-4 border-red-500 bg-white/90 px-4 py-2 text-2xl font-black text-red-700 opacity-0"
                    ref={absentOverlayRef}
                  >
                    <X className="size-7" /> ขาด
                  </div>
                </>
              ) : null}
            </article>
          );
        })}
      </div>
      <div className="mt-5">
        <AttendanceStatusButtons
          buttonClassName="flex-1"
          catalog={[]}
          current={pendingStatus ?? "NONE"}
          // Not disabled during the hold on purpose — `disabled` dims the
          // pills, which would mute the very confirmation the hold exists to
          // show. `markFromButton` ignores the extra taps instead.
          disabled={disabled || transitioning}
          isUnmarked={pendingStatus === null}
          onStatusChange={(_studentId, status) => markFromButton(status)}
          studentId={active.id}
          studentName={`${active.firstName} ${active.lastName}`.trim()}
        />
      </div>
    </div>
  );
}

export function CheckInWorkspace({
  access,
  assignment = null,
  classroomId,
  classroomSubjectId,
}: {
  access: CheckInAccess;
  /** Set when the link covers a single lesson handed on by its teacher. */
  assignment?: CheckInContext["assignment"];
  classroomId?: number;
  /**
   * Fixes the lesson. A link arrives here from a card that already named the
   * subject, so the picker is dropped rather than asked again.
   */
  classroomSubjectId?: number;
}) {
  const isAssignment = assignment !== null;
  const workspace = useCheckInWorkspace({
    access,
    classroomId,
    classroomSubjectId,
  });
  const [autoAdvance, setAutoAdvance] = useState(readAutoAdvance);
  const [commentStudent, setCommentStudent] = useState<CheckInStudent | null>(
    null,
  );
  // The tab lives in the URL so leaving for a student profile and coming back
  // lands on the tab that was open — the back target is the URL itself.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab =
    requestedTab === "roster" || requestedTab === "history"
      ? requestedTab
      : "attendance";
  const contextualNavigate = useContextualNavigate();

  function setTab(next: string): void {
    const params = new URLSearchParams(searchParams);
    if (next === "attendance") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  const linkComments = useClassroomLinkComments(access === "PUBLIC_LINK");

  function openStudent(student: CheckInStudent): void {
    // Two doors onto the same profile: the staff page reaches the app's own
    // student page, the link its own copy inside the link surface.
    contextualNavigate(
      access === "PUBLIC_LINK"
        ? `/classroom/students/${student.id}`
        : `/students/${student.id}`,
    );
  }
  const [announcement, setAnnouncement] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const createAssignment = useCreateAttendanceAssignment(access);
  const submitAreaRef = useRef<HTMLDivElement>(null);
  const room = workspace.options?.classroom;
  const activeSubject = workspace.options?.subjects.find(
    (subject) => subject.classroomSubjectId === workspace.classroomSubjectId,
  );
  const readOnly = Boolean(workspace.session?.readOnly);
  // A teacher owns their rooms all term, so the past is theirs to read — in the
  // app and in their link alike. An assignment covers one lesson on set days and
  // gets no history: whoever picked it up was asked to take a register, not
  // handed a term of someone else's room.
  const showHistory = access === "INTERNAL" || !isAssignment;
  // A subject is what the register is filed against, so without one there is
  // nothing to submit. It used to be checked only once the request was on its
  // way, where the refusal landed in the alert at the top of the page — out of
  // sight from the submit bar the teacher was looking at.
  const missingSubject = !workspace.classroomSubjectId;
  const readyToSubmit =
    workspace.counts.total > 0 &&
    workspace.counts.marked === workspace.counts.total &&
    !missingSubject &&
    !readOnly;

  const summary = useMemo(
    () =>
      [
        [
          "ยังไม่เช็ก",
          workspace.counts.total - workspace.counts.marked,
          "text-slate-900",
        ],
        [
          "มา",
          workspace.counts.present,
          getAttendanceStatusPresentation("P_PRESENT", []).textClass,
        ],
        [
          "สาย",
          workspace.counts.late,
          getAttendanceStatusPresentation("P_LATE", []).textClass,
        ],
        [
          "ขาด",
          workspace.counts.absent,
          getAttendanceStatusPresentation("P_ABSENT", []).textClass,
        ],
        [
          "ลา",
          workspace.counts.leave,
          getAttendanceStatusPresentation("P_LEAVE", []).textClass,
        ],
      ] as const,
    [workspace.counts],
  );

  async function submit(): Promise<void> {
    await workspace.submit();
    appToast.success(
      "ส่งผลเช็กชื่อแล้ว ระบบบันทึกเฉพาะนักเรียนที่เป็นข้อยกเว้น",
    );
  }

  function markStudent(studentId: string, status: CheckInMarkStatus): void {
    const student = workspace.roster.find((item) => item.id === studentId);
    workspace.mark(studentId, status);
    const next = workspace.roster.find(
      (item) => item.id !== studentId && !workspace.marks.has(item.id),
    );
    setAnnouncement(
      `บันทึก ${student?.firstName ?? "นักเรียน"} เป็น ${statusLabel(status)} แล้ว${next ? ` คนถัดไป ${next.firstName} ${next.lastName}` : " ตรวจครบทุกคนแล้ว"}`,
    );
  }

  function clearStudent(studentId: string): void {
    const student = workspace.roster.find((item) => item.id === studentId);
    workspace.clear(studentId);
    setAnnouncement(`ล้างสถานะของ ${student?.firstName ?? "นักเรียน"} แล้ว`);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {room ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-sm text-slate-500">{room.schoolName}</p>
              <h2 className="text-xl font-extrabold text-slate-950">
                {formatClassLabel(room.gradeLabel, room.roomNumber)}
              </h2>
            </div>
            {readOnly ? (
              <Badge variant="success">ส่งแล้ว · อ่านอย่างเดียว</Badge>
            ) : workspace.session ? (
              <Badge variant="warning">กำลังเช็กชื่อ · ยังไม่ส่ง</Badge>
            ) : (
              <Badge variant="secondary">ยังไม่เริ่ม</Badge>
            )}
          </div>
        ) : null}
      </div>

      <Tabs
        aria-label="ข้อมูลห้องเรียน"
        className="flex w-full"
        onChange={setTab}
        options={[
          { value: "roster", label: "รายชื่อ" },
          { value: "attendance", label: "เช็กชื่อ" },
          // An assignment covers one lesson on set days — there is no back
          // catalogue for the person covering it to read, and the room's
          // history is not theirs to browse.
          ...(showHistory ? [{ value: "history", label: "ประวัติ" }] : []),
        ]}
        value={tab}
      />

      {tab === "history" && room ? (
        <ClassroomAttendanceHistory
          classroomId={room.id}
          source={access === "INTERNAL" ? "INTERNAL" : "CLASSROOM_LINK"}
          classroomLabel={formatClassLabel(room.gradeLabel, room.roomNumber)}
          subjects={(workspace.options?.subjects ?? []).map((subject) => ({
            id: subject.classroomSubjectId,
            name: subject.nameTh,
          }))}
        />
      ) : tab === "roster" ? (
        <ClassroomRosterTab
          isLoading={workspace.isLoading}
          onComment={setCommentStudent}
          onOpenStudent={openStudent}
          renderAvatar={(student) => (
            <StudentPhoto
              access={access}
              classroomId={classroomId}
              display="AVATAR"
              student={student}
            />
          )}
          roster={workspace.roster}
        />
      ) : (
        <>
          {/* The day and the lesson this register is filed against. They sit
              inside the เช็กชื่อ tab because that is the only tab they act on —
              above the tabs they stayed on screen while รายชื่อ and ประวัติ
              ignored them, which read as a control that had stopped working. */}
          <div
            className={cn(
              "grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
              classroomSubjectId ? undefined : "sm:grid-cols-2",
            )}
          >
            <div>
              <Label htmlFor="check-in-date">วันที่</Label>
              <DatePicker
                ariaLabel="เลือกวันที่เช็กชื่อ"
                id="check-in-date"
                max={workspace.maxDate}
                onChange={workspace.setDate}
                value={workspace.date}
              />
            </div>
            {/* A link arrives from a card that already named the lesson, so
                there is nothing left to choose — the header above states it.
                In the app the room is the entry point, and the lesson still
                has to be picked. */}
            {classroomSubjectId ? null : (
              <div>
                <Label htmlFor="check-in-subject" required>
                  วิชา
                </Label>
                <Combobox
                  ariaLabel="วิชา"
                  disabled={!workspace.options?.subjects.length}
                  emptyText="ไม่พบวิชา"
                  id="check-in-subject"
                  onChange={(value) =>
                    workspace.setClassroomSubjectId(
                      value ? Number(value) : null,
                    )
                  }
                  options={(workspace.options?.subjects ?? []).map(
                    (subject) => ({
                      label: subject.nameTh,
                      value: String(subject.classroomSubjectId),
                    }),
                  )}
                  placeholder="เลือกวิชา"
                  value={
                    workspace.classroomSubjectId
                      ? String(workspace.classroomSubjectId)
                      : ""
                  }
                />
              </div>
            )}
          </div>

          <FormErrorAlert
            error={workspace.loadError}
            fallback="โหลดข้อมูลเช็กชื่อไม่สำเร็จ"
          />
          <FormErrorAlert
            autoDismissMs={8_000}
            dismissible
            error={workspace.actionError}
            fallback="บันทึกการเช็กชื่อไม่สำเร็จ"
          />

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-4" aria-live="polite">
              {summary.map(([label, value, color]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-500">
                    {label}
                  </p>
                  <p
                    className={cn("text-xl font-extrabold tabular-nums", color)}
                  >
                    {value}
                    <span className="text-sm font-semibold text-slate-400">
                      /{workspace.counts.total}
                    </span>
                  </p>
                </div>
              ))}
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="รูปแบบการเช็กชื่อ"
            >
              {/* Scanning marks students from the roster already on screen, so
                  it belongs beside the table/card switch rather than in a
                  separate flow. */}
              <Button
                disabled={readOnly || workspace.roster.length === 0}
                icon={ScanLine}
                onClick={() => setScannerOpen(true)}
                variant="outline"
              >
                สแกน QR
              </Button>
              {/* Handing the lesson to someone else is a check-in tool, the
                  same as scanning — it belongs where the person who cannot
                  take it today already is, not on the link-management page.
                  A teacher can do this from their own link too: the room is
                  their responsibility, so passing it on should not require
                  asking the office. Someone covering an assignment cannot pass
                  it on again — it was not theirs to begin with. */}
              {/* Import is a check-in tool like the scanner: it fills the
                  roster on screen, and the teacher still reviews and saves. */}
              <Button
                disabled={readOnly || workspace.roster.length === 0}
                icon={FileSpreadsheet}
                onClick={() => setImportOpen(true)}
                variant="outline"
              >
                นำเข้าไฟล์
              </Button>
              {!isAssignment && room ? (
                <Button
                  disabled={readOnly || !activeSubject}
                  icon={CalendarClock}
                  onClick={() => setAssignmentOpen(true)}
                  variant="outline"
                >
                  มอบหมาย
                </Button>
              ) : null}
              <Button
                icon={Table2}
                onClick={() => workspace.setMode("TABLE")}
                variant={workspace.mode === "TABLE" ? "default" : "outline"}
              >
                ตาราง
              </Button>
              <Button
                icon={Grid2X2}
                onClick={() => workspace.setMode("CARD")}
                variant={workspace.mode === "CARD" ? "default" : "outline"}
              >
                การ์ด
              </Button>
            </div>
          </div>

          {workspace.mode === "TABLE" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                className="w-40 shrink-0"
                disabled={
                  readOnly || workspace.counts.marked === workspace.counts.total
                }
                icon={Check}
                onClick={() => {
                  workspace.markRemainingPresent();
                  setAnnouncement(
                    `ระบุคนที่เหลือ ${workspace.counts.total - workspace.counts.marked} คนเป็นมาแล้ว`,
                  );
                }}
                size="sm"
              >
                มาทั้งหมด
                {workspace.counts.marked < workspace.counts.total
                  ? ` (${workspace.counts.total - workspace.counts.marked})`
                  : ""}
              </Button>
              <label className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-600">
                <input
                  checked={autoAdvance}
                  className="size-4 accent-primary"
                  onChange={(event) => {
                    setAutoAdvance(event.target.checked);
                    window.localStorage.setItem(
                      AUTO_ADVANCE_KEY,
                      String(event.target.checked),
                    );
                  }}
                  type="checkbox"
                />
                ย้ายคนที่เช็กแล้วไว้ท้ายรายการ
              </label>
            </div>
          ) : (
            <p className="text-center text-sm text-slate-500">
              ปัดขวาเพื่อระบุ “มา” ปัดซ้ายเพื่อระบุ “ขาด” หรือใช้ปุ่มด้านล่าง
            </p>
          )}

          {workspace.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              กำลังเตรียมรายชื่อนักเรียน…
            </div>
          ) : workspace.roster.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              ห้องเรียนนี้ยังไม่มีนักเรียนที่ใช้งานได้
            </div>
          ) : workspace.mode === "TABLE" ? (
            <CheckInTable
              access={access}
              autoAdvance={autoAdvance}
              classroomId={classroomId}
              disabled={readOnly}
              marks={workspace.marks}
              onClear={clearStudent}
              onMark={markStudent}
              onOpenProfile={openStudent}
              roster={workspace.roster}
            />
          ) : (
            <CheckInCards
              access={access}
              classroomId={classroomId}
              disabled={readOnly}
              key={`${workspace.date}:${workspace.classroomSubjectId}`}
              marks={workspace.marks}
              onMark={markStudent}
              onReview={() => workspace.setMode("TABLE")}
              roster={workspace.roster}
            />
          )}

          <div
            className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"
            ref={submitAreaRef}
          >
            <p
              className={cn(
                "text-sm",
                missingSubject && !readOnly
                  ? "font-semibold text-danger"
                  : "text-slate-600",
              )}
            >
              {readOnly
                ? `ส่งผลแล้ว ${workspace.session?.submittedAt ? new Date(workspace.session.submittedAt).toLocaleString("th-TH") : ""}`
                : missingSubject
                  ? "กรุณาเลือกวิชาก่อนส่งผล"
                  : workspace.counts.marked < workspace.counts.total
                    ? `เหลือ ${workspace.counts.total - workspace.counts.marked} คน`
                    : "ตรวจครบแล้ว พร้อมส่งผล"}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                disabled={!workspace.history.length || readOnly}
                icon={Undo2}
                onClick={workspace.undo}
                variant="outline"
              >
                ย้อนกลับ
              </Button>
              <Button
                disabled={!readyToSubmit}
                icon={Send}
                isLoading={workspace.submitting}
                onClick={() => {
                  void submit().catch(() => undefined);
                }}
              >
                ส่งผลเช็กชื่อ
              </Button>
            </div>
          </div>

          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>

          <p className="sr-only">
            ปุ่มลัดโหมดการ์ด: ลูกศรขวา {<Check className="inline size-3" />}{" "}
            มาเรียน, ลูกศรซ้าย {<X className="inline size-3" />} ขาดเรียน
          </p>
        </>
      )}

      {room && workspace.options && activeSubject ? (
        <AttendanceAssignmentDialog
          classroom={{
            id: room.id,
            label: formatClassLabel(room.gradeLabel, room.roomNumber),
          }}
          subject={activeSubject}
          error={createAssignment.error}
          isSaving={createAssignment.isPending}
          onClose={() => setAssignmentOpen(false)}
          onSubmit={(input) => {
            createAssignment.mutate(
              {
                schoolId: workspace.options!.classroom.schoolId,
                schoolTermId: workspace.options!.classroom.schoolTermId,
                ...input,
              },
              {
                onSuccess: (result) => {
                  setAssignmentOpen(false);
                  appToast.success(
                    `สร้างลิงก์มอบหมายแล้ว: ${result.data.accessUrl}`,
                  );
                },
              },
            );
          }}
          open={assignmentOpen}
        />
      ) : null}

      <AttendanceImportDialog
        catalog={[]}
        classLabel={
          room ? formatClassLabel(room.gradeLabel, room.roomNumber) : "เช็กชื่อ"
        }
        contextLabel={workspace.date}
        disabled={readOnly}
        onMark={(studentId, status) =>
          markStudent(studentId, status as CheckInMarkStatus)
        }
        onOpenChange={setImportOpen}
        open={importOpen}
        parseSheet={(input) => attendanceService.parseAttendanceImport(input)}
        rows={workspace.roster.map((student) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          studentNumber: student.studentNumber,
        }))}
        selections={
          Object.fromEntries(
            workspace.roster.map((student) => [
              student.id,
              workspace.marks.get(student.id)?.status ?? "NONE",
            ]),
          ) as Record<string, AttendanceSelectionStatus>
        }
      />

      <AttendanceQrScannerDialog
        catalog={[]}
        disabled={readOnly}
        onMark={(studentId, status) => markStudent(studentId, status)}
        onOpenChange={setScannerOpen}
        open={scannerOpen}
        rows={workspace.roster.map((student) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          studentNumber: student.studentNumber,
          avatar: (
            <StudentPhoto
              access={access}
              classroomId={classroomId}
              display="AVATAR"
              student={student}
            />
          ),
        }))}
        selections={
          Object.fromEntries(
            workspace.roster.map((student) => [
              student.id,
              workspace.marks.get(student.id)?.status ?? "NONE",
            ]),
          ) as Record<string, AttendanceSelectionStatus>
        }
      />

      {/* The one comment dialog both surfaces use. A link has no account, so it
          hands the dialog its own catalogs and its own write; the staff page
          lets the dialog reach the school-structure API itself. */}
      <ClassroomStudentCommentDialog
        classroomId={workspace.options?.classroom.id ?? classroomId ?? 0}
        concernLevels={linkComments.concernLevels}
        isSubmitting={linkComments.isSubmitting}
        onOpenChange={(open) => {
          if (!open) setCommentStudent(null);
        }}
        problemCategories={linkComments.problemCategories}
        submitComment={linkComments.submitComment}
        submitError={linkComments.submitError}
        student={
          commentStudent
            ? {
                studentUuid: commentStudent.id,
                studentNumber: commentStudent.studentNumber,
                firstName: commentStudent.firstName,
                lastName: commentStudent.lastName,
              }
            : null
        }
      />
    </div>
  );
}
