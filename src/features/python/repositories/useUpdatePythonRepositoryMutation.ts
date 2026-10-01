import { useMutation } from "@tanstack/react-query";

import { updatePythonRepository } from "../../../api/client/python/repositories";
import type { PythonRepositoryUpdate } from "../../../api/client/python/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { pythonRepositoriesListRootKey, pythonRepositoryByNameKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: PythonRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdatePythonRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updatePythonRepository(href, data),
    onSuccess: ({ task }, { href, name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [
          pythonRepositoryByNameKey(name),
          // The name itself may have just changed - also invalidate the new
          // one so the (renamed) repository is findable by its new slug.
          ...(data.name && data.name !== name
            ? [pythonRepositoryByNameKey(data.name)]
            : []),
          pythonRepositoriesListRootKey,
        ],
      });
    },
  });
}
