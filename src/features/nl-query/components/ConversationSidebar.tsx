import { useState, type KeyboardEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  IconButton,
  Input,
  Skeleton,
  useConfirm,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import { useNlConversations } from "../hooks/useNlConversations";
import type { ConversationSummary } from "../types/nl-query.types";

interface ConversationSidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  /** Called after a conversation was deleted, so the page can leave it. */
  onDeleted: (id: string) => void;
}

export function ConversationSidebar({
  activeId,
  onSelect,
  onNew,
  onDeleted,
}: ConversationSidebarProps) {
  const {
    conversations,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    rename,
    remove,
  } = useNlConversations();
  const { confirm, dialog } = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startRename(conversation: ConversationSummary) {
    setEditingId(conversation.id);
    setDraft(conversation.title);
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>, id: string) {
    if (event.key === "Escape") {
      setEditingId(null);
      return;
    }
    if (event.key !== "Enter") return;
    const title = draft.trim();
    if (!title) return;
    rename.mutate({ id, title });
    setEditingId(null);
  }

  async function onDelete(id: string) {
    const ok = await confirm({
      title: "ลบบทสนทนานี้?",
      description: "ประวัติของบทสนทนานี้จะถูกลบและกู้คืนไม่ได้",
      confirmText: "ลบ",
      variant: "destructive",
    });
    if (!ok) return;
    await remove.mutateAsync(id);
    onDeleted(id);
  }

  return (
    <nav aria-label="ประวัติการสนทนา" className="flex h-full flex-col gap-3">
      <Button icon={Plus} onClick={onNew} size="sm" type="button">
        แชตใหม่
      </Button>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : null}

      {isError ? (
        <Alert variant="warning">
          <AlertDescription>โหลดประวัติไม่สำเร็จ</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && conversations.length === 0 ? (
        <p className="px-1 text-sm text-content-secondary">
          ยังไม่มีประวัติการสนทนา
        </p>
      ) : null}

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const active = conversation.id === activeId;
          return (
            <li
              className={cn(
                "group flex items-center gap-1 rounded-md pr-1",
                active ? "bg-brand-soft" : "hover:bg-slate-100",
              )}
              key={conversation.id}
            >
              {editingId === conversation.id ? (
                <Input
                  aria-label="ชื่อบทสนทนา"
                  autoFocus
                  maxLength={120}
                  onBlur={() => setEditingId(null)}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => onRenameKeyDown(event, conversation.id)}
                  value={draft}
                />
              ) : (
                <>
                  <button
                    aria-current={active ? "true" : undefined}
                    className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm text-content-primary"
                    onClick={() => onSelect(conversation.id)}
                    title={conversation.title}
                    type="button"
                  >
                    {conversation.title}
                  </button>
                  <IconButton
                    aria-label="เปลี่ยนชื่อบทสนทนา"
                    icon={Pencil}
                    onClick={() => startRename(conversation)}
                    size="sm"
                  />
                  <IconButton
                    aria-label="ลบบทสนทนา"
                    icon={Trash2}
                    onClick={() => void onDelete(conversation.id)}
                    size="sm"
                  />
                </>
              )}
            </li>
          );
        })}
      </ul>

      {hasNextPage ? (
        <Button
          onClick={() => void fetchNextPage()}
          size="sm"
          type="button"
          variant="outline"
        >
          โหลดเพิ่มเติม
        </Button>
      ) : null}
      {dialog}
    </nav>
  );
}
