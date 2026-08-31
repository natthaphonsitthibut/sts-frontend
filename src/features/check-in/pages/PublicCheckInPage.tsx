import { useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { School } from "lucide-react";
import { FormErrorAlert } from "../../../components/base";
import { appConfig } from "../../../config/env";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import {
  EmptyState,
  ErrorState,
  PageToolbar,
  SearchInput,
  SkeletonCards,
} from "../../../components/layout/page-primitives";
import { PAGE_ICONS } from "../../../components/layout/page-identity";
import { ClassroomCard } from "../../school-structure/components/ClassroomCard";
import { ClassroomCardDialog } from "../../school-structure/components/ClassroomCardDialog";
import { AraIdQrChallengeView } from "../../auth/components/AraIdQrChallengeView";
import { IdentityMethodChoice } from "../../auth/components/IdentityMethodChoice";
import { DevelopmentGoogleEmailForm } from "../../auth/components/DevelopmentGoogleEmailForm";
import { MagicAuthCard } from "../../auth/components/MagicAuthCard";
import { CheckInWorkspace } from "../components/CheckInWorkspace";
import type { CheckInContext } from "../types/check-in.types";
import { checkInService } from "../api/check-in.service";

const LINK_HOME = "/classroom";
const CLASSROOM_ICON = PAGE_ICONS["school-building"];

let publicContextRevision = 0;

function initialToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return fragment.get("token")?.trim() || undefined;
}

/**
 * The link's home — the same classroom cards as ห้องเรียนทั้งหมด, narrowed to
 * the rooms this teacher's subjects reach.
 *
 * The shared `ClassroomCard` rather than a card of its own: this was how the
 * retired teacher-link workspace did it, and a second design for the same
 * object is how two pages drift apart. The colour and cover are editable here
 * and write the room's own record, so a change made from either page shows on
 * both. Favourites stay off — those hang on a user account, and a link has none.
 */
function LinkClassroomsPage({
  classrooms,
}: {
  classrooms: CheckInContext["classrooms"];
}) {
  const [search, setSearch] = useState("");
  // Two offerings in one room can carry the same subject name — two maths sets,
  // say. The code is what tells them apart, so it appears only where the name
  // alone would leave the teacher guessing which card is which.
  const ambiguous = useMemo(() => {
    const seen = new Map<string, number>();
    for (const item of classrooms) {
      const key = `${item.id}:${item.subjectNames ?? ""}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return seen;
  }, [classrooms]);
  function subtitle(item: CheckInContext["classrooms"][number]): string {
    const name = item.subjectNames ?? "ยังไม่ระบุวิชา";
    const repeated =
      (ambiguous.get(`${item.id}:${item.subjectNames ?? ""}`) ?? 0) > 1;
    return repeated && item.subjectCode
      ? `${name} · ${item.subjectCode}`
      : name;
  }
  const [customizing, setCustomizing] = useState<
    CheckInContext["classrooms"][number] | null
  >(null);
  const savePresentation = useMutation({
    mutationFn: checkInService.updateClassroomPresentation,
    meta: { suppressSuccessToast: true },
  });
  const queryClient = useQueryClient();
  async function save(
    input: Parameters<typeof checkInService.updateClassroomPresentation>[0],
  ): Promise<void> {
    await savePresentation.mutateAsync(input);
    // The cards come from the link context, so that is what has to be re-read.
    await queryClient.invalidateQueries({
      queryKey: ["check-in", "public-context"],
    });
  }
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classrooms;
    return classrooms.filter((classroom) =>
      `${classroom.gradeLabel}/${classroom.roomCode} ${classroom.roomName ?? ""} ${
        classroom.subjectNames ?? ""
      } ${classroom.subjectCode ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [classrooms, search]);

  return (
    <>
      <PageToolbar
        breadcrumbTrail={[{ label: "ห้องเรียนของฉัน", to: LINK_HOME }]}
        icon={CLASSROOM_ICON}
        title="ห้องเรียนของฉัน"
      />
      <SearchInput
        className="mb-8 sm:max-w-[560px]"
        onChange={setSearch}
        placeholder="ค้นหา"
        value={search}
      />
      {visible.length === 0 ? (
        <EmptyState
          description={
            search
              ? "ลองเปลี่ยนคำค้นหาหรือล้างช่องค้นหา"
              : "ลิงก์นี้ยังไม่มีห้องหรือรายวิชาที่เปิดใช้งานในภาคเรียนนี้"
          }
          icon={CLASSROOM_ICON}
          title={search ? "ไม่พบห้องเรียนที่ค้นหา" : "ยังไม่มีห้องเรียน"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((classroom) => (
            <ClassroomCard
              classroom={classroom}
              colorPending={savePresentation.isPending}
              favoritePending={false}
              key={`${classroom.id}:${classroom.classroomSubjectId}`}
              onColorChange={(item, cardCoverColor) =>
                void save({
                  classroomId: item.id,
                  cardCoverColor,
                  coverImagePositionX: item.coverImagePositionX,
                  coverImagePositionY: item.coverImagePositionY,
                  coverImageScale: item.coverImageScale,
                })
              }
              onCustomize={() => setCustomizing(classroom)}
              onFavoriteChange={() => undefined}
              showFavorite={false}
              subtitle={subtitle(classroom)}
              to={`${LINK_HOME}/check-in/${classroom.id}/${classroom.classroomSubjectId}`}
            />
          ))}
        </div>
      )}

      {customizing ? (
        <ClassroomCardDialog
          classroom={customizing}
          isSaving={savePresentation.isPending}
          key={customizing.id}
          onOpenChange={(open) => {
            if (!open) setCustomizing(null);
          }}
          open
          saveError={savePresentation.error}
          savePresentation={async (input) => {
            await save(input);
            setCustomizing(null);
          }}
        />
      ) : null}
    </>
  );
}

/** One lesson's check-in, reached from the card that named it. */
function LinkCheckInPage({
  assignment,
  classrooms,
}: {
  assignment: CheckInContext["assignment"];
  classrooms: CheckInContext["classrooms"];
}) {
  const { classroomId, classroomSubjectId } = useParams<{
    classroomId: string;
    classroomSubjectId: string;
  }>();
  const [searchParams] = useSearchParams();
  // The pair identifies the card, not just the room: a teacher can hold two
  // lessons in the same room, and they are two different registers.
  const classroom = classrooms.find(
    (item) =>
      item.id === classroomId &&
      String(item.classroomSubjectId) === classroomSubjectId,
  );
  if (!classroom) {
    return (
      <EmptyState
        icon={School}
        title="ไม่พบรายวิชานี้ในลิงก์"
        description="รายวิชานี้ไม่ได้อยู่ในวิชาที่คุณสอน กรุณากลับไปเลือกจากห้องเรียนของฉัน"
      />
    );
  }
  return (
    <>
      <PageToolbar
        // An assignment reaches one lesson and nothing else, so there is no
        // rooms page above it to walk back to.
        breadcrumbTrail={
          assignment
            ? undefined
            : [
                { label: "ห้องเรียนของฉัน", to: LINK_HOME },
                {
                  label: `${classroom.gradeLabel}/${classroom.roomCode} · ${
                    classroom.subjectNames ?? "ยังไม่ระบุวิชา"
                  }`,
                  to: `${LINK_HOME}/check-in/${classroom.id}/${classroom.classroomSubjectId}`,
                },
              ]
        }
        icon={CLASSROOM_ICON}
        title={
          classroom.subjectNames
            ? `${classroom.gradeLabel}/${classroom.roomCode} · ${classroom.subjectNames}`
            : `${classroom.gradeLabel}/${classroom.roomCode}`
        }
      />
      <CheckInWorkspace
        access="PUBLIC_LINK"
        assignment={assignment}
        classroomId={Number(classroom.id)}
        classroomSubjectId={classroom.classroomSubjectId}
        initialDate={searchParams.get("date") ?? undefined}
        key={`${classroom.id}:${classroom.classroomSubjectId}:${searchParams.get("date") ?? "today"}`}
      />
    </>
  );
}

export function PublicCheckInPage() {
  const [token, setToken] = useState(initialToken);
  const [tokenRevision, setTokenRevision] = useState(
    () => ++publicContextRevision,
  );
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [showDevelopmentGoogle, setShowDevelopmentGoogle] = useState(false);
  const handledApproval = useRef(false);
  const contextQuery = useQuery({
    queryKey: ["check-in", "public-context", Boolean(token), tokenRevision],
    queryFn: () => checkInService.getPublicContext(token),
    retry: false,
  });
  // Choosing an identity provider is a lookup, not a save: without this the
  // global mutation toast announces "บันทึกแล้ว" the moment the teacher picks
  // Gmail or AraID.
  const googleMutation = useMutation({
    meta: { suppressSuccessToast: true },
    mutationFn: async (email?: string) => {
      if (!token) throw new Error("กรุณาเปิดจากลิงก์ห้องเรียน");
      if (email) {
        await checkInService.verifyDevelopmentGoogle(token, email);
        return null;
      }
      return await checkInService.startGoogle(token);
    },
    onSuccess: (authorizationUrl) => {
      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
        return;
      }
      void contextQuery.refetch();
    },
  });
  const araIdMutation = useMutation({
    meta: { suppressSuccessToast: true },
    mutationFn: async () => {
      if (!token) throw new Error("กรุณาเปิดจากลิงก์ห้องเรียน");
      return await checkInService.createAraIdChallenge(token);
    },
    onSuccess: (challenge) => {
      handledApproval.current = false;
      setChallengeToken(challenge.challengeToken);
    },
  });
  const challenge = araIdMutation.data;
  const challengeStatus = useQuery({
    queryKey: ["check-in", "araid-challenge", challengeToken],
    queryFn: () => checkInService.pollAraIdChallenge(challengeToken!),
    enabled: Boolean(challengeToken),
    refetchInterval: (query) =>
      query.state.status === "error" ||
      query.state.data?.status === "APPROVED" ||
      (challenge?.expiresAt
        ? Date.now() >= new Date(challenge.expiresAt).getTime()
        : false)
        ? false
        : 2_000,
    retry: false,
  });
  const refetchContext = contextQuery.refetch;

  useEffect(() => {
    handledApproval.current = false;
  }, [challengeToken]);

  useEffect(() => {
    const refreshIncomingToken = () => {
      setToken(initialToken());
      setTokenRevision(++publicContextRevision);
    };
    window.addEventListener("hashchange", refreshIncomingToken);
    window.addEventListener("popstate", refreshIncomingToken);
    return () => {
      window.removeEventListener("hashchange", refreshIncomingToken);
      window.removeEventListener("popstate", refreshIncomingToken);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, [token]);

  useEffect(() => {
    if (challengeStatus.data?.status !== "APPROVED" || handledApproval.current)
      return;
    handledApproval.current = true;
    setChallengeToken(null);
    void refetchContext();
  }, [challengeStatus.data?.status, refetchContext]);

  const error =
    contextQuery.error ??
    googleMutation.error ??
    araIdMutation.error ??
    challengeStatus.error;
  const context = contextQuery.error ? undefined : contextQuery.data;

  if (contextQuery.isLoading) {
    return (
      <GuestPageShell as="main" showProfile={false}>
        <SkeletonCards count={4} />
      </GuestPageShell>
    );
  }

  if (!context) {
    return (
      <GuestPageShell
        as="main"
        centered
        contentClassName="max-w-lg"
        showProfile={false}
      >
        <ErrorState
          description="ลิงก์อาจหมดอายุ ถูกปิด หรือถูกสร้างใหม่แล้ว กรุณาขอลิงก์ใหม่จากโรงเรียน"
          onRetry={() => void contextQuery.refetch()}
          title="ลิงก์นี้ใช้งานไม่ได้"
        />
      </GuestPageShell>
    );
  }

  if (context.authentication.status === "REQUIRED" && challenge) {
    return (
      <AraIdQrChallengeView
        expiresAt={challenge.expiresAt}
        hasStatusError={challengeStatus.isError}
        isInProgress={challengeStatus.data?.status === "IN_PROGRESS"}
        isRefreshing={araIdMutation.isPending}
        onBack={() => {
          setChallengeToken(null);
          araIdMutation.reset();
        }}
        onRefresh={() => {
          setChallengeToken(null);
          void araIdMutation.mutateAsync().catch(() => undefined);
        }}
        qrDataUrl={challenge.qrDataUrl}
        referenceCode={challenge.referenceCode}
        schoolName={context.school.name}
        verificationUrl={challenge.verificationUrl}
      />
    );
  }

  if (context.authentication.status === "REQUIRED") {
    return (
      <MagicAuthCard
        cardContentClassName="min-h-[23.625rem]"
        showProfile={false}
        subtitle={`${context.school.name} · ${
          context.classrooms.length === 1
            ? `${context.classrooms[0].gradeLabel}/${context.classrooms[0].roomCode}`
            : `${context.classrooms.length} ห้องเรียน`
        }`}
        title="ยืนยันตัวตนเพื่อเข้าใช้งาน"
      >
        <div className="space-y-4">
          <FormErrorAlert
            error={error}
            fallback="ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่"
          />
          {showDevelopmentGoogle ? (
            <DevelopmentGoogleEmailForm
              isSubmitting={googleMutation.isPending}
              onBack={() => {
                googleMutation.reset();
                setShowDevelopmentGoogle(false);
              }}
              onSubmit={(email) => googleMutation.mutate(email)}
            />
          ) : (
            <IdentityMethodChoice
              araIdDescription="ยืนยันด้วย AraID และเลขประจำตัวที่ผูกกับข้อมูลครู"
              disabled={googleMutation.isPending || araIdMutation.isPending}
              emailDescription="ยืนยันด้วย Google และบัญชีของครู"
              emailLabel="Google"
              onChooseAraId={() => {
                void araIdMutation.mutateAsync().catch(() => undefined);
              }}
              onChooseEmail={() => {
                if (appConfig.isDevelopment) {
                  setShowDevelopmentGoogle(true);
                  return;
                }
                googleMutation.mutate(undefined);
              }}
            />
          )}
        </div>
      </MagicAuthCard>
    );
  }

  return (
    // Who is signed in belongs in the header popover, the same place it sits on
    // every other page — not in a banner pinned above the work.
    <GuestPageShell
      as="main"
      profileAffiliation={context.school.name}
      profileName={context.authentication.displayName}
      profilePhotoUrl={context.authentication.photoUrl}
      brandTo={LINK_HOME}
    >
      {/* A link can open onto several rooms now, so the room is chosen here
          rather than assumed. One room needs no choosing. */}
      <Routes>
        <Route
          element={
            context.assignment ? (
              // An assignment covers one lesson: landing on a picker holding a
              // single card would be a step that decides nothing.
              <Navigate
                replace
                to={`check-in/${context.assignment.classroomId}/${context.assignment.classroomSubjectId}`}
              />
            ) : (
              <LinkClassroomsPage classrooms={context.classrooms} />
            )
          }
          path="/"
        />
        <Route
          element={
            <LinkCheckInPage
              assignment={context.assignment}
              classrooms={context.classrooms}
            />
          }
          path="check-in/:classroomId/:classroomSubjectId"
        />
      </Routes>
    </GuestPageShell>
  );
}
