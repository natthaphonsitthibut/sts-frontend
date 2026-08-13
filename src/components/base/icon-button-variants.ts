import { cva } from "class-variance-authority";

/** Shared glyph motion used by every icon-only action. */
const ICON_MOTION =
  "[&>svg]:transition-transform [&>svg]:duration-150 [&>svg]:ease-out hover:[&>svg]:scale-110 motion-reduce:[&>svg]:transition-none motion-reduce:hover:[&>svg]:scale-100";

/**
 * Solid semantic action: filled surface, white glyph, matching hover motion.
 * `surface` must contain the literal utilities (including the `hover:` prefix)
 * so Tailwind's source scanner still sees every class it has to emit.
 */
function solid(surface: string): string {
  return `border border-transparent ${surface} text-white shadow-sm`;
}

export const iconButtonVariants = cva(
  `inline-flex shrink-0 items-center justify-center rounded-lg transition duration-150 ease-out active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${ICON_MOTION}`,
  {
    variants: {
      variant: {
        default:
          "border border-slate-300 bg-white text-primary-dark hover:border-slate-400 hover:bg-primary-soft",
        edit: solid("bg-primary hover:bg-primary-dark"),
        delete: solid("bg-brand-red-alt hover:bg-danger"),
        credential: solid("bg-credential hover:bg-credential-dark"),
        share: solid("bg-share hover:bg-share-dark"),
        view: solid("bg-primary hover:bg-primary-dark"),
        contact: solid("bg-success hover:bg-success-700"),
        location: solid("bg-primary hover:bg-primary-dark"),
        comment: solid("bg-ink hover:bg-slate-800"),
        /** Closing a link — destructive, so it reads in the danger tone. */
        lock: solid("bg-brand-red-alt hover:bg-danger"),
        /** Re-opening a closed link — restorative, so it reads in the success tone. */
        unlock: solid("bg-success hover:bg-success-700"),
        secondary:
          "border border-slate-300 bg-white text-primary-dark hover:border-slate-400 hover:bg-primary-soft",
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-primary-soft hover:text-primary-dark",
        ghost:
          "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-primary-soft hover:text-primary-dark",
      },
      size: {
        sm: "size-8",
        md: "size-10",
        lg: "size-11",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);
