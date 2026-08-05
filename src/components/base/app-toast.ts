import { toast } from "sonner";

export interface AppToastMutationMeta {
  successMessage?: string;
  suppressSuccessToast?: boolean;
}

/** The single feature-facing notification API. */
export const appToast = {
  success(message: string): void {
    toast.success(message);
  },
  error(message: string): void {
    toast.error(message);
  },
  info(message: string): void {
    toast.info(message);
  },
};
