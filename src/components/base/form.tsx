import type { ComponentProps, ReactNode } from "react";
import {
  FormProvider,
  useFormContext,
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
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>{children}</form>
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
