import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarDays } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ChartCard } from "./ChartCard";

describe("dashboard chart request states", () => {
  it("shows loading instead of empty or stale data", () => {
    render(
      <ChartCard
        description="ยังไม่มีการเช็กชื่อ"
        icon={CalendarDays}
        title="การมาเรียน"
        queryState={{ isLoading: true, isError: false, onRetry: vi.fn() }}
      >
        <p>ข้อมูลเดิม</p>
      </ChartCard>,
    );
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีการเช็กชื่อ")).toBeNull();
    expect(screen.queryByText("ข้อมูลเดิม")).toBeNull();
  });

  it("reports request failure and retries without claiming there are no records", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ChartCard
        description="ยังไม่มีการเช็กชื่อ"
        icon={CalendarDays}
        title="การมาเรียน"
        footer={<p>คำอธิบายข้อมูลเดิม</p>}
        queryState={{ isLoading: false, isError: true, onRetry }}
      >
        <p>ไม่มีข้อมูล</p>
      </ChartCard>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByText("ไม่มีข้อมูล")).toBeNull();
    expect(screen.queryByText("คำอธิบายข้อมูลเดิม")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(
      <ChartCard
        description="มีข้อมูลแล้ว"
        icon={CalendarDays}
        title="การมาเรียน"
        queryState={{ isLoading: false, isError: false, onRetry }}
      >
        <p>ข้อมูลล่าสุด</p>
      </ChartCard>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("ข้อมูลล่าสุด")).toBeTruthy();
  });
});
