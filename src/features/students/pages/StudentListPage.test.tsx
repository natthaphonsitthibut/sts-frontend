import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  lastRequestTo,
  restoreApiStub,
  stubApiRequests,
  type RecordedRequest,
} from "../../../test/api-stub";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { StudentListPage } from "./StudentListPage";

const SCHOOL_FIXTURES = {
  one: {
    data: [
      {
        id: 101,
        name: "โรงเรียนหนึ่ง",
        province: "กรุงเทพมหานคร",
        district: "เขตหนึ่ง",
        subDistrict: "แขวงหนึ่ง",
      },
    ],
  },
  many: {
    data: [
      {
        id: 101,
        name: "โรงเรียนหนึ่ง",
        province: "กรุงเทพมหานคร",
        district: "เขตหนึ่ง",
        subDistrict: "แขวงหนึ่ง",
      },
      {
        id: 202,
        name: "โรงเรียนสอง",
        province: "กรุงเทพมหานคร",
        district: "เขตสอง",
        subDistrict: "แขวงสอง",
      },
    ],
  },
} as const;

function renderStudentList(
  schools: (typeof SCHOOL_FIXTURES)[keyof typeof SCHOOL_FIXTURES],
): RecordedRequest[] {
  const requests = stubApiRequests({
    "/attendance/schools": schools,
    "/attendance/grade-levels": [],
    "/student-statuses": {
      data: [
        {
          code: 1,
          labelTh: "กำลังศึกษา",
          category: "STUDYING",
          isActiveForLogin: true,
          isEnabled: true,
          sortOrder: 1,
        },
      ],
      meta: { page: 1, limit: 50, totalCount: 1, totalPages: 1 },
    },
    "/students": {
      data: [],
      meta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
    },
    "/students/filter-options": { data: { grades: [], rooms: [] } },
  });
  useAuthSessionStore.setState({
    user: {
      id: "student-list-test-actor",
      username: "student-list-test-actor",
      roles: [],
      permissions: [],
      data_scope:
        schools.data.length === 1
          ? { school_ids: [schools.data[0].id] }
          : { global: true },
    },
  } as never);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/students"]}>
        <StudentListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return requests;
}

afterEach(() => {
  restoreApiStub();
});

describe("student list school scope", () => {
  it("implies the only scoped school without showing a school picker", async () => {
    const requests = renderStudentList(SCHOOL_FIXTURES.one);

    await waitFor(() =>
      expect(lastRequestTo(requests, "/students")).toBeDefined(),
    );
    expect(lastRequestTo(requests, "/students")?.params.schoolId).toBe("101");
    expect(screen.queryByLabelText("กรองตามโรงเรียน")).toBeNull();
  });

  it("requires a school before querying a multi-school roster", async () => {
    const requests = renderStudentList(SCHOOL_FIXTURES.many);

    expect(await screen.findByText("เลือกโรงเรียน")).toBeTruthy();
    expect(lastRequestTo(requests, "/students")).toBeUndefined();
    expect(
      (screen.getByRole("button", { name: "รีเฟรช" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByPlaceholderText("ค้นหาจังหวัด")).toBeNull();
    expect(screen.queryByPlaceholderText("ค้นหาอำเภอ/เขต")).toBeNull();

    fireEvent.click(screen.getByLabelText("กรองตามโรงเรียน"));
    fireEvent.click(await screen.findByRole("button", { name: "โรงเรียนสอง" }));

    await waitFor(() =>
      expect(lastRequestTo(requests, "/students")?.params.schoolId).toBe("202"),
    );
  });
});
