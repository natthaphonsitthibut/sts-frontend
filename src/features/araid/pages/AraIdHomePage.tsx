import {
  ChevronRight,
  FileText,
  LogOut,
  Maximize2,
  RefreshCw,
  ScanLine,
  Settings,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AraIdAppShell } from "../components/AraIdAppShell";
import { useAraIdCopy } from "../hooks/useAraIdCopy";
import { useAraIdLogout, useAraIdSession } from "../hooks/useAraId";
import type { AraIdSessionProfile } from "../types/araid.types";

function SignedOutCard() {
  const { copy } = useAraIdCopy();
  return (
    <div className="max-w-lg rounded-xl bg-white p-6 text-left shadow-sm md:p-8">
      <h2 className="text-lg font-bold text-araid-brand-deep">
        {copy.home.signedOutTitle}
      </h2>
      <p className="mt-2 text-sm text-araid-text-muted">
        {copy.home.signedOutDescription}
      </p>
      <Link
        to="/araid/login"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-araid-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-araid-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-araid-brand"
      >
        {copy.common.signIn}
      </Link>
    </div>
  );
}

function IdentityCard({
  profile,
  expanded,
}: {
  profile: AraIdSessionProfile;
  expanded: boolean;
}) {
  const { copy } = useAraIdCopy();
  return (
    <section
      className={`relative aspect-[1.58/1] w-full overflow-hidden rounded-xl bg-araid-card text-araid-card-ink shadow-araid-card transition-[max-width] duration-200 motion-reduce:transition-none ${expanded ? "max-w-[38rem]" : "max-w-[34rem]"}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 araid-card-flag" />
      <div className="grid h-full grid-cols-[minmax(0,1fr)_4.5rem] gap-2.5 p-3 pt-4 sm:grid-cols-[minmax(0,1fr)_6.5rem] sm:gap-4 sm:p-5 sm:pt-6">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.6875rem] font-semibold leading-tight text-araid-card-ink sm:text-sm">
                {copy.home.cardTitle}
              </p>
              <p className="mt-0.5 text-[0.5625rem] leading-tight text-slate-600 sm:text-xs">
                {copy.home.cardSubtitle}
              </p>
            </div>
            <span className="hidden whitespace-nowrap text-[0.5625rem] font-semibold text-araid-brand sm:block sm:text-xs">
              {copy.home.cardEnglishTitle}
            </span>
          </div>
          <p className="mt-3 text-[0.5625rem] text-slate-600 sm:mt-5 sm:text-xs">
            {copy.home.fullName}
          </p>
          <p className="truncate text-xs font-bold leading-tight sm:text-base">
            {profile.titleTh}
            {profile.givenNameTh} {profile.familyNameTh}
          </p>
          <p className="mt-1 truncate text-[0.5625rem] text-slate-600 sm:text-xs">
            {profile.givenNameEn || profile.givenNameTh}{" "}
            {profile.familyNameEn || profile.familyNameTh}
          </p>
          <p className="mt-2 text-[0.5625rem] leading-tight text-slate-600 sm:mt-3 sm:text-xs">
            {copy.home.identityNumber}
          </p>
          <p className="font-mono text-[0.6875rem] tracking-wide text-araid-card-ink sm:text-sm">
            {profile.identityNumberMasked}
          </p>
          <div className="mt-2 flex gap-5 text-[0.5625rem] leading-tight text-slate-600 sm:mt-3 sm:text-xs">
            <span>
              {copy.home.birthDate}
              <br />
              <b className="text-araid-card-ink">
                {profile.dateOfBirth || copy.common.notAvailable}
              </b>
            </span>
            <span>
              {copy.home.province}
              <br />
              <b className="text-araid-card-ink">
                {profile.provinceName || copy.common.notAvailable}
              </b>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-end gap-2 pb-1">
          <span className="grid aspect-[3/4] w-full place-items-center rounded-md bg-araid-card-photo text-araid-brand-mid ring-2 ring-white">
            <UserRound className="size-9 sm:size-14" strokeWidth={1.25} />
          </span>
          <ScanLine
            className="size-5 text-araid-brand-mid sm:size-6"
            strokeWidth={1.5}
          />
        </div>
      </div>
    </section>
  );
}

export function AraIdHomePage() {
  const navigate = useNavigate();
  const { copy } = useAraIdCopy();
  const profileQuery = useAraIdSession();
  const logout = useAraIdLogout();
  const profile = profileQuery.data;
  const [cardExpanded, setCardExpanded] = useState(false);

  async function signOut() {
    await logout.mutateAsync();
    void navigate("/araid/login", { replace: true });
  }

  return (
    <AraIdAppShell>
      <div className="bg-araid-brand-mid text-white">
        {/* Full-bleed app bar: capping this at 90rem parked the sign-out button
            mid-air on wide screens instead of at the edge of the content area. */}
        <div className="w-full px-4 pb-6 pt-3 sm:px-6 md:px-8 md:pb-8 md:pt-5 lg:px-10">
          <header className="flex min-h-12 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-araid-brand ring-1 ring-white/70 md:size-12">
              <UserRound className="size-6 md:size-7" strokeWidth={1.55} />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs leading-none text-white/85">
                {copy.home.greeting}
                {profile ? (
                  <span className="ml-2 rounded-full bg-success px-2 py-0.5 text-[0.625rem] font-bold uppercase text-white">
                    {copy.home.online}
                  </span>
                ) : null}
              </p>
              <h1 className="mt-1 truncate text-base font-bold md:text-lg">
                {profile
                  ? `${profile.titleTh ?? ""}${profile.givenNameTh} ${profile.familyNameTh}`
                  : "AraID"}
              </h1>
            </div>
            {profile ? (
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label={copy.common.signOut}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-araid-brand text-white transition-colors hover:bg-araid-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
                disabled={logout.isPending}
              >
                <LogOut className="size-5" />
              </button>
            ) : null}
          </header>

          {profile ? (
            <div className="mt-5 md:mt-7">
              <IdentityCard profile={profile} expanded={cardExpanded} />
              <div className="mt-3 flex max-w-[34rem] items-center justify-center gap-3">
                <button
                  type="button"
                  aria-pressed={cardExpanded}
                  onClick={() => setCardExpanded((expanded) => !expanded)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-araid-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-araid-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Maximize2 className="size-4" />
                  {copy.home.expandCard}
                </button>
                <button
                  type="button"
                  aria-label={copy.home.refreshCard}
                  onClick={() => void profileQuery.refetch()}
                  className="grid size-10 place-items-center rounded-full bg-araid-brand text-white transition-colors hover:bg-araid-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <RefreshCw
                    className={`size-4 ${profileQuery.isFetching ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-full bg-araid-surface px-4 pb-8 pt-7 sm:px-6 md:px-8 md:pt-9 lg:px-10">
        {/* Same gutters as the app bar above, so the two never drift apart. */}
        <div className="w-full">
          {profileQuery.isLoading ? (
            <div className="h-48 max-w-lg animate-pulse rounded-xl bg-white" />
          ) : !profile ? (
            <SignedOutCard />
          ) : (
            <section>
              <h2 className="text-base font-bold text-slate-900 md:text-lg">
                {copy.home.services}
              </h2>
              <div className="mt-4 grid max-w-4xl gap-3 md:grid-cols-2 md:gap-4">
                <Link
                  to="/araid/documents"
                  className="flex min-h-[4.75rem] items-center gap-3 rounded-xl bg-white p-4 shadow-araid-subtle transition-colors hover:bg-araid-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-araid-brand"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-araid-surface-icon text-araid-brand">
                    <FileText className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {copy.home.documents}
                    </span>
                    <span className="mt-0.5 block text-xs text-araid-text-muted">
                      {copy.home.documentsDescription}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-slate-400" />
                </Link>
                <Link
                  to="/araid/settings"
                  className="flex min-h-[4.75rem] items-center gap-3 rounded-xl bg-white p-4 shadow-araid-subtle transition-colors hover:bg-araid-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-araid-brand"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-araid-surface-icon text-araid-brand">
                    <Settings className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {copy.home.settings}
                    </span>
                    <span className="mt-0.5 block text-xs text-araid-text-muted">
                      {copy.home.settingsDescription}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-slate-400" />
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </AraIdAppShell>
  );
}
