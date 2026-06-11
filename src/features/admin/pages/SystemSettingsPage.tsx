import { useMemo, useState } from "react";
import { Settings } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonStack,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { SystemSettingCard } from "../components/SystemSettingCard";
import {
  useSystemSettings,
  useUpdateSetting,
} from "../hooks/useSystemSettings";

export function SystemSettingsPage() {
  const { settings, isLoading, isError, refetch } = useSystemSettings();
  const updateSetting = useUpdateSetting();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSettings = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return settings;
    }
    return settings.filter((setting) =>
      [
        setting.setting_key,
        setting.setting_value,
        setting.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [settings, searchQuery]);

  function handleSave(
    key: string,
    value: string,
    description?: string | null,
  ): void {
    setSavingKey(key);
    updateSetting.mutate(
      { key, payload: { value, description } },
      { onSettled: () => setSavingKey(null) },
    );
  }

  return (
    <PageShell maxWidthClassName="max-w-[1100px]">
      <PageToolbar
        icon={Settings}
        title="ตั้งค่าระบบ"
        description="กำหนดพารามิเตอร์หลักที่ส่งผลต่อพฤติกรรมของระบบ"
      >
        <ToolbarControls>
          <SearchInput
            onChange={setSearchQuery}
            placeholder="ค้นหาชื่อการตั้งค่าหรือค่า..."
            value={searchQuery}
          />
        </ToolbarControls>
      </PageToolbar>

      {isError ? (
        <ErrorState
          title="ไม่สามารถโหลดการตั้งค่าได้"
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลการตั้งค่า"
          onRetry={refetch}
        />
      ) : isLoading ? (
        <SkeletonStack lines={5} />
      ) : settings.length === 0 ? (
        <EmptyState icon={Settings} title="ไม่มีรายการตั้งค่า" />
      ) : filteredSettings.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="ไม่พบการตั้งค่าที่ค้นหา"
          description="ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูรายการทั้งหมด"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredSettings.map((setting) => (
            <SystemSettingCard
              isSaving={savingKey === setting.setting_key}
              key={setting.setting_key}
              onSave={handleSave}
              setting={setting}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
