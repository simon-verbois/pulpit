import { useMutation } from "@tanstack/react-query";

import { updateHuggingFaceRepository } from "../../../api/client/hugging_face/repositories";
import type { HuggingFaceRepositoryUpdate } from "../../../api/client/hugging_face/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import {
  huggingFaceRepositoriesListRootKey,
  huggingFaceRepositoryByNameKey,
} from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: HuggingFaceRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateHuggingFaceRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateHuggingFaceRepository(href, data),
    onSuccess: ({ task }, { name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        invalidateKeys: [
          huggingFaceRepositoryByNameKey(name),
          // The name itself may have just changed - also invalidate the new
          // one so the (renamed) repository is findable by its new slug.
          ...(data.name && data.name !== name
            ? [huggingFaceRepositoryByNameKey(data.name)]
            : []),
          huggingFaceRepositoriesListRootKey,
        ],
      });
    },
  });
}
