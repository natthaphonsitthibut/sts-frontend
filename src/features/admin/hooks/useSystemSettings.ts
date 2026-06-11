import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../api/admin.service";
import type {
  SettingsUpdatePayload,
  SettingsUpdateResponse,
  SystemSetting,
} from "../types/admin.types";

export const SYSTEM_SETTINGS_QUERY_KEY = "system-settings";

const EMPTY_SETTINGS: SystemSetting[] = [];

interface UseSystemSettingsResult {
  settings: SystemSetting[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useSystemSettings(): UseSystemSettingsResult {
  const result = useQuery({
    queryKey: [SYSTEM_SETTINGS_QUERY_KEY],
    queryFn: adminService.getSettings,
  });

  return {
    settings: result.data ?? EMPTY_SETTINGS,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}

interface UpdateSettingVariables {
  key: string;
  payload: SettingsUpdatePayload;
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation<SettingsUpdateResponse, Error, UpdateSettingVariables>({
    mutationFn: ({ key, payload }) => adminService.updateSetting(key, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [SYSTEM_SETTINGS_QUERY_KEY],
      });
    },
  });
}
