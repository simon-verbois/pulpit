import { useQuery } from "@tanstack/react-query";

import { getNavVisibilitySettings } from "../../../api/client/pulpitCore/navVisibility";

export function useNavVisibilitySettingsQuery() {
  return useQuery({
    queryKey: ["pulpit-core", "nav-visibility", "settings"],
    queryFn: getNavVisibilitySettings,
  });
}
