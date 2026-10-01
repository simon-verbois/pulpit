import { useMutation } from "@tanstack/react-query";

import { deleteHuggingFaceRepository } from "../../../api/client/hugging_face/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { huggingFaceRepositoriesListRootKey } from "./queryKeys";

export function useDeleteHuggingFaceRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) =>
      deleteHuggingFaceRepository(href),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Delete repository "${name}"`,
        resourceHrefs: [href],
        action: "delete",
        invalidateKeys: [huggingFaceRepositoriesListRootKey],
      });
    },
  });
}
