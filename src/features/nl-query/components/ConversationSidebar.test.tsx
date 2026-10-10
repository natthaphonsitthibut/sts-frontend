import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNlConversations } from "../hooks/useNlConversations";
import { ConversationSidebar } from "./ConversationSidebar";

vi.mock("../hooks/useNlConversations", () => ({
  useNlConversations: vi.fn(),
}));

const mockedUseNlConversations = vi.mocked(useNlConversations);

const items = [
  {
    id: "c1",
    title: "จำนวนนักเรียนแยกตามโรงเรียน",
    created_at: "2026-10-10T01:00:00.000Z",
    updated_at: "2026-10-10T02:00:00.000Z",
  },
  {
    id: "c2",
    title: "นักเรียนเสี่ยงสูง",
    created_at: "2026-10-09T01:00:00.000Z",
    updated_at: "2026-10-09T02:00:00.000Z",
  },
];

function state(overrides: Record<string, unknown> = {}) {
  return {
    conversations: items,
    isLoading: false,
    isError: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    rename: { mutate: vi.fn(), mutateAsync: vi.fn() },
    remove: {
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  } as never;
}

function renderSidebar(
  props: Partial<Parameters<typeof ConversationSidebar>[0]> = {},
) {
  const handlers = {
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onDeleted: vi.fn(),
  };
  const view = render(
    <ConversationSidebar activeId={null} {...handlers} {...props} />,
  );
  return { view, handlers };
}

describe("ConversationSidebar", () => {
  beforeEach(() => {
    mockedUseNlConversations.mockReturnValue(state());
  });

  it("lists conversation titles and selects one on click", () => {
    const { view, handlers } = renderSidebar();

    fireEvent.click(view.getByText("นักเรียนเสี่ยงสูง"));

    expect(handlers.onSelect).toHaveBeenCalledWith("c2");
  });

  it("marks the open conversation with aria-current", () => {
    const { view } = renderSidebar({ activeId: "c1" });

    expect(
      view
        .getByText("จำนวนนักเรียนแยกตามโรงเรียน")
        .closest("button")
        ?.getAttribute("aria-current"),
    ).toBe("true");
    expect(
      view
        .getByText("นักเรียนเสี่ยงสูง")
        .closest("button")
        ?.getAttribute("aria-current"),
    ).toBeNull();
  });

  it("shows an empty state when there is no history", () => {
    mockedUseNlConversations.mockReturnValue(state({ conversations: [] }));
    const { view } = renderSidebar();

    expect(view.getByText("ยังไม่มีประวัติการสนทนา")).toBeTruthy();
  });

  it("shows an error message when the list cannot load", () => {
    mockedUseNlConversations.mockReturnValue(
      state({ conversations: [], isError: true }),
    );
    const { view } = renderSidebar();

    expect(view.getByText("โหลดประวัติไม่สำเร็จ")).toBeTruthy();
  });

  it("starts a new chat from the header button", () => {
    const { view, handlers } = renderSidebar();

    fireEvent.click(view.getByRole("button", { name: "แชตใหม่" }));

    expect(handlers.onNew).toHaveBeenCalled();
  });

  it("renames on Enter with the trimmed title and ignores a blank one", () => {
    const rename = { mutate: vi.fn(), mutateAsync: vi.fn() };
    mockedUseNlConversations.mockReturnValue(state({ rename }));
    const { view } = renderSidebar();

    fireEvent.click(
      view.getAllByRole("button", { name: "เปลี่ยนชื่อบทสนทนา" })[0],
    );
    const input = view.getByRole("textbox", { name: "ชื่อบทสนทนา" });
    expect((input as HTMLInputElement).value).toBe(
      "จำนวนนักเรียนแยกตามโรงเรียน",
    );

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(rename.mutate).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "  ชื่อใหม่  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(rename.mutate).toHaveBeenCalledWith({ id: "c1", title: "ชื่อใหม่" });
  });

  it("cancels renaming with Escape", () => {
    const rename = { mutate: vi.fn(), mutateAsync: vi.fn() };
    mockedUseNlConversations.mockReturnValue(state({ rename }));
    const { view } = renderSidebar();

    fireEvent.click(
      view.getAllByRole("button", { name: "เปลี่ยนชื่อบทสนทนา" })[0],
    );
    fireEvent.keyDown(view.getByRole("textbox", { name: "ชื่อบทสนทนา" }), {
      key: "Escape",
    });

    expect(view.queryByRole("textbox", { name: "ชื่อบทสนทนา" })).toBeNull();
    expect(rename.mutate).not.toHaveBeenCalled();
  });

  it("deletes only after the user confirms", async () => {
    const remove = {
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    };
    mockedUseNlConversations.mockReturnValue(state({ remove }));
    const { view, handlers } = renderSidebar();

    fireEvent.click(view.getAllByRole("button", { name: "ลบบทสนทนา" })[1]);
    await waitFor(() => expect(view.getByText("ลบบทสนทนานี้?")).toBeTruthy());
    expect(remove.mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(view.getByRole("button", { name: "ลบ" }));

    await waitFor(() => expect(remove.mutateAsync).toHaveBeenCalledWith("c2"));
    await waitFor(() => expect(handlers.onDeleted).toHaveBeenCalledWith("c2"));
  });

  it("does nothing when the user cancels the delete", async () => {
    const remove = {
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    };
    mockedUseNlConversations.mockReturnValue(state({ remove }));
    const { view, handlers } = renderSidebar();

    fireEvent.click(view.getAllByRole("button", { name: "ลบบทสนทนา" })[0]);
    await waitFor(() => expect(view.getByText("ลบบทสนทนานี้?")).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(view.queryByText("ลบบทสนทนานี้?")).toBeNull());
    expect(remove.mutateAsync).not.toHaveBeenCalled();
    expect(handlers.onDeleted).not.toHaveBeenCalled();
  });

  it("offers 'load more' only when another page exists", () => {
    const fetchNextPage = vi.fn();
    mockedUseNlConversations.mockReturnValue(
      state({ hasNextPage: true, fetchNextPage }),
    );
    const first = renderSidebar();
    fireEvent.click(first.view.getByRole("button", { name: "โหลดเพิ่มเติม" }));
    expect(fetchNextPage).toHaveBeenCalled();
    first.view.unmount();

    mockedUseNlConversations.mockReturnValue(state({ hasNextPage: false }));
    const second = renderSidebar();
    expect(
      second.view.queryByRole("button", { name: "โหลดเพิ่มเติม" }),
    ).toBeNull();
  });
});
