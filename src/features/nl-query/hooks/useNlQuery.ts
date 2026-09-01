import { useMutation } from "@tanstack/react-query";
import { askNlQuery } from "../api/nl-query.service";

export function useNlQuery() {
  return useMutation({
    mutationFn: askNlQuery,
    meta: { suppressSuccessToast: true },
  });
}
