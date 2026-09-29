import { describe, expect, it, vi } from "vitest";
import { apiClient } from "../../../lib/api-client";
import { taskService } from "./task.service";

describe("task link photos", () => {
  it.each(["student-photo", "assignee-photo"])(
    "requests %s at the single /api prefix with the link session",
    async (photoKind) => {
      const photo = new Blob(["image"], { type: "image/png" });
      const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: photo });
      const path = `/api/tasks/link-placeholder/${photoKind}?v=1`;

      await expect(
        taskService.getLinkPhoto(path, "session-placeholder"),
      ).resolves.toBe(photo);

      const [requestUrl, config] = get.mock.calls[0];
      expect(apiClient.getUri({ url: requestUrl as string })).toBe(
        new URL(path, window.location.origin).toString(),
      );
      expect(config).toMatchObject({
        headers: { "x-magic-session": "session-placeholder" },
        responseType: "blob",
      });
    },
  );
});
