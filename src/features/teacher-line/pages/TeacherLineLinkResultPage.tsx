import { CheckCircle2, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, Button } from "../../../components/base";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";

type Outcome =
  | "success"
  | "not_friend"
  | "teacher_already_linked"
  | "already_linked_to_another_teacher"
  | "expired"
  | "failed";

const OUTCOME_COPY: Record<Outcome, { title: string; description: string }> = {
  success: {
    title: "เชื่อมบัญชี LINE สำเร็จ",
    description:
      "ต่อจากนี้โรงเรียนจะส่งลิงก์เช็คชื่อของคุณครูทาง LINE ได้เลย ปิดหน้านี้ได้เลยครับ/ค่ะ",
  },
  not_friend: {
    title: "อีกขั้นเดียว — เพิ่มเพื่อนก่อน",
    description:
      "ยังไม่ได้เพิ่มบัญชีทางการของโรงเรียนเป็นเพื่อน ระบบจึงส่งข้อความหาคุณครูไม่ได้ กดเพิ่มเพื่อนแล้วกลับมาเชื่อมอีกครั้ง",
  },
  teacher_already_linked: {
    title: "บัญชีครูเชื่อม LINE แล้ว",
    description:
      "ระบบคงการเชื่อมต่อเดิมไว้ หากต้องการเปลี่ยนบัญชี LINE กรุณาให้ผู้ดูแลระบบปลดการเชื่อมต่อก่อน",
  },
  already_linked_to_another_teacher: {
    title: "บัญชี LINE นี้ถูกใช้ไปแล้ว",
    description:
      "บัญชี LINE นี้ผูกกับข้อมูลครูท่านอื่นอยู่ หากคิดว่าไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบของโรงเรียน",
  },
  expired: {
    title: "การยืนยันหมดอายุ",
    description: "ใช้เวลานานเกินไป กรุณาเริ่มยืนยันอีเมลใหม่อีกครั้ง",
  },
  failed: {
    title: "เชื่อมบัญชีไม่สำเร็จ",
    description:
      "การเชื่อมบัญชีถูกยกเลิกหรือเกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
  },
};

function resolveOutcome(value: string | null): Outcome {
  return value && value in OUTCOME_COPY ? (value as Outcome) : "failed";
}

/** Where the LINE callback lands the browser. Reads only non-secret hints. */
export function TeacherLineLinkResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const outcome = resolveOutcome(params.get("status"));
  const addContactUrl = params.get("addUrl");
  const copy = OUTCOME_COPY[outcome];

  return (
    <MagicAuthCard showProfile={false} title={copy.title}>
      <div className="space-y-4">
        {outcome === "success" ? (
          <Alert variant="success">
            <AlertDescription className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
              {copy.description}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert
            variant={
              outcome === "not_friend" || outcome === "teacher_already_linked"
                ? "warning"
                : "destructive"
            }
          >
            <AlertDescription>{copy.description}</AlertDescription>
          </Alert>
        )}

        {outcome === "not_friend" && addContactUrl ? (
          <Button
            fullWidth
            icon={UserPlus}
            onClick={() => {
              window.location.href = addContactUrl;
            }}
          >
            เพิ่มเพื่อนบัญชีทางการ
          </Button>
        ) : null}

        {outcome === "success" ||
        outcome === "teacher_already_linked" ? null : (
          <Button
            fullWidth
            onClick={() => void navigate("/line-link")}
            variant="outline"
          >
            เริ่มใหม่อีกครั้ง
          </Button>
        )}
      </div>
    </MagicAuthCard>
  );
}
