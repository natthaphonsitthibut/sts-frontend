import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Select } from "../base/select";
import { ListPageToolbar } from "./page-primitives";

describe("prerequisite toolbar controls", () => {
  it("closes an open portal when controls become unavailable and keeps controlled search", () => {
    const toolbar = (controlsHidden: boolean) => (
      <MemoryRouter initialEntries={["/manage-users"]}>
        <ListPageToolbar
          controlsHidden={controlsHidden}
          title="จัดการผู้ใช้งาน"
          search={{
            value: "คำค้นหา",
            onChange: () => {},
            placeholder: "ค้นหา",
            after: (
              <Select aria-label="บทบาท">
                <option value="all">ทุกบทบาท</option>
              </Select>
            ),
          }}
        />
      </MemoryRouter>
    );
    const { rerender } = render(toolbar(false));
    fireEvent.click(screen.getByRole("button", { name: "บทบาท" }));
    expect(screen.getByRole("listbox")).toBeTruthy();
    rerender(toolbar(true));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    rerender(toolbar(false));
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
      "คำค้นหา",
    );
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
