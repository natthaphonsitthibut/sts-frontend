import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteNlConversation,
  listNlConversations,
  renameNlConversation,
} from "../api/nl-query.service";

export const NL_CONVERSATIONS_KEY = ["nl-conversations"] as const;

/** The signed-in user's saved nl-query conversations, newest first. */
export function useNlConversations() {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: NL_CONVERSATIONS_KEY,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listNlConversations({ before: pageParam }),
    getNextPageParam: (last) => last.next_before ?? undefined,
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: NL_CONVERSATIONS_KEY });

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameNlConversation(id, title),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteNlConversation(id),
    onSuccess: invalidate,
  });

  return {
    conversations: query.data?.pages.flatMap((page) => page.items) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    rename,
    remove,
  };
}
