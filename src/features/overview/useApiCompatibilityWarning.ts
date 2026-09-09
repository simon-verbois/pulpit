import { useQuery } from "@tanstack/react-query";

import { getLatestApiCompatibilityCheck } from "../../api/client/pulpitCore/apiCompatibility";
import type { Warning } from "../../lib/warnings";

/** Feeds the Overview page's warnings card from pulpit-worker's one-shot
 * startup check (GET /api/v1/api_compatibility/latest) - never re-fetched
 * on an interval like useTlsCertWarning's `refetchInterval`, since the
 * underlying result only ever changes once per container launch. A 404
 * (no check has run yet) or any other request failure both resolve to no
 * warning, same as useTlsCertWarning's own "no data yet" handling - this
 * card should never nag about pulpit-core itself being briefly
 * unreachable, only about a real, confirmed compatibility problem. */
export function useApiCompatibilityWarning(): Warning[] {
  const query = useQuery({
    queryKey: ["pulpit-core", "api_compatibility", "latest"],
    queryFn: () => getLatestApiCompatibilityCheck(),
    retry: false,
  });

  if (!query.data) {
    return [];
  }

  if (!query.data.pulp_reachable) {
    return [
      {
        id: "api-compatibility-unreachable",
        variant: "warning",
        message: `Couldn't verify API compatibility with Pulp at startup: ${query.data.error ?? "unknown error"}.`,
      },
    ];
  }

  if (query.data.missing_endpoints.length === 0) {
    return [];
  }

  return [
    {
      id: "api-compatibility-missing-endpoints",
      variant: "warning",
      message:
        `${query.data.missing_endpoints.length} Pulp API path(s) this app depends on ` +
        `were not found on the connected instance at startup: ` +
        `${query.data.missing_endpoints.join(", ")}.`,
    },
  ];
}
