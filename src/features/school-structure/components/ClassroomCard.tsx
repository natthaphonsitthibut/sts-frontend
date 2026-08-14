import { Check, ImagePlus, MoreVertical, Star } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { IconButton } from "../../../components/base";
import { ContextLink } from "../../../components/layout/context-link";
import { cn } from "../../../lib/utils";
import type {
  ClassroomCardCoverColor,
  SchoolClassroom,
} from "../types/school-structure.types";
import {
  CLASSROOM_COVER_COLORS,
  classroomCoverImageStyle,
  classroomCoverStyle,
  resolveClassroomCoverUrl,
} from "../lib/classroom-card-presentation";

interface ClassroomCardProps {
  classroom: SchoolClassroom;
  colorPending: boolean;
  favoritePending: boolean;
  onColorChange: (
    classroom: SchoolClassroom,
    color: ClassroomCardCoverColor,
  ) => void;
  onCustomize: (classroom: SchoolClassroom) => void;
  onFavoriteChange: (classroom: SchoolClassroom, isFavorite: boolean) => void;
  /** Second line under the room label; defaults to the homeroom teacher. */
  subtitle?: string;
  /** Where the card navigates; defaults to the school-structure detail page. */
  to?: string;
  /**
   * Personalisation a teacher link cannot perform — it has no user account to
   * hang a favourite on and no upload path for a cover image.
   */
  showFavorite?: boolean;
  showCoverImageOption?: boolean;
}

export function ClassroomCard({
  classroom,
  colorPending,
  favoritePending,
  onColorChange,
  onCustomize,
  onFavoriteChange,
  showCoverImageOption = true,
  showFavorite = true,
  subtitle,
  to,
}: ClassroomCardProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [alignPaletteRight, setAlignPaletteRight] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const paletteId = useId();
  const coverUrl = resolveClassroomCoverUrl(classroom.coverImageUrl);
  const classroomLabel = `${classroom.gradeLabel}/${classroom.roomCode}`;

  useEffect(() => {
    if (!paletteOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!paletteRef.current?.contains(event.target as Node))
        setPaletteOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPaletteOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [paletteOpen]);

  return (
    <article
      className={cn(
        "relative cursor-pointer rounded-lg border border-slate-200 bg-white shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.01] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:scale-100 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        paletteOpen && "z-40",
      )}
      data-classroom-card={classroom.id}
    >
      <ContextLink
        aria-label={`เปิดห้อง ${classroomLabel}`}
        className="absolute inset-0 z-0 rounded-lg outline-none"
        to={to ?? `/classrooms/${encodeURIComponent(classroom.id)}/roster`}
      />
      <div
        className="pointer-events-none relative flex aspect-[16/7] items-center justify-center overflow-hidden rounded-t-lg"
        data-classroom-cover
        style={classroomCoverStyle(classroom.cardCoverColor)}
      >
        {coverUrl ? (
          <img
            alt=""
            className="size-full object-cover transition-transform"
            loading="lazy"
            src={coverUrl}
            style={classroomCoverImageStyle({
              positionX: classroom.coverImagePositionX,
              positionY: classroom.coverImagePositionY,
              scale: classroom.coverImageScale,
            })}
          />
        ) : null}
        {showFavorite ? (
          <IconButton
            aria-label={
              classroom.isFavorite
                ? `นำห้อง ${classroomLabel} ออกจากรายการโปรด`
                : `ปักดาวห้อง ${classroomLabel}`
            }
            aria-pressed={classroom.isFavorite}
            className="pointer-events-auto absolute right-1.5 top-1.5 z-10 size-8 rounded border-0 bg-slate-700/55 text-white shadow-none hover:bg-slate-800/70 hover:text-white"
            disabled={favoritePending}
            icon={Star}
            iconClassName={cn(
              classroom.isFavorite && "fill-amber-300 text-amber-300",
            )}
            onClick={() => {
              onFavoriteChange(classroom, !classroom.isFavorite);
            }}
            size="sm"
          />
        ) : null}
      </div>

      <div className="pointer-events-none relative min-h-32 rounded-b-lg p-3.5 pr-12">
        <h2 className="text-xl font-semibold leading-7 text-slate-900">
          {classroomLabel}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-700">
          {subtitle ??
            `ครูประจำชั้น: ${classroom.homeroomTeacherName || "ยังไม่ได้กำหนด"}`}
        </p>
        <div
          className="pointer-events-auto absolute bottom-2 right-2 z-10"
          ref={paletteRef}
        >
          <IconButton
            aria-controls={paletteId}
            aria-expanded={paletteOpen}
            aria-label={`ปรับแต่งการ์ดห้อง ${classroomLabel}`}
            className="size-8 border-transparent bg-transparent p-0 text-slate-900 shadow-none hover:border-transparent hover:bg-slate-100"
            icon={MoreVertical}
            onClick={(event) => {
              if (!paletteOpen) {
                const rect = event.currentTarget.getBoundingClientRect();
                setAlignPaletteRight(rect.left + 304 > window.innerWidth - 16);
              }
              setPaletteOpen((current) => !current);
            }}
            size="sm"
          />
          {paletteOpen ? (
            <div
              className={cn(
                "absolute top-9 z-50 w-[304px] rounded-lg border border-slate-200 bg-white p-4 shadow-xl",
                alignPaletteRight ? "right-0" : "left-0",
              )}
              id={paletteId}
            >
              <p className="mb-2 text-sm font-semibold text-slate-900">
                เลือกสี
              </p>
              <div className="grid grid-cols-8 gap-2">
                {CLASSROOM_COVER_COLORS.map((color) => {
                  const selected = color.value === classroom.cardCoverColor;
                  return (
                    <button
                      aria-label={`เลือกสี${color.label}`}
                      aria-pressed={selected}
                      className="relative size-7 rounded-full ring-offset-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                      disabled={colorPending}
                      key={color.value}
                      onClick={() => {
                        if (!selected) onColorChange(classroom, color.value);
                        setPaletteOpen(false);
                      }}
                      style={{ backgroundColor: color.value }}
                      type="button"
                    >
                      {selected ? (
                        <Check
                          className="absolute inset-1 size-5 text-white"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
                {showCoverImageOption ? (
                  <button
                    aria-label={`เลือกรูปสำหรับห้อง ${classroomLabel}`}
                    className="inline-flex size-7 items-center justify-center rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() => {
                      setPaletteOpen(false);
                      onCustomize(classroom);
                    }}
                    type="button"
                  >
                    <ImagePlus className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
