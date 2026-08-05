import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  // Press cue is a 1px translate, not a scale — scaling rasterizes the label
  // text mid-transition and reads as a font glitch on non-retina screens.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition duration-150 ease-out active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow",
        secondary:
          "border border-slate-200 bg-slate-200 text-slate-900 shadow-none hover:border-slate-300 hover:bg-slate-300 hover:text-slate-900",
        outline:
          "border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-primary-soft hover:text-primary-dark hover:shadow",
        ghost:
          "border border-slate-300 bg-primary-soft text-primary-dark hover:border-slate-400 hover:bg-slate-100",
        destructive:
          "border border-transparent bg-danger text-white shadow-sm hover:bg-danger-700",
        contact:
          "border border-transparent bg-success text-white shadow-sm hover:bg-success-700 hover:shadow",
        location:
          "border border-transparent bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-6",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
    },
  },
);
