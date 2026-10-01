import { useMutation } from "@tanstack/react-query";

import { updateNpmRepository } from "../../../api/client/npm/repositories";
import type { NpmRepositoryUpdate } from "../../../api/client/npm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { npmRepositoriesListRootKey, npmRepositoryByNameKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: NpmRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateNpmRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateNpmRepository(href, data),
    onSuccess: ({ task }, { href, name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [
          npmRepositoryByNameKey(name),
          // The name itself may have just changed - also invalidate the new
          // one so the (renamed) repository is findable by its new slug.
          ...(data.name && data.name !== name ? [npmRepositoryByNameKey(data.name)] : []),
          npmRepositoriesListRootKey,
        ],
      });
    },
  });
}
