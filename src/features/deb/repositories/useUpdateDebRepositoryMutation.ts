import { useMutation } from "@tanstack/react-query";

import { updateDebRepository } from "../../../api/client/deb/repositories";
import type { DebRepositoryUpdate } from "../../../api/client/deb/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { debRepositoriesListRootKey, debRepositoryByNameKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: DebRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateDebRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateDebRepository(href, data),
    onSuccess: ({ task }, { href, name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [
          debRepositoryByNameKey(name),
          // The name itself may have just changed - also invalidate the new
          // one so the (renamed) repository is findable by its new slug.
          ...(data.name && data.name !== name ? [debRepositoryByNameKey(data.name)] : []),
          debRepositoriesListRootKey,
        ],
      });
    },
  });
}
