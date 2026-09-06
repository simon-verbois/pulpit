import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { createHuggingFacePublication } from "../../../api/client/hugging_face/publications";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface PublishArgs {
  href: string;
  name: string;
  invalidateKeys?: QueryKey[];
}

export function usePublishHuggingFaceRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: PublishArgs) => createHuggingFacePublication(href),
    onSuccess: ({ task }, { name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Publish repository "${name}"`,
        invalidateKeys,
      });
    },
  });
}
