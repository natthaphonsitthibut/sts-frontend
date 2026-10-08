import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  lastRequestTo,
  restoreApiStub,
  stubApiRequests,
  type RecordedRequest,
} from "../../../test/api-stub";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { useSchoolFilterStore } from "../../school-filter/store/school-filter.store";
import { ImportDataPage } from "./ImportDataPage";

const CATALOG = {
  version: "1",
  targets: [
    {
      target: "student_term",
      version: "1",
      label: "ข้อมูลนักเรียน",
      capability: "import-data",
      allowed: true,
      dependencyOrder: 1,
      dependsOn: [],
      canonicalContext: [
        { key: "schoolId", label: "โรงเรียน", referenceSource: "schools" },
        {
          key: "schoolTermId",
          label: "ภาคเรียน",
          referenceSource: "school_terms",
        },
      ],
      fields: [],
    },
  ],
};

const QUARANTINE_URL = "/imports/quarantine";
const KNOWN_REASON = "IDENTIFIER_CONFLICT";

function renderQuarantinePageAt(url: string): RecordedRequest[] {
  const requests = stubApiRequests({
    [QUARANTINE_URL]: {
      items: [],
      meta: { page: 1, limit: 20, totalCount: 0 },
    },
    "/imports/quarantine-lookups": {
      reasons: [{ code: KNOWN_REASON, label: "เลขประจำตัวประชาชนซ้ำ" }],
      resolutionStates: [],
      statuses: [{ code: "PENDING", label: "รอตรวจสอบ" }],
    },
    "/imports/catalog": { targets: [] },
  });
  useAuthSessionStore.setState({
    user: {
      id: "test-actor",
      username: "test-actor",
      roles: ["admin"],
      permissions: [],
    },
  } as never);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <ImportDataPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return requests;
}

function renderImportPage(schoolId: string, schoolName: string) {
  useAuthSessionStore.setState({
    user: { id: 1, roles: ["admin"], permissions: ["import-data"] },
  } as never);
  useSchoolFilterStore.setState({
    userId: 1,
    province: "จังหวัดทดสอบ",
    district: "อำเภอทดสอบ",
    subDistrict: "ตำบลทดสอบ",
    schoolId,
    schoolName,
  });
  const requests = stubApiRequests({
    "/imports/catalog": CATALOG,
    "/imports/quarantine-lookups": {
      reasons: [],
      statuses: [],
      resolutionStates: [],
    },
    "/attendance/terms": {
      data: [{ id: 5, academicYear: 2569, semester: 1, status: "ACTIVE" }],
    },
    "/public/locations": { provinces: [], districts: [], subDistricts: [] },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={["/import-data?importSchoolId=11&importTermId=5"]}
      >
        <ImportDataPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return requests;
}

afterEach(() => {
  restoreApiStub();
  useSchoolFilterStore.getState().clearAll();
  useAuthSessionStore.setState({ user: null } as never);
});

describe("import destination scope", () => {
  it("uses the header school and clears the old term when that school changes", async () => {
    const requests = renderImportPage("11", "โรงเรียน ก");
    await waitFor(() => expect(screen.getByText(/โรงเรียน ก/)).toBeTruthy());
    expect(
      screen.queryByRole("combobox", { name: "ค้นหาโรงเรียน" }),
    ).toBeNull();
    expect(screen.queryByRole("combobox", { name: "ค้นหาจังหวัด" })).toBeNull();
    const term = screen.getByRole("textbox", { name: "เลือกภาคเรียน" });
    await waitFor(() =>
      expect((term as HTMLInputElement).value).toBe("ปี 2569 / ภาค 1"),
    );
    fireEvent.drop(screen.getByRole("button", { name: /ลากไฟล์มาวาง/ }), {
      dataTransfer: {
        files: [new File(["row"], "students.csv", { type: "text/csv" })],
      },
    });
    expect(screen.getByText("students.csv")).toBeTruthy();

    act(() => {
      useSchoolFilterStore.getState().setFilter({
        schoolId: "22",
        schoolName: "โรงเรียน ข",
      });
    });

    await waitFor(() => expect(screen.getByText(/โรงเรียน ข/)).toBeTruthy());
    await waitFor(() =>
      expect((term as HTMLInputElement).value).toBe("เลือกภาคเรียน"),
    );
    await waitFor(() => expect(screen.queryByText("students.csv")).toBeNull());
    expect(
      requests.some(
        (entry) =>
          entry.url === "/attendance/terms" && entry.params.schoolId === 22,
      ),
    ).toBe(true);
  });

  it("requires a school from the header before importing", async () => {
    renderImportPage("", "");
    await waitFor(() =>
      expect(
        screen.getByText(
          "กรุณาเลือกโรงเรียนจากตัวกรองกลางด้านบนก่อนอัปโหลดไฟล์",
        ),
      ).toBeTruthy(),
    );
    expect(
      screen
        .getByRole("textbox", { name: "เลือกภาคเรียน" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});

describe("import quarantine URL filters", () => {
  it("never forwards a reason code the API does not know", async () => {
    const requests = renderQuarantinePageAt(
      "/import-data/quarantine?quarantineReason=NOT_A_REASON&quarantinePage=0&quarantineLimit=999",
    );

    await waitFor(() =>
      expect(lastRequestTo(requests, QUARANTINE_URL)).toBeDefined(),
    );
    await waitFor(() =>
      expect(
        lastRequestTo(requests, "/imports/quarantine-lookups"),
      ).toBeDefined(),
    );
    const request = lastRequestTo(requests, QUARANTINE_URL);
    expect(request?.params.reasonCode).toBeUndefined();
    expect(request?.params.page).toBe(1);
    expect(request?.params.limit).toBe(20);
    expect(
      requests.some(
        (recorded) =>
          recorded.url === QUARANTINE_URL &&
          recorded.params.reasonCode === "NOT_A_REASON",
      ),
    ).toBe(false);
  });

  it("keeps a reason code the lookups confirm", async () => {
    const requests = renderQuarantinePageAt(
      `/import-data/quarantine?quarantineReason=${KNOWN_REASON}`,
    );

    await waitFor(() =>
      expect(lastRequestTo(requests, QUARANTINE_URL)?.params.reasonCode).toBe(
        KNOWN_REASON,
      ),
    );
  });
});
