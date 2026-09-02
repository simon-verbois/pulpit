import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { createRpmPublication } from "../../../api/client/rpm/publications";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface PublishArgs {
  href: string;
  name: string;
  invalidateKeys?: QueryKey[];
}

export function usePublishRpmRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: PublishArgs) => createRpmPublication(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Publish repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
