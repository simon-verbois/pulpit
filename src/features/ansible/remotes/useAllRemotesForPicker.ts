import { useQuery } from "@tanstack/react-query";

import { listAllCollectionRemotes } from "../../../api/client/ansible/collectionRemotes";
import { listGitRemotes } from "../../../api/client/ansible/gitRemotes";
import { listRoleRemotes } from "../../../api/client/ansible/roleRemotes";

/** A repository's `remote` can be any of the three remote flavors (the
 * schema just accepts a generic href, and a single repository can hold both
 * collections and roles at once - VERIFIED live) - this combines all three
 * into one flavor-labeled select rather than picking one flavor up front.
 * Shared by Create and Edit so both offer the same choices (a Git/Role
 * remote is just as legitimate a default as a Collection one). */
export function useAllRemotesForPicker() {
  return useQuery({
    queryKey: ["pulp", "ansible", "remotes", "all-flavors"],
    queryFn: async () => {
      const [collections, gitResult, roles] = await Promise.all([
        listAllCollectionRemotes(),
        listGitRemotes({ limit: 100, offset: 0 }),
        listRoleRemotes({ limit: 100, offset: 0 }),
      ]);
      return [
        ...collections.map((r) => ({
          href: r.pulp_href,
          label: `${r.name} (Collection)`,
        })),
        ...gitResult.results.map((r) => ({
          href: r.pulp_href,
          label: `${r.name} (Git)`,
        })),
        ...roles.results.map((r) => ({ href: r.pulp_href, label: `${r.name} (Role)` })),
      ];
    },
  });
}
