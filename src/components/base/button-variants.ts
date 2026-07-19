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
          "border border-primary/30 bg-primary-soft text-primary-dark shadow-sm hover:border-primary/50 hover:bg-primary/15 hover:shadow",
        outline:
          "border border-primary/30 bg-white text-slate-800 shadow-sm hover:border-primary/50 hover:bg-primary-soft hover:text-primary-dark hover:shadow",
        ghost:
          "border border-primary/10 bg-primary-soft text-primary-dark hover:border-primary/30 hover:bg-primary/15",
        destructive:
          "border border-transparent bg-danger text-white shadow-sm hover:bg-danger-700",
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
