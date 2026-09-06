import { useMutation } from "@tanstack/react-query";

import { updateGemRepository } from "../../../api/client/gem/repositories";
import type { GemRepositoryUpdate } from "../../../api/client/gem/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { gemRepositoriesListRootKey, gemRepositoryByNameKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: GemRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateGemRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateGemRepository(href, data),
    onSuccess: ({ task }, { name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        invalidateKeys: [
          gemRepositoryByNameKey(name),
          // The name itself may have just changed - also invalidate the new
          // one so the (renamed) repository is findable by its new slug.
          ...(data.name && data.name !== name ? [gemRepositoryByNameKey(data.name)] : []),
          gemRepositoriesListRootKey,
        ],
      });
    },
  });
}
