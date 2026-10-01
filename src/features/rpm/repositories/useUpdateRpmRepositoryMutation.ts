import { useMutation } from "@tanstack/react-query";

import { updateRpmRepository } from "../../../api/client/rpm/repositories";
import type { RpmRepositoryUpdate } from "../../../api/client/rpm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmRepositoriesListRootKey, rpmRepositoryByNameKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: RpmRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateRpmRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateRpmRepository(href, data),
    onSuccess: ({ task }, { href, name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [
          rpmRepositoryByNameKey(name),
          // The name itself may have just changed - also invalidate the new
          // one so the (renamed) repository is findable by its new slug.
          ...(data.name && data.name !== name ? [rpmRepositoryByNameKey(data.name)] : []),
          rpmRepositoriesListRootKey,
        ],
      });
    },
  });
}
