import { useMutation } from "@tanstack/react-query";

import { deleteHuggingFaceDistribution } from "../../../api/client/hugging_face/distributions";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { huggingFaceDistributionsListRootKey } from "./queryKeys";

export function useDeleteHuggingFaceDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteHuggingFaceDistribution(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete distribution "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [huggingFaceDistributionsListRootKey],
      });
    },
  });
}
