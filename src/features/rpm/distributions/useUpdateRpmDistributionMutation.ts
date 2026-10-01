import { useMutation } from "@tanstack/react-query";

import { updateRpmDistribution } from "../../../api/client/rpm/distributions";
import type { RpmDistributionUpdate } from "../../../api/client/rpm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmDistributionsListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: RpmDistributionUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useUpdateRpmDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateRpmDistribution(href, data),
    onSuccess: ({ task }, { href, name }) => {
      registerTask({
        href: task,
        label: `Update distribution "${name}"`,
        resourceHrefs: [href],
        action: "edit",
        invalidateKeys: [rpmDistributionsListRootKey],
      });
    },
  });
}
