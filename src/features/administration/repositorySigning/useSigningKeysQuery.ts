import { useQuery } from "@tanstack/react-query";

import { listSigningKeys } from "../../../api/client/pulpitCore/signing";
import { signingKeysListKey } from "./queryKeys";

export function useSigningKeysQuery() {
  return useQuery({
    queryKey: signingKeysListKey,
    queryFn: () => listSigningKeys(),
    // Rotation (generating/publishing/retiring keys) runs server-side on a
    // schedule (signing.rotation_check, every 5 minutes) with nothing in the
    // browser to invalidate this query when it fires - poll so the table
    // and active/next callouts pick up a background transition on their own.
    refetchInterval: 15000,
  });
}
