import { useQuery } from "@tanstack/react-query";

import { listSigningKeys } from "../../../api/client/pulpitCore/signing";
import { signingKeysListKey } from "./queryKeys";

export function useSigningKeysQuery() {
  return useQuery({
    queryKey: signingKeysListKey,
    queryFn: () => listSigningKeys(),
  });
}
