import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "../../../components/base";
import { taskService } from "../api/task.service";
import { buildLineShareUrl, copyText, formatDateTime } from "../lib/task-presentation";
import type { TaskDelegationResponse } from "../types/task.types";

export function DelegatePage() {
  const { token = "" } = useParams<{ token: string }>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState(24);
  const [result, setResult] = useState<TaskDelegationResponse | null>(null);

  const delegate = useMutation({
    mutationFn: () =>
      taskService.delegateTask(token, {
        expires_in_hours: hours,
        new_assignee_name: name.trim(),
        new_assignee_phone: phone.trim() || null,
      }),
    onSuccess: setResult,
    throwOnError: false,
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-[640px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>มอบหมายภารกิจให้ผู้อื่น</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {delegate.isError ? (
              <Alert variant="destructive">
                <AlertDescription>ส่งต่อภารกิจไม่สำเร็จ กรุณาตรวจสอบข้อมูล</AlertDescription>
              </Alert>
            ) : null}

            {result ? (
              <div className="space-y-4">
                <Alert variant="success">
                  <AlertDescription>
                    ส่งต่อสำเร็จ ลิงก์หมดอายุ {formatDateTime(result.expires_at)}
                  </AlertDescription>
                </Alert>
                <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
                  {result.magic_link}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button icon={Copy} onClick={() => copyText(result.magic_link)} variant="outline">
                    คัดลอก
                  </Button>
                  <a
                    className={buttonVariants({ variant: "outline" })}
                    href={buildLineShareUrl(result.magic_link)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    แชร์ผ่าน LINE
                  </a>
                </div>
                {result.qr_code_data ? (
                  <img alt="QR Code" className="mx-auto size-48" src={result.qr_code_data} />
                ) : null}
              </div>
            ) : (
              <>
                <label className="block space-y-2 text-sm font-medium">
                  ชื่อผู้รับงาน
                  <Input onChange={(event) => setName(event.target.value)} value={name} />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  เบอร์โทรศัพท์
                  <Input onChange={(event) => setPhone(event.target.value)} value={phone} />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  อายุลิงก์ใหม่ (ชั่วโมง)
                  <Input
                    min={1}
                    onChange={(event) => setHours(Number(event.target.value) || 1)}
                    type="number"
                    value={hours}
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    disabled={!name.trim()}
                    isLoading={delegate.isPending}
                    loadingText="กำลังส่งต่อ"
                    onClick={() => delegate.mutate()}
                  >
                    ส่งต่อภารกิจ
                  </Button>
                  <Link
                    className={buttonVariants({ variant: "outline" })}
                    to={`/task/${token}`}
                  >
                    ย้อนกลับ
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
