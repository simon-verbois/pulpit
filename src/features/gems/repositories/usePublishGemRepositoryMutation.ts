import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { createGemPublication } from "../../../api/client/gem/publications";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface PublishArgs {
  href: string;
  name: string;
  invalidateKeys?: QueryKey[];
}

export function usePublishGemRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: PublishArgs) => createGemPublication(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Publish repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
