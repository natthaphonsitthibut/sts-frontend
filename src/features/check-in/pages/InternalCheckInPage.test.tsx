import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InternalCheckInPage } from "./InternalCheckInPage";

const checkInMocks = vi.hoisted(() => ({
  filter: {
    province: "",
    district: "",
    subDistrict: "",
    schoolId: "",
    schoolName: "",
    locked: false,
  },
  setSchool: vi.fn(),
}));

vi.mock("../../school-filter/hooks/useGlobalSchoolFilter", () => ({
  useGlobalSchoolFilter: () => ({
    ...checkInMocks.filter,
    setSchool: checkInMocks.setSchool,
  }),
}));

vi.mock("../../school-structure/hooks/useSchoolStructure", () => ({
  useScopedSchools: () => ({
    data: [
      {
        id: 42,
        name: "โรงเรียนปลายทาง",
        province: "ชลบุรี",
        district: "เมืองชลบุรี",
        subDistrict: "บ้านสวน",
      },
    ],
    isLoading: false,
  }),
  useSchoolClassroomOptions: () => ({
    data: [
      {
        id: "9",
        gradeLevelId: 7,
        gradeLabel: "ม.1",
        roomCode: "1",
        roomName: "ห้อง 1",
      },
    ],
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [{ id: 1, status: "ACTIVE" }],
    error: null,
  }),
}));

vi.mock("../../attendance/api/attendance.service", () => ({
  attendanceService: { getTerms: vi.fn() },
}));

vi.mock("../components/CheckInWorkspace", () => ({
  CheckInWorkspace: () => <div data-testid="check-in-workspace" />,
}));

describe("InternalCheckInPage deep links", () => {
  beforeEach(() => {
    checkInMocks.filter.schoolId = "";
    checkInMocks.filter.schoolName = "";
    checkInMocks.setSchool.mockClear();
  });

  it("keeps URL school, grade and classroom while allowing a later header switch", async () => {
    const view = render(
      <MemoryRouter
        initialEntries={[
          "/attendance/check-in?schoolId=42&gradeId=7&classroomId=9",
        ]}
      >
        <InternalCheckInPage />
      </MemoryRouter>,
    );

    expect(checkInMocks.setSchool).toHaveBeenCalledWith(
      "42",
      "โรงเรียนปลายทาง",
      {
        province: "ชลบุรี",
        district: "เมืองชลบุรี",
        subDistrict: "บ้านสวน",
      },
    );

    checkInMocks.filter.schoolId = "42";
    view.rerender(
      <MemoryRouter
        initialEntries={[
          "/attendance/check-in?schoolId=42&gradeId=7&classroomId=9",
        ]}
      >
        <InternalCheckInPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /ชั้น\/ห้อง/ }));
    await waitFor(() => {
      expect(
        document.querySelector<HTMLSelectElement>('select[aria-label="ชั้น"]')
          ?.value,
      ).toBe("7");
      expect(
        document.querySelector<HTMLSelectElement>('select[aria-label="ห้อง"]')
          ?.value,
      ).toBe("9");
    });

    checkInMocks.filter.schoolId = "99";
    view.rerender(
      <MemoryRouter initialEntries={["/attendance/check-in"]}>
        <InternalCheckInPage />
      </MemoryRouter>,
    );

    expect(
      document.querySelector<HTMLSelectElement>('select[aria-label="ชั้น"]')
        ?.value,
    ).toBe("");
    expect(
      document.querySelector<HTMLSelectElement>('select[aria-label="ห้อง"]')
        ?.value,
    ).toBe("");
  });
});
