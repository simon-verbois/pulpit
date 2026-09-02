import { useMutation } from "@tanstack/react-query";

import { createGalaxyNamespace } from "../../../api/client/ansible/galaxyNamespaces";
import type { GalaxyNamespaceCreate } from "../../../api/client/ansible/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { galaxyNamespacesListRootKey } from "./queryKeys";

/** Asynchronous (VERIFIED live: 202 + task), unlike most other creates in
 * this app. */
export function useCreateGalaxyNamespaceMutation(distributionBasePath: string) {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: GalaxyNamespaceCreate) =>
      createGalaxyNamespace(distributionBasePath, data),
    onSuccess: ({ task }, data) => {
      registerTask({
        href: task,
        label: `Create namespace "${data.name}"`,
        invalidateKeys: [galaxyNamespacesListRootKey(distributionBasePath)],
      });
    },
  });
}
