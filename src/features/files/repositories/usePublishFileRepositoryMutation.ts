import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { createFilePublication } from "../../../api/client/file/publications";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface PublishArgs {
  href: string;
  name: string;
  invalidateKeys?: QueryKey[];
}

export function usePublishFileRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: PublishArgs) => createFilePublication(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Publish repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
