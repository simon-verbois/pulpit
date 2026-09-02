import { useMutation } from "@tanstack/react-query";

import { copyAnsibleContent } from "../../../api/client/ansible/copy";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { ansibleRepositoriesListRootKey } from "./queryKeys";

interface CopyContentArgs {
  sourceRepositoryVersionHref: string;
  destRepositoryHref: string;
  destRepositoryName: string;
}

export function useCopyContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ sourceRepositoryVersionHref, destRepositoryHref }: CopyContentArgs) =>
      copyAnsibleContent(sourceRepositoryVersionHref, destRepositoryHref),
    onSuccess: ({ task }, { destRepositoryName }) => {
      registerTask({
        href: task,
        label: `Copy content to "${destRepositoryName}"`,
        invalidateKeys: [ansibleRepositoriesListRootKey],
      });
    },
  });
}
