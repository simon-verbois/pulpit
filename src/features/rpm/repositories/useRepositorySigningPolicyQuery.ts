import { useQuery } from "@tanstack/react-query";

import { getRepositorySigningPolicy } from "../../../api/client/pulpitCore/signing";
import { repositorySigningPolicyKey } from "../../administration/repositorySigning/queryKeys";

/** The current global signing policy (pulpit-core, docs/signing.md), used to
 * pre-fill a repository's Signing section without making an administrator
 * type a fingerprint by hand (task section 10). `retry: false` and a query
 * that simply returns no data on failure - pulpit-core being unreachable
 * should hide the Signing section (see RepositorySigningFieldGroup), never
 * block repository creation/editing. */
export function useRepositorySigningPolicyQuery() {
  return useQuery({
    queryKey: repositorySigningPolicyKey,
    queryFn: getRepositorySigningPolicy,
    retry: false,
  });
}
