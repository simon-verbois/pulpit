import { useMutation } from "@tanstack/react-query";

import { copyRpmContent } from "../../../api/client/rpm/copy";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmRepositoriesListRootKey } from "./queryKeys";

interface CopyContentArgs {
  sourceRepositoryVersionHref: string;
  destRepositoryHref: string;
  destRepositoryName: string;
}

export function useCopyContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ sourceRepositoryVersionHref, destRepositoryHref }: CopyContentArgs) =>
      copyRpmContent(sourceRepositoryVersionHref, destRepositoryHref),
    onSuccess: ({ task }, { destRepositoryName }) => {
      registerTask({
        href: task,
        label: `Copy content to "${destRepositoryName}"`,
        invalidateKeys: [rpmRepositoriesListRootKey],
      });
    },
  });
}
