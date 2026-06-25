import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
        ghost:
          "border border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-950",
        destructive: "bg-danger text-white shadow-sm hover:bg-danger-700",
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
