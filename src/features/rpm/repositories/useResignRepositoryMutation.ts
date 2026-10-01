import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { resignRepository } from "../../../api/client/pulpitCore/signing";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface ResignArgs {
  href: string;
  name: string;
  /** Invalidated once the job succeeds - resigning creates a new
   * repository version and may change the repository's signing fields. */
  invalidateKeys?: QueryKey[];
}

export function useResignRepositoryMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href }: ResignArgs) => resignRepository(href),
    onSuccess: (job, { href, name, invalidateKeys }) => {
      registerTask({
        kind: "job",
        href: job.id,
        label: `Re-sign repository "${name}"`,
        resourceHrefs: [href],
        action: "resign",
        invalidateKeys,
      });
    },
  });
}
