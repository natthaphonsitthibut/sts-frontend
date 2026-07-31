import { cva } from "class-variance-authority";

export const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-lg transition duration-150 ease-out active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-slate-300 bg-white text-primary-dark hover:border-slate-400 hover:bg-primary-soft",
        edit:
          "border border-transparent bg-primary text-white shadow-sm hover:bg-primary-dark [&>svg]:transition-transform [&>svg]:duration-150 [&>svg]:ease-out hover:[&>svg]:scale-110 motion-reduce:[&>svg]:transition-none motion-reduce:hover:[&>svg]:scale-100",
        delete:
          "border border-transparent bg-danger-400 text-white shadow-sm hover:bg-danger-700 [&>svg]:transition-transform [&>svg]:duration-150 [&>svg]:ease-out hover:[&>svg]:scale-110 motion-reduce:[&>svg]:transition-none motion-reduce:hover:[&>svg]:scale-100",
        credential:
          "border border-transparent bg-credential text-white shadow-sm hover:bg-credential-dark [&>svg]:transition-transform [&>svg]:duration-150 [&>svg]:ease-out hover:[&>svg]:scale-110 motion-reduce:[&>svg]:transition-none motion-reduce:hover:[&>svg]:scale-100",
        share:
          "border border-transparent bg-share text-white shadow-sm hover:bg-share-dark [&>svg]:transition-transform [&>svg]:duration-150 [&>svg]:ease-out hover:[&>svg]:scale-110 motion-reduce:[&>svg]:transition-none motion-reduce:hover:[&>svg]:scale-100",
        view:
          "border border-transparent bg-view text-white shadow-sm hover:bg-view-dark [&>svg]:transition-transform [&>svg]:duration-150 [&>svg]:ease-out hover:[&>svg]:scale-110 motion-reduce:[&>svg]:transition-none motion-reduce:hover:[&>svg]:scale-100",
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
