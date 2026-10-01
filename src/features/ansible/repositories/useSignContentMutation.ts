import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { signAnsibleRepositoryContent } from "../../../api/client/ansible/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

interface SignArgs {
  href: string;
  repositoryName: string;
  contentUnits: string[];
  signingService: string;
  invalidateKeys: QueryKey[];
}

export function useSignContentMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, contentUnits, signingService }: SignArgs) =>
      signAnsibleRepositoryContent(href, {
        content_units: contentUnits,
        signing_service: signingService,
      }),
    onSuccess: ({ task }, { href, repositoryName, invalidateKeys }) => {
      registerTask({
        href: task,
        label: `Sign content in "${repositoryName}"`,
        resourceHrefs: [href],
        action: "sign",
        invalidateKeys,
      });
    },
  });
}
