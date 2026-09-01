import { useState, type FormEvent } from "react";
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

export function NlQueryPage() {
  const [question, setQuestion] = useState("");
  const query = useNlQuery();

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || query.isPending) return;
    query.mutate({ question: trimmed });
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
                  isLoading={query.isPending}
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
            </form>
          </CardContent>
        </Card>

        {query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>ไม่สามารถเชื่อมต่อบริการได้</AlertTitle>
            <AlertDescription>
              {transportErrorMessage(query.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        {query.data?.status === "error" ? (
          <Alert variant="warning">
            <AlertTitle>ไม่สามารถตอบคำถามนี้ได้</AlertTitle>
            <AlertDescription>
              {query.data.error?.message ?? "กรุณาปรับคำถามแล้วลองใหม่อีกครั้ง"}
            </AlertDescription>
          </Alert>
        ) : null}

        {query.data?.status === "ok" ? (
          <QueryResult envelope={query.data} />
        ) : null}
      </div>
    </PageShell>
  );
}
