import { useMutation } from "@tanstack/react-query";

import { pruneRpmPackages, type PrunePackagesArgs } from "../../../api/client/rpm/prune";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { rpmRepositoriesListRootKey } from "./queryKeys";

export function usePrunePackagesMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: (args: PrunePackagesArgs) => pruneRpmPackages(args),
    onSuccess: ({ task }, { dry_run }) => {
      registerTask({
        href: task,
        label: dry_run ? "Prune packages (dry run)" : "Prune packages",
        invalidateKeys: [rpmRepositoriesListRootKey],
      });
    },
  });
}
