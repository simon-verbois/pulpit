import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import {
  tagContainerImage,
  untagContainerImage,
} from "../../../api/client/container/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface TagArgs {
  href: string;
  repositoryName: string;
  tag: string;
  digest: string;
  invalidateKeys: QueryKey[];
}

export function useTagImageMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, tag, digest }: TagArgs) =>
      tagContainerImage(href, { tag, digest }),
    onSuccess: ({ task }, { href, repositoryName, tag, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Tag "${tag}" in "${repositoryName}"`,
        resourceHrefs: [href],
        action: "tag",
        invalidateKeys,
      });
    },
  });
}

interface UntagArgs {
  href: string;
  repositoryName: string;
  tag: string;
  invalidateKeys: QueryKey[];
}

export function useUntagImageMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, tag }: UntagArgs) => untagContainerImage(href, tag),
    onSuccess: ({ task }, { href, repositoryName, tag, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Remove tag "${tag}" from "${repositoryName}"`,
        resourceHrefs: [href],
        action: `untag:${tag}`,
        invalidateKeys,
      });
    },
  });
}
