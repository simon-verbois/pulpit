import { useQuery } from "@tanstack/react-query";

import type { PulpitCapabilities } from "../../api/capabilities";
import { listAnsibleRepositories } from "../../api/client/ansible/repositories";
import { listContainerRepositories } from "../../api/client/container/repositories";
import { listRpmRepositories } from "../../api/client/rpm/repositories";

// limit: 1 - only `count` from the response envelope is used, so there's no
// reason to fetch actual repository rows for this.
const COUNT_PARAMS = { limit: 1, offset: 0 };

/** One lightweight count-only request per plugin, gated on that plugin
 * actually being installed (docs/ARCHITECTURE.md "Capability detection") -
 * a repository list endpoint for an absent plugin doesn't exist at all, not
 * just an empty list. */
export function useRepositoryCounts(capabilities: PulpitCapabilities | undefined) {
  const rpm = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "rpm"],
    queryFn: () => listRpmRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.rpm),
  });
  const ansible = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "ansible"],
    queryFn: () => listAnsibleRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.ansible),
  });
  const container = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "container"],
    queryFn: () => listContainerRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.container),
  });
  return { rpm, ansible, container };
}
