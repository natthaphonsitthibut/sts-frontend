import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, Button } from "../../../components/base";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { useAraIdSession } from "../../araid/hooks/useAraId";
import { teacherLineService } from "../api/teacher-line.service";

function readChallengeToken(): string {
  const value =
    new URLSearchParams(window.location.hash.slice(1))
      .get("challenge")
      ?.trim() ?? "";
  return /^[A-Za-z0-9_-]{32,128}$/.test(value) ? value : "";
}

export function TeacherLineAraIdAuthorizePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [challengeToken] = useState(readChallengeToken);
  const session = useAraIdSession();
  const challenge = useQuery({
    queryKey: ["line-link", "araid-challenge", challengeToken, "authorize"],
    queryFn: () => teacherLineService.getAraIdChallenge(challengeToken),
    enabled: Boolean(challengeToken),
    retry: false,
  });
  const begin = useMutation({
    mutationFn: () => teacherLineService.beginAraIdChallenge(challengeToken),
    meta: { suppressSuccessToast: true },
  });
  const approve = useMutation({
    mutationFn: teacherLineService.approveAraIdChallenge,
    meta: { suppressSuccessToast: true },
  });

  useEffect(() => {
    if (
      !challengeToken ||
      challenge.isPending ||
      challenge.isError ||
      !challenge.data
    )
      return;
    // Claim on every visit, not only while the challenge is still PENDING: a
    // rescan or a second browser finds it CLAIMED, and the server renews the
    // authorization for that visit instead of leaving it with no cookie to
    // approve with.
    if (!begin.isSuccess) {
      if (begin.isIdle) begin.mutate();
      return;
    }
    if (session.isPending) return;
    if (!session.data) {
      void navigate("/araid/login", {
        replace: true,
        state: {
          challengeToken,
          returnTo: `${location.pathname}${location.hash}`,
          verificationIntent: "LINE_LINK_QR",
        },
      });
      return;
    }
    if (approve.isIdle) approve.mutate();
  }, [
    approve,
    begin,
    challenge.data,
    challenge.isError,
    challenge.isPending,
    challengeToken,
    location.hash,
    location.pathname,
    navigate,
    session.data,
    session.isPending,
  ]);

  if (!challengeToken) {
    return (
      <MagicAuthCard showProfile={false} title="คำขอ AraID ไม่ถูกต้อง">
        <Alert variant="warning">
          <AlertDescription>
            ลิงก์ยืนยันไม่ถูกต้อง กรุณาสร้าง QR ใหม่
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  if (
    challenge.isError ||
    begin.isError ||
    (challenge.data?.status === "APPROVED" && !approve.isSuccess)
  ) {
    return (
      <MagicAuthCard showProfile={false} title="คำขอ AraID หมดอายุแล้ว">
        <Alert variant="warning">
          <AlertDescription>
            QR และลิงก์ชุดนี้ใช้งานไม่ได้แล้ว กรุณากลับไปสร้าง QR ใหม่
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  if (approve.isError) {
    return (
      <MagicAuthCard showProfile={false} title="ยืนยันผ่าน AraID ไม่สำเร็จ">
        <Alert variant="destructive">
          <AlertDescription>
            ข้อมูล AraID ไม่ตรงกับครูในโรงเรียนของลิงก์ หรือเวลาทำรายการหมดแล้ว
          </AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          fullWidth
          onClick={() => void navigate("/araid/home")}
        >
          กลับหน้าหลัก AraID
        </Button>
      </MagicAuthCard>
    );
  }

  if (approve.isSuccess) {
    return (
      <MagicAuthCard showProfile={false} title="ยืนยันผ่าน AraID สำเร็จ">
        <Alert variant="success">
          <AlertDescription>
            กลับไปยังหน้าที่แสดง QR ระบบจะดำเนินการต่อให้อัตโนมัติ
          </AlertDescription>
        </Alert>
      </MagicAuthCard>
    );
  }

  return (
    <MagicAuthCard
      showProfile={false}
      subtitle="กำลังตรวจสอบข้อมูลครู…"
      title="ยืนยันผ่าน AraID"
    >
      <div
        aria-hidden="true"
        className="h-11 animate-pulse rounded-lg bg-slate-100"
      />
    </MagicAuthCard>
  );
}
