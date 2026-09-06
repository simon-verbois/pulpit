import { useMutation } from "@tanstack/react-query";

import { updateMavenRepository } from "../../../api/client/maven/repositories";
import type { MavenRepositoryUpdate } from "../../../api/client/maven/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { mavenRepositoriesListRootKey, mavenRepositoryByNameKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: MavenRepositoryUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateMavenRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateMavenRepository(href, data),
    onSuccess: ({ task }, { name, data }) => {
      registerTask({
        href: task,
        label: `Update repository "${data.name ?? name}"`,
        invalidateKeys: [
          mavenRepositoryByNameKey(name),
          // The name itself may have just changed - also invalidate the new
          // one so the (renamed) repository is findable by its new slug.
          ...(data.name && data.name !== name ? [mavenRepositoryByNameKey(data.name)] : []),
          mavenRepositoriesListRootKey,
        ],
      });
    },
  });
}
