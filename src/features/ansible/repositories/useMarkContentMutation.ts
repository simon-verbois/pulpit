import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import {
  markAnsibleRepositoryContent,
  unmarkAnsibleRepositoryContent,
} from "../../../api/client/ansible/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface MarkArgs {
  href: string;
  repositoryName: string;
  contentUnits: string[];
  value: string;
  invalidateKeys: QueryKey[];
}

export function useMarkContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, contentUnits, value }: MarkArgs) =>
      markAnsibleRepositoryContent(href, { content_units: contentUnits, value }),
    onSuccess: ({ task }, { repositoryName, value, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Mark content "${value}" in "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}

export function useUnmarkContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, contentUnits, value }: MarkArgs) =>
      unmarkAnsibleRepositoryContent(href, { content_units: contentUnits, value }),
    onSuccess: ({ task }, { repositoryName, value, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Unmark content "${value}" in "${repositoryName}"`,
        invalidateKeys,
      });
    },
  });
}
