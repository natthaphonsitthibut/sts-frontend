import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AxiosError } from "axios";
import { Bot, LoaderCircle, Search, User } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  Input,
} from "../../../components/base";
import {
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { cn } from "../../../lib/utils";
import { useNlQuery } from "../hooks/useNlQuery";
import { QueryResult } from "../components/QueryResult";
import type { QueryEnvelope } from "../types/nl-query.types";

const EXAMPLE_QUESTIONS = [
  "จำนวนนักเรียนปัจจุบันแยกตามโรงเรียน",
  "นักเรียนทั้งหมดมีกี่คน",
  "จำนวนนักเรียนแยกตามระดับชั้น",
  "โรงเรียนใดมีนักเรียนมากที่สุด 10 อันดับ",
];

const CHAT_BOTTOM_GAP_PX = 24;
const CHAT_MIN_HEIGHT_PX = 360;

function transportErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401)
      return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    if (error.response?.status === 403) return "ไม่มีสิทธิ์ใช้งานฟีเจอร์นี้";
  }
  return "บริการไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง";
}

function ChatRow({
  role,
  children,
}: {
  role: "user" | "agent";
  children: ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-slate-200 text-slate-700" : "bg-primary text-white",
        )}
      >
        {isUser ? (
          <User className="size-4" aria-hidden="true" />
        ) : (
          <Bot className="size-4" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1 pt-1">{children}</div>
    </div>
  );
}

function TurnAnswer({ envelope }: { envelope: QueryEnvelope }) {
  if (envelope.status === "error") {
    return (
      <Alert variant="warning">
        <AlertTitle>ไม่สามารถตอบคำถามนี้ได้</AlertTitle>
        <AlertDescription>
          {envelope.error?.message ?? "กรุณาปรับคำถามแล้วลองใหม่อีกครั้ง"}
        </AlertDescription>
      </Alert>
    );
  }

  if (envelope.answer_type === "clarification") {
    return (
      <Alert>
        <AlertTitle>ต้องการข้อมูลเพิ่มเติม</AlertTitle>
        <AlertDescription>{envelope.message}</AlertDescription>
      </Alert>
    );
  }

  if (envelope.answer_type === "refusal") {
    return (
      <Alert variant="warning">
        <AlertTitle>ไม่สามารถให้ข้อมูลนี้ได้</AlertTitle>
        <AlertDescription>{envelope.message}</AlertDescription>
      </Alert>
    );
  }

  return <QueryResult envelope={envelope} />;
}

function EmptyChatState({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft">
        <Bot className="size-7 text-primary" aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-semibold text-content-primary">
          ถามข้อมูลด้วยภาษาไทยได้เลย
        </p>
        <p className="mt-1 text-sm text-content-secondary">
          ระบบจะแปลงคำถามภาษาไทยเป็นข้อมูลสรุป ตาราง หรือกราฟให้โดยอัตโนมัติ
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUESTIONS.map((example) => (
          <Button
            key={example}
            onClick={() => onPick(example)}
            size="sm"
            type="button"
            variant="outline"
          >
            {example}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function NlQueryPage() {
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const { ask, turnsLog, loading, error, reset } = useNlQuery();
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const chatCardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatHeight, setChatHeight] = useState<number>();

  useEffect(() => {
    if (error) {
      errorAlertRef.current?.focus();
    }
  }, [error]);

  useLayoutEffect(() => {
    function recompute() {
      const top = chatCardRef.current?.getBoundingClientRect().top;
      if (top === undefined) return;
      setChatHeight(
        Math.max(
          CHAT_MIN_HEIGHT_PX,
          window.innerHeight - top - CHAT_BOTTOM_GAP_PX,
        ),
      );
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [turnsLog.length, pendingQuestion]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setQuestion("");
    setPendingQuestion(trimmed);
    const envelope = await ask(trimmed);
    setPendingQuestion(null);
    if (!envelope) {
      // Transport/network failure — give the question back so the user
      // doesn't have to retype it to retry.
      setQuestion(trimmed);
    }
  }

  const hasTurns = turnsLog.length > 0;

  return (
    <PageShell contentClassName="max-w-4xl">
      <PageToolbar
        title="ถามข้อมูลด้วยภาษาไทย"
        actions={
          hasTurns ? (
            <Button onClick={reset} size="sm" type="button" variant="outline">
              เริ่มบทสนทนาใหม่
            </Button>
          ) : undefined
        }
      />
      <Card
        className="flex flex-col overflow-hidden"
        ref={chatCardRef}
        style={{ height: chatHeight }}
      >
        <div
          aria-live="polite"
          aria-relevant="additions"
          className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6"
          data-testid="nlq-chat-log"
          ref={scrollRef}
        >
          {!hasTurns && !pendingQuestion ? (
            <EmptyChatState onPick={setQuestion} />
          ) : null}

          {turnsLog.map((turn, index) => (
            <div className="space-y-4" key={`${index}-${turn.question}`}>
              <ChatRow role="user">
                <p className="font-medium text-content-primary">
                  {turn.question}
                </p>
              </ChatRow>
              <ChatRow role="agent">
                <TurnAnswer envelope={turn.envelope} />
              </ChatRow>
            </div>
          ))}

          {pendingQuestion ? (
            <div className="space-y-4">
              <ChatRow role="user">
                <p className="font-medium text-content-primary">
                  {pendingQuestion}
                </p>
              </ChatRow>
              <ChatRow role="agent">
                <span className="inline-flex items-center gap-2 text-sm text-content-secondary">
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                  กำลังค้นหา…
                </span>
              </ChatRow>
            </div>
          ) : null}
        </div>

        {error ? (
          <div
            className="border-t border-slate-200 p-4"
            ref={errorAlertRef}
            tabIndex={-1}
          >
            <Alert variant="destructive">
              <AlertTitle>ไม่สามารถเชื่อมต่อบริการได้</AlertTitle>
              <AlertDescription>
                {transportErrorMessage(error)}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <form
          className="flex items-center gap-3 border-t border-slate-200 p-4"
          onSubmit={submit}
        >
          <Input
            aria-label="คำถาม"
            autoComplete="off"
            maxLength={500}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="เช่น จำนวนนักเรียนปัจจุบันแยกตามโรงเรียน"
            value={question}
          />
          <Button
            className="shrink-0"
            disabled={!question.trim()}
            icon={Search}
            isLoading={loading}
            loadingText="กำลังค้นหา…"
            type="submit"
          >
            ถามข้อมูล
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
