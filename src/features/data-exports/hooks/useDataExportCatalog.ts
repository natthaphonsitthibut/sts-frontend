import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDataExportJob,
  downloadDataExportJob,
  fetchDataExportCatalog,
  fetchDataExportJobs,
} from "../api/data-export.service";

export function useDataExportCatalog() {
  return useQuery({
    queryKey: ["data-exports", "catalog"],
    queryFn: fetchDataExportCatalog,
    staleTime: 60_000,
  });
}

export function useDataExportJobs() {
  return useQuery({
    queryKey: ["data-exports", "jobs"],
    queryFn: fetchDataExportJobs,
    refetchInterval: (query) =>
      query.state.data?.some((job) => job.status === "PENDING" || job.status === "RUNNING")
        ? 2_000
        : false,
  });
}

export function useCreateDataExportJob() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "สร้างงานส่งออกแล้ว" },
    mutationFn: createDataExportJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["data-exports", "jobs"] });
    },
  });
}

export function useDownloadDataExportJob() {
  return useMutation({
    meta: { suppressSuccessToast: true },
    mutationFn: downloadDataExportJob,
  });
}
