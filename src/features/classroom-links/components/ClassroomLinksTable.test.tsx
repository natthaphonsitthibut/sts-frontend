import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassroomLinksTable } from "./ClassroomLinksTable";
import type { ClassroomLinkListItem } from "../types/classroom-links.types";

const row: ClassroomLinkListItem = {
  id: "link-1",
  schoolId: 1,
  schoolName: "โรงเรียนทดสอบ",
  schoolTermId: 2,
  academicYear: 2569,
  semester: 1,
  teacherMembershipId: 3,
  teacherId: "teacher-1",
  teacherName: "ครูสมชาย",
  assignedClassroomId: null,
  assignedClassroomSubjectId: null,
  assignedClassroomLabel: null,
  assignedSubjectName: null,
  opensAt: null,
  expiresAt: null,
  assignmentNote: null,
  teacherPhotoUrl: null,
  classroomCount: 2,
  classrooms: [
    { classroomId: "11", label: "ม.1/1" },
    { classroomId: "12", label: "ม.1/2" },
  ],
  lineDelivery: null,
  status: "ACTIVE",
  issuedAt: null,
  rotatedAt: null,
  lastUsedAt: null,
};

describe("ClassroomLinksTable", () => {
  it("separates teachers from assignments and opens the room list", () => {
    render(
      <ClassroomLinksTable
        rows={[row]}
        selected={new Set()}
        onSelectionChange={vi.fn()}
        onCreate={vi.fn()}
        onCopy={vi.fn()}
        onResendLine={vi.fn()}
        onRotate={vi.fn()}
        onDeactivate={vi.fn()}
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "ครู" })).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "การมอบหมาย" }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "ดูชั้นและห้องที่มอบหมายให้ ครูสมชาย",
      })[0],
    );
    expect(screen.getByRole("dialog").textContent).toContain("ม.1/1");
    expect(screen.getByRole("dialog").textContent).toContain("ม.1/2");
  });

  it("requests sorting from the paginated data source", () => {
    const onSortChange = vi.fn();
    render(
      <ClassroomLinksTable
        rows={[row]}
        selected={new Set()}
        onSelectionChange={vi.fn()}
        onCreate={vi.fn()}
        onCopy={vi.fn()}
        onResendLine={vi.fn()}
        onRotate={vi.fn()}
        onDeactivate={vi.fn()}
        onSortChange={onSortChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "การมอบหมาย" }));
    expect(onSortChange).toHaveBeenCalledWith({
      key: "classroomCount",
      direction: "asc",
    });
  });
});
