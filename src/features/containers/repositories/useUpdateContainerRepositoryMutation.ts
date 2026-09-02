import { useMutation } from "@tanstack/react-query";

import { updateContainerRepository } from "../../../api/client/container/repositories";
import type { ContainerRepositoryUpdate } from "../../../api/client/container/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import {
  containerRepositoriesListRootKey,
  containerRepositoryByNameKey,
} from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: ContainerRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateContainerRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateContainerRepository(href, data),
    onSuccess: ({ task }, { name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        invalidateKeys: [
          containerRepositoryByNameKey(name),
          ...(data.name && data.name !== name
            ? [containerRepositoryByNameKey(data.name)]
            : []),
          containerRepositoriesListRootKey,
        ],
      });
    },
  });
}
