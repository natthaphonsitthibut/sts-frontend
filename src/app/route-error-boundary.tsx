import { AlertTriangle } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button, Card, CardContent } from "../components/base";

/**
 * Last resort for an error no feature boundary caught.
 *
 * Without an `errorElement` React Router falls back to its own developer screen
 * — a raw minified stack and "Hey developer 👋" — which is what a user of the
 * production build was seeing. This keeps the failure legible and, more to the
 * point, offers the action that actually recovers it: a reload.
 *
 * Deliberately built from the eagerly-bundled base components. A backstop that
 * needs a lazy chunk to render is no backstop when chunk loading is the failure.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-[520px] rounded-lg">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mb-4 rounded-full bg-danger-100 p-4 text-danger-700">
            <AlertTriangle className="size-10" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            หน้านี้ทำงานผิดพลาด
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            ระบบยังไม่ได้บันทึกอะไรผิดพลาด กรุณาโหลดหน้านี้ใหม่อีกครั้ง
            ถ้ายังเจอซ้ำ ๆ กรุณาแจ้งผู้ดูแลระบบพร้อมบอกว่าอยู่หน้าไหน
          </p>
          {detail ? (
            <p className="mt-4 max-w-full truncate text-xs text-slate-400">
              {detail}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => window.location.reload()}>
              โหลดหน้านี้ใหม่
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              กลับหน้าหลัก
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
