import { useQuery } from "@tanstack/react-query";

import type { PulpitCapabilities } from "../../api/capabilities";
import { listAnsibleRepositories } from "../../api/client/ansible/repositories";
import { listContainerRepositories } from "../../api/client/container/repositories";
import { listDebRepositories } from "../../api/client/deb/repositories";
import { listFileRepositories } from "../../api/client/file/repositories";
import { listGemRepositories } from "../../api/client/gem/repositories";
import { listHuggingFaceRepositories } from "../../api/client/hugging_face/repositories";
import { listMavenRepositories } from "../../api/client/maven/repositories";
import { listNpmRepositories } from "../../api/client/npm/repositories";
import { listPythonRepositories } from "../../api/client/python/repositories";
import { listRpmRepositories } from "../../api/client/rpm/repositories";

// limit: 1 - only `count` from the response envelope is used, so there's no
// reason to fetch actual repository rows for this.
const COUNT_PARAMS = { limit: 1, offset: 0 };

/** One lightweight count-only request per plugin, gated on that plugin
 * actually being installed (docs/ARCHITECTURE.md "Capability detection") -
 * a repository list endpoint for an absent plugin doesn't exist at all, not
 * just an empty list. Every plugin Pulpit has a Repositories page for gets
 * a query here - the fixed count of `useQuery` calls is fine even though
 * most are `enabled: false` most of the time, since which plugins exist is
 * static, not something that changes across renders. */
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
  const deb = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "deb"],
    queryFn: () => listDebRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.deb),
  });
  const file = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "file"],
    queryFn: () => listFileRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.file),
  });
  const gem = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "gem"],
    queryFn: () => listGemRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.gem),
  });
  const hugging_face = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "hugging_face"],
    queryFn: () => listHuggingFaceRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.hugging_face),
  });
  const maven = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "maven"],
    queryFn: () => listMavenRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.maven),
  });
  const npm = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "npm"],
    queryFn: () => listNpmRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.npm),
  });
  const python = useQuery({
    queryKey: ["pulp", "overview", "repositoryCount", "python"],
    queryFn: () => listPythonRepositories(COUNT_PARAMS),
    enabled: Boolean(capabilities?.python),
  });
  return { rpm, ansible, container, deb, file, gem, hugging_face, maven, npm, python };
}
