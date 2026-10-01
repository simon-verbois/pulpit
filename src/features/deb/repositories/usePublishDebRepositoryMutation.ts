import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { createDebPublication } from "../../../api/client/deb/publications";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface PublishArgs {
  href: string;
  name: string;
  invalidateKeys?: QueryKey[];
}

export function usePublishDebRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: PublishArgs) => createDebPublication(href),
    onSuccess: ({ task }, { href, name, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Publish repository "${name}"`,
        resourceHrefs: [href],
        action: "publish",
        invalidateKeys,
      });
    },
  });
}
