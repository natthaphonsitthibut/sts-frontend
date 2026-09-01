import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error("chart update loop");
  return <div>เนื้อหาปกติ</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs a caught error to console.error by design; the boundary adds
    // its own line. Silence both so a passing run stays readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("keeps a throwing subtree from reaching the router", () => {
    render(
      <ErrorBoundary title="แสดงกราฟไม่สำเร็จ">
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText("แสดงกราฟไม่สำเร็จ")).toBeTruthy();
    expect(screen.queryByText("เนื้อหาปกติ")).toBeNull();
  });

  it("renders the subtree again when the retry action is used", () => {
    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <>
          <button onClick={() => setExplode(false)}>ซ่อมข้อมูล</button>
          <ErrorBoundary>
            <Boom explode={explode} />
          </ErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    expect(screen.queryByText("เนื้อหาปกติ")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "ซ่อมข้อมูล" }));
    fireEvent.click(screen.getByRole("button", { name: "ลองโหลดอีกครั้ง" }));

    expect(screen.getByText("เนื้อหาปกติ")).toBeTruthy();
  });

  it("clears itself when the scope it was rendered for changes", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="?province=เชียงใหม่">
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("เนื้อหาปกติ")).toBeNull();

    rerender(
      <ErrorBoundary resetKey="?province=ตาก">
        <Boom explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("เนื้อหาปกติ")).toBeTruthy();
  });
});
