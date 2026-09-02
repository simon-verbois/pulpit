import { useMutation } from "@tanstack/react-query";

import { updateAnsibleRepository } from "../../../api/client/ansible/repositories";
import type { AnsibleRepositoryUpdate } from "../../../api/client/ansible/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { ansibleRepositoriesListRootKey, ansibleRepositoryByNameKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: AnsibleRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), same as RPM - never assume
 * PATCH mirrors POST's sync/async behavior. */
export function useUpdateAnsibleRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateAnsibleRepository(href, data),
    onSuccess: ({ task }, { name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        invalidateKeys: [
          ansibleRepositoryByNameKey(name),
          ...(data.name && data.name !== name
            ? [ansibleRepositoryByNameKey(data.name)]
            : []),
          ansibleRepositoriesListRootKey,
        ],
      });
    },
  });
}
