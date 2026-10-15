import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConfirm } from "./confirm-dialog";

function StickySidebar({ onResult }: { onResult: (value: boolean) => void }) {
  const { confirm, dialog } = useConfirm();
  return (
    <aside data-testid="sticky-sidebar" style={{ position: "sticky", top: 0 }}>
      <button
        onClick={() =>
          void confirm({ title: "ลบบทสนทนานี้?", confirmText: "ลบ" }).then(
            onResult,
          )
        }
      >
        ลบบทสนทนา
      </button>
      {dialog}
    </aside>
  );
}

describe("confirmation above sticky content", () => {
  it("escapes the sidebar and cancels with Escape without confirming", async () => {
    const onResult = vi.fn();
    render(<StickySidebar onResult={onResult} />);
    const trigger = screen.getByRole("button", { name: "ลบบทสนทนา" });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole("dialog");
    expect(
      screen.getByTestId("sticky-sidebar").contains(screen.getByRole("dialog")),
    ).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("only confirms after the affirmative button is pressed", async () => {
    const onResult = vi.fn();
    render(<StickySidebar onResult={onResult} />);
    fireEvent.click(screen.getByRole("button", { name: "ลบบทสนทนา" }));
    await screen.findByRole("dialog");
    expect(onResult).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "ลบ" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
