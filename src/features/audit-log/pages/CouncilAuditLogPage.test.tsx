import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CouncilAuditLogPage } from "./CouncilAuditLogPage";

const { auditPanelProps, schoolFilter } = vi.hoisted(() => ({
  auditPanelProps: vi.fn(),
  schoolFilter: vi.fn(),
}));

vi.mock("../../../components/layout/page-primitives", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ListPageToolbar: () => <div />,
}));
vi.mock("../../school-filter/hooks/useGlobalSchoolFilter", () => ({
  useGlobalSchoolFilter: schoolFilter,
}));
vi.mock("../components/AuditLogPanel", () => ({
  AuditLogPanel: (props: { schoolId?: number }) => {
    auditPanelProps(props);
    return <div />;
  },
}));

describe("CouncilAuditLogPage", () => {
  beforeEach(() => {
    auditPanelProps.mockClear();
    schoolFilter.mockReset();
  });

  it("shows all permitted schools until the central filter selects one", () => {
    schoolFilter.mockReturnValue({
      province: "",
      district: "",
      subDistrict: "",
      schoolId: "",
    });
    const view = render(<CouncilAuditLogPage />);
    expect(auditPanelProps.mock.lastCall?.[0].schoolId).toBeUndefined();

    schoolFilter.mockReturnValue({
      province: "เชียงใหม่",
      district: "",
      subDistrict: "",
      schoolId: "123",
    });
    view.rerender(<CouncilAuditLogPage />);
    expect(auditPanelProps.mock.lastCall?.[0]).toMatchObject({
      province: "เชียงใหม่",
      schoolId: 123,
    });
  });
});
