import type { CSSProperties } from "react";
import { appConfig } from "../../../config/env";
import type { ClassroomCardCoverColor } from "../types/school-structure.types";

export const CLASSROOM_COVER_COLORS: ReadonlyArray<{
  value: ClassroomCardCoverColor;
  label: string;
}> = [
  { value: "#B96D50", label: "น้ำตาลอิฐ" },
  { value: "#D66B63", label: "แดงหม่น" },
  { value: "#F04432", label: "แดง" },
  { value: "#FF5A45", label: "ส้มแดง" },
  { value: "#FF7638", label: "ส้ม" },
  { value: "#FFA43B", label: "ส้มอำพัน" },
  { value: "#F7C85D", label: "เหลืองทอง" },
  { value: "#F9E583", label: "เหลืองอ่อน" },
  { value: "#4F86E8", label: "น้ำเงิน" },
  { value: "#9CC5E5", label: "ฟ้าอ่อน" },
  { value: "#8FDADF", label: "ฟ้าอมเขียว" },
  { value: "#8BDDB4", label: "เขียวมิ้นต์" },
  { value: "#3CCF91", label: "เขียวสด" },
  { value: "#20A969", label: "เขียวเข้ม" },
  { value: "#70CF3F", label: "เขียวใบไม้" },
  { value: "#A9D864", label: "เขียวอ่อน" },
  { value: "#465052", label: "เทาเข้ม" },
  { value: "#C9A7AF", label: "ชมพูเทา" },
  { value: "#ED87AC", label: "ชมพู" },
  { value: "#C46ADE", label: "ม่วงชมพู" },
  { value: "#9B76DC", label: "ม่วง" },
  { value: "#8B8BEF", label: "ครามอ่อน" },
  { value: "#AC8AEF", label: "ม่วงอ่อน" },
] as const;

export function classroomCoverStyle(color: ClassroomCardCoverColor): CSSProperties {
  return {
    backgroundColor: color,
    backgroundImage:
      "radial-gradient(ellipse at 52% 115%, rgb(255 255 255 / 58%) 0 4%, transparent 26%), radial-gradient(ellipse at 35% 30%, rgb(255 255 255 / 28%) 0 2%, transparent 33%), linear-gradient(125deg, rgb(255 255 255 / 18%), transparent 38%, rgb(255 255 255 / 20%) 54%, transparent 70%)",
  };
}

export function classroomCoverImageStyle(input: {
  positionX: number;
  positionY: number;
  scale: number;
}): CSSProperties {
  const horizontalOffset = (50 - input.positionX) * (input.scale - 1);
  const verticalOffset = (50 - input.positionY) * (input.scale - 1);
  return {
    objectPosition: `${input.positionX}% ${input.positionY}%`,
    transform: `translate3d(${horizontalOffset}%, ${verticalOffset}%, 0) scale(${input.scale})`,
    transformOrigin: "center",
  };
}

export function resolveClassroomCoverUrl(path: string | null): string | null {
  if (!path) return null;
  const configuredBaseUrl = appConfig.apiBaseUrl.trim();
  if (!configuredBaseUrl || configuredBaseUrl === "/") return path;
  try {
    const baseUrl = configuredBaseUrl.startsWith("http")
      ? configuredBaseUrl
      : window.location.origin;
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}
