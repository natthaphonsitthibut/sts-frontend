interface IdentityMethodChoiceProps {
  araIdDescription: string;
  disabled?: boolean;
  emailDescription: string;
  emailLabel?: string;
  onChooseAraId: () => void;
  onChooseEmail: () => void;
}

export function IdentityMethodChoice({
  araIdDescription,
  disabled = false,
  emailDescription,
  emailLabel = "อีเมล",
  onChooseAraId,
  onChooseEmail,
}: IdentityMethodChoiceProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-araid-action hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-araid-action motion-reduce:transform-none motion-reduce:transition-none disabled:cursor-wait disabled:opacity-60"
        disabled={disabled}
        onClick={onChooseAraId}
        type="button"
      >
        <span className="flex size-14 items-center justify-center">
          <img
            alt=""
            className="size-14 rounded-xl object-cover"
            src="/branding/araid-logo.png"
          />
        </span>
        <span className="mt-4 block font-bold text-slate-900">AraID</span>
        <span className="mt-1 block min-h-10 text-sm leading-5 text-slate-500">
          {araIdDescription}
        </span>
      </button>
      <button
        className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none motion-reduce:transition-none disabled:cursor-wait disabled:opacity-60"
        disabled={disabled}
        onClick={onChooseEmail}
        type="button"
      >
        <span className="flex size-14 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <img alt="" className="h-7 w-9" src="/brand-icons/gmail.svg" />
        </span>
        <span className="mt-4 block font-bold text-slate-900">
          {emailLabel}
        </span>
        <span className="mt-1 block min-h-10 text-sm leading-5 text-slate-500">
          {emailDescription}
        </span>
      </button>
    </div>
  );
}
