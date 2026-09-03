import { useQuery } from "@tanstack/react-query";

import { getDefaultSettings } from "../../../api/client/pulpitCore/defaultSettings";
import { defaultSettingsKey } from "./queryKeys";

export function useDefaultSettingsQuery() {
  return useQuery({
    queryKey: defaultSettingsKey,
    queryFn: getDefaultSettings,
  });
}
