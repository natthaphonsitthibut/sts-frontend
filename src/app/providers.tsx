import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import {
  appToast,
  type AppToastMutationMeta,
} from "../components/base/app-toast";
import { router } from "./router";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      const meta = mutation.meta as AppToastMutationMeta | undefined;
      if (!meta?.suppressSuccessToast) {
        appToast.success(meta?.successMessage ?? "บันทึกแล้ว");
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        closeButton
        position="top-right"
        toastOptions={{
          classNames: {
            success: "border-success-200 bg-success-100 text-success-700",
            error: "border-danger-200 bg-danger-100 text-danger-700",
            info: "border-primary/20 bg-primary-soft text-primary-dark",
          },
        }}
      />
    </QueryClientProvider>
  );
}
