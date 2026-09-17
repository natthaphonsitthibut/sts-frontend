import { useEffect, useRef, useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { Search } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "../../../components/base";
import {
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { useNlQuery } from "../hooks/useNlQuery";
import { QueryResult } from "../components/QueryResult";
import type { QueryEnvelope } from "../types/nl-query.types";

const EXAMPLE_QUESTIONS = [
  "จำนวนนักเรียนปัจจุบันแยกตามโรงเรียน",
  "นักเรียนทั้งหมดมีกี่คน",
  "จำนวนนักเรียนแยกตามระดับชั้น",
  "โรงเรียนใดมีนักเรียนมากที่สุด 10 อันดับ",
];

function transportErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401)
      return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    if (error.response?.status === 403) return "ไม่มีสิทธิ์ใช้งานฟีเจอร์นี้";
  }
  return "บริการไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง";
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

export function NlQueryPage() {
  const [question, setQuestion] = useState("");
  const { ask, turnsLog, loading, error, reset } = useNlQuery();
  const errorAlertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      errorAlertRef.current?.focus();
    }
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    const envelope = await ask(trimmed);
    if (envelope) {
      setQuestion("");
    }
  }

  return (
    <PageShell contentClassName="max-w-6xl">
      <PageToolbar title="ถามข้อมูลด้วยภาษาไทย" />
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>พิมพ์คำถามที่ต้องการทราบ</CardTitle>
            <p className="text-sm text-content-secondary">
              ระบบจะแปลงคำถามภาษาไทยเป็นข้อมูลสรุป ตาราง หรือกราฟให้โดยอัตโนมัติ
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="flex flex-col gap-3 sm:flex-row">
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
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-content-secondary">
                  ตัวอย่าง:
                </span>
                {EXAMPLE_QUESTIONS.map((example) => (
                  <Button
                    key={example}
                    onClick={() => setQuestion(example)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {example}
                  </Button>
                ))}
              </div>
              {loading ? (
                <p aria-live="polite" className="sr-only">
                  กำลังค้นหา…
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {error ? (
          <div ref={errorAlertRef} tabIndex={-1}>
            <Alert variant="destructive">
              <AlertTitle>ไม่สามารถเชื่อมต่อบริการได้</AlertTitle>
              <AlertDescription>
                {transportErrorMessage(error)}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {turnsLog.length > 0 ? (
          <Button onClick={reset} size="sm" type="button" variant="outline">
            เริ่มบทสนทนาใหม่
          </Button>
        ) : null}

        <div aria-live="polite" aria-relevant="additions" className="space-y-5">
          {turnsLog.map((turn, index) => (
            <div className="space-y-2" key={`${index}-${turn.question}`}>
              <p className="text-sm font-medium text-content-secondary">
                {turn.question}
              </p>
              <TurnAnswer envelope={turn.envelope} />
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
