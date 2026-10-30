import { useMutation } from "@tanstack/react-query";

import {
  createRpmDistribution,
  updateRpmDistribution,
} from "../../../api/client/rpm/distributions";
import type { RpmDistributionCreate } from "../../../api/client/rpm/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmDistributionsListRootKey } from "./queryKeys";

/** Create is asynchronous (VERIFIED: 202 + task), unlike repositories/remotes. */
export function useCreateRpmDistributionMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({
      existingHref,
      ...data
    }: RpmDistributionCreate & { existingHref?: string }) =>
      existingHref
        ? updateRpmDistribution(existingHref, { ...data, publication: null })
        : createRpmDistribution(data),
    onSuccess: ({ task }, { name, existingHref }) => {
      registerTask({
        href: task,
        label: `${existingHref ? "Reconnect" : "Create"} distribution "${name}"`,
        invalidateKeys: [rpmDistributionsListRootKey],
      });
    },
  });
}
