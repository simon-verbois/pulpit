import { useMutation, useQueryClient } from "@tanstack/react-query";

import { login } from "../../api/client/auth";
import { CURRENT_USER_QUERY_KEY } from "../../hooks/useCurrentUserQuery";

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    },
  });
}
