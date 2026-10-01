import { useMutation } from "@tanstack/react-query";

import { updateGalaxyNamespace } from "../../../api/client/ansible/galaxyNamespaces";
import type { GalaxyNamespaceUpdate } from "../../../api/client/ansible/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { galaxyNamespacesListRootKey } from "./queryKeys";

interface UpdateArgs {
  name: string;
  resourceHref: string;
  data: GalaxyNamespaceUpdate;
}

/** Asynchronous (VERIFIED live: 202 + task). */
export function useUpdateGalaxyNamespaceMutation(distributionBasePath: string) {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ name, data }: UpdateArgs) =>
      updateGalaxyNamespace(distributionBasePath, name, data),
    onSuccess: ({ task }, { name, resourceHref }) => {
      registerTask({
        href: task,
        label: `Update namespace "${name}"`,
        resourceHrefs: [resourceHref],
        action: "edit",
        invalidateKeys: [galaxyNamespacesListRootKey(distributionBasePath)],
      });
    },
  });
}
