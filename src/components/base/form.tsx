import type { ComponentProps, ReactNode } from "react";
import {
  FormProvider,
  useFormContext,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { cn } from "../../lib/utils";
import { Label } from "./label";

export interface FormProps<TFieldValues extends FieldValues> {
  children: ReactNode;
  form: UseFormReturn<TFieldValues>;
  onSubmit: (values: TFieldValues) => void | Promise<void>;
}

export function Form<TFieldValues extends FieldValues>({
  children,
  form,
  onSubmit,
}: FormProps<TFieldValues>) {
  // On a failed submit, scroll to and focus the first invalid field so the user
  // is taken straight to what is missing instead of scrolling to find it. Shared
  // here so every form gets the same behaviour.
  function scrollToFirstError(errors: FieldErrors<TFieldValues>): void {
    const firstName = Object.keys(errors)[0];
    if (!firstName) {
      return;
    }
    const field = document.querySelector(`[name="${firstName}"]`);
    if (field instanceof HTMLElement) {
      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.focus({ preventScroll: true });
    }
  }

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}>
        {children}
      </form>
    </FormProvider>
  );
}

export function FormItem({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export interface FormLabelProps extends ComponentProps<"label"> {
  required?: boolean;
}

export function FormLabel({ children, required, ...props }: FormLabelProps) {
  return (
    <Label {...props}>
      {children}
      {required ? <span className="ml-1 text-red-600">*</span> : null}
    </Label>
  );
}

export interface FormMessageProps<TFieldValues extends FieldValues>
  extends ComponentProps<"p"> {
  name?: FieldPath<TFieldValues>;
}

export function FormMessage<TFieldValues extends FieldValues>({
  className,
  name,
  ...props
}: FormMessageProps<TFieldValues>) {
  const {
    formState: { errors },
  } = useFormContext<TFieldValues>();

  const error = name ? errors[name] : undefined;
  const message = typeof error?.message === "string" ? error.message : "";

  // Always render (reserving one line) so toggling the message on/off does not
  // shift sibling fields and bounce the layout while typing.
  return (
    <p
      aria-live="polite"
      className={cn("min-h-5 text-sm font-medium text-red-600", className)}
      {...props}
    >
      {message}
    </p>
  );
}
