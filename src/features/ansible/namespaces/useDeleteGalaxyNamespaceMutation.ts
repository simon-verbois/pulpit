import { useMutation } from "@tanstack/react-query";

import { deleteGalaxyNamespace } from "../../../api/client/ansible/galaxyNamespaces";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { galaxyNamespacesListRootKey } from "./queryKeys";

/** Asynchronous on success (VERIFIED live: 202 + task) - Pulp still rejects
 * synchronously (400) if the namespace still has collections associated
 * with it, surfaced as a normal mutation error, not pre-validated here. */
export function useDeleteGalaxyNamespaceMutation(distributionBasePath: string) {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ name }: { name: string; resourceHref: string }) =>
      deleteGalaxyNamespace(distributionBasePath, name),
    onSuccess: ({ task }, { name, resourceHref }) => {
      registerTask({
        href: task,
        label: `Delete namespace "${name}"`,
        resourceHrefs: [resourceHref],
        action: "delete",
        invalidateKeys: [galaxyNamespacesListRootKey(distributionBasePath)],
      });
    },
  });
}
