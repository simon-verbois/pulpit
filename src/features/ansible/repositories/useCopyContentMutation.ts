import { useMutation } from "@tanstack/react-query";

import { copyAnsibleContent } from "../../../api/client/ansible/copy";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { ansibleRepositoriesListRootKey } from "./queryKeys";
import type { CopySelection } from "../../../components/CopyContentDialog";

interface CopyContentArgs {
  sourceRepositoryVersionHref: string;
  destRepositoryHref: string;
  destRepositoryName: string;
  selection?: CopySelection;
}

export function useCopyContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({
      sourceRepositoryVersionHref,
      destRepositoryHref,
      selection,
    }: CopyContentArgs) =>
      copyAnsibleContent(
        sourceRepositoryVersionHref,
        destRepositoryHref,
        selection?.mode === "selected" ? selection.values : undefined,
      ),
    onSuccess: ({ task }, { destRepositoryHref, destRepositoryName }) => {
      registerTask({
        href: task,
        label: `Copy content to "${destRepositoryName}"`,
        resourceHrefs: [destRepositoryHref],
        action: "copy",
        invalidateKeys: [ansibleRepositoriesListRootKey, ["pulp", "ansible"]],
      });
    },
  });
}
