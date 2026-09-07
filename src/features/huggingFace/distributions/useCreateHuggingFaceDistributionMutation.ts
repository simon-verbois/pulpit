import { useMutation } from "@tanstack/react-query";

import { createHuggingFaceDistribution } from "../../../api/client/hugging_face/distributions";
import type { HuggingFaceDistributionCreate } from "../../../api/client/hugging_face/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { huggingFaceDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreateHuggingFaceDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (data: HuggingFaceDistributionCreate) =>
      createHuggingFaceDistribution(data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Create distribution "${name}"`,
        invalidateKeys: [huggingFaceDistributionsListRootKey],
      });
    },
  });
}
