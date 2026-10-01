import { useMutation } from "@tanstack/react-query";

import { deprecateCollection } from "../../../api/client/ansible/collectionDeprecations";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { collectionDeprecationsListRootKey } from "./useCollectionDeprecationsQuery";

interface DeprecateArgs {
  namespace: string;
  name: string;
  repository: string;
}

/** Asynchronous (VERIFIED live schema: 202 + task). Deprecation is a
 * property of the namespace+name pair, not a specific repository or
 * version - `repository` is only required by the API to associate the
 * deprecation marker with, per docs/PULP_API.md. */
export function useDeprecateCollectionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: DeprecateArgs) => deprecateCollection(data),
    onSuccess: ({ task }, { namespace, name, repository }) => {
      registerTask({
        href: task,
        label: `Deprecate "${namespace}.${name}"`,
        resourceHrefs: [repository],
        action: "deprecate",
        invalidateKeys: [collectionDeprecationsListRootKey],
      });
    },
  });
}
