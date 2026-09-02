import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logout } from "../../api/client/auth";

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear every cached query, not just the current-user one: none of
      // it should survive into the next person's session on a shared machine.
      queryClient.clear();
    },
  });
}
