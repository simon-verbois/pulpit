import { useQuery } from "@tanstack/react-query";

import { getSigningSettings } from "../../../api/client/pulpitCore/signing";
import { signingSettingsKey } from "./queryKeys";

export function useSigningSettingsQuery() {
  return useQuery({
    queryKey: signingSettingsKey,
    queryFn: getSigningSettings,
  });
}
