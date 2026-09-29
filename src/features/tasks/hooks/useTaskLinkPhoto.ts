import { useQuery } from "@tanstack/react-query";
import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { taskService } from "../api/task.service";

/**
 * A photo behind a follow-up link — the student's or the assigned teacher's.
 * The link's session rides in a header an <img> cannot send, so the photo is
 * fetched once as a blob and kept in the query cache; the endpoint answers
 * with the same signed-URL redirect as every other photo in the app.
 *
 * `cachedOnly` reads the cache without asking the server: the receipt shown
 * after a report is sent sits on a link that is already closed, so the photo
 * the form loaded is the only one it can show.
 */
export function useTaskLinkPhoto(
  photoUrl: string | null | undefined,
  sessionToken: string | null | undefined,
  { cachedOnly = false }: { cachedOnly?: boolean } = {},
): string | null {
  const photoQuery = useQuery({
    queryKey: ["task-link-photo", photoUrl ?? null],
    queryFn: () =>
      taskService.getLinkPhoto(photoUrl!, sessionToken || undefined),
    enabled: Boolean(photoUrl) && !cachedOnly,
    retry: false,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });
  return useBlobObjectUrl(photoQuery.data);
}
