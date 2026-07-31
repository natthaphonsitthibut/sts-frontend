import { useMemo, useState } from "react";
import { Settings } from "lucide-react";
import { Badge } from "../../../components/base";
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
import { SettingsTabs } from "../../../components/layout/settings-tabs";
import { getApiErrorMessage } from "../../../lib/api-error";
import {
  useSystemSettings,
  useUpdateSetting,
} from "../hooks/useSystemSettings";

export function SystemSettingsPage() {
  const { settings, isLoading, isError, refetch } = useSystemSettings();
  const updateSetting = useUpdateSetting();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{
    key: string;
    message: string;
  } | null>(null);
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

  const groupedSettings = useMemo(() => {
    const groups: { title: string | null; items: typeof filteredSettings }[] = [];
    for (const setting of filteredSettings) {
      const title = setting.group ?? null;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.title === title) {
        lastGroup.items.push(setting);
      } else {
        groups.push({ title, items: [setting] });
      }
    }
    return groups;
  }, [filteredSettings]);

  function handleSave(key: string, value: string): void {
    setSavingKey(key);
    setSaveError(null);
    updateSetting.mutate(
      { key, payload: { value } },
      {
        onError: (error) => {
          setSaveError({
            key,
            message: getApiErrorMessage(error, "บันทึกการตั้งค่าไม่สำเร็จ"),
          });
        },
        onSettled: () => setSavingKey(null),
      },
    );
  }

  return (
    <PageShell>
      <PageToolbar
        navigation={<SettingsTabs />}
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
        <EmptyState
          description="ยังไม่มีรายการตั้งค่าในระบบ"
          icon={Settings}
          title="ไม่มีรายการตั้งค่า"
        />
      ) : filteredSettings.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="ไม่พบการตั้งค่าที่ค้นหา"
          description="ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูรายการทั้งหมด"
        />
      ) : (
        <div className="space-y-6">
          {groupedSettings.map((group, groupIndex) => (
            <section
              className="rounded-lg border border-slate-200 bg-white p-4"
              key={group.title ?? `no-group-${groupIndex}`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {group.title ?? "ทั่วไป"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    ตั้งค่าที่อยู่ในกลุ่มเดียวกันเพื่อให้ตรวจสอบผลกระทบได้ง่าย
                  </p>
                </div>
                <Badge variant="secondary">
                  {group.items.length.toLocaleString("th-TH")} รายการ
                </Badge>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {group.items.map((setting) => (
                  <SystemSettingCard
                    errorMessage={
                      saveError?.key === setting.setting_key
                        ? saveError.message
                        : null
                    }
                    isSaving={savingKey === setting.setting_key}
                    key={setting.setting_key}
                    onSave={handleSave}
                    setting={setting}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
