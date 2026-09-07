import { useQuery } from "@tanstack/react-query";

import { getFreeIpaSettings } from "../../../api/client/pulpitCore/tls";
import { tlsFreeIpaSettingsKey } from "./queryKeys";

export function useFreeIpaSettingsQuery() {
  return useQuery({
    queryKey: tlsFreeIpaSettingsKey,
    queryFn: () => getFreeIpaSettings(),
  });
}
