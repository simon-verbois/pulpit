import { useMutation } from "@tanstack/react-query";

import { deleteMavenRepository } from "../../../api/client/maven/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { mavenRepositoriesListRootKey } from "./queryKeys";

export function useDeleteMavenRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteMavenRepository(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [mavenRepositoriesListRootKey],
      });
    },
  });
}
