import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateNavVisibilitySettings } from "../../../api/client/pulpitCore/navVisibility";

export function useUpdateNavVisibilitySettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visibleModuleIds: string[]) =>
      updateNavVisibilitySettings(visibleModuleIds),
    onSuccess: (data) => {
      queryClient.setQueryData(["pulpit-core", "nav-visibility", "settings"], data);
      // The current user's own resolved visibility (AppNav.tsx) may have
      // just changed too - refetch rather than try to merge, since staff
      // callers are unrestricted regardless and never need this update
      // reflected in their own sidebar anyway.
      queryClient.invalidateQueries({
        queryKey: ["pulpit-core", "nav-visibility", "me"],
      });
    },
  });
}
