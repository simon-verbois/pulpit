import { useMutation } from "@tanstack/react-query";

import { updateHuggingFaceRemote } from "../../../api/client/hugging_face/remotes";
import type { HuggingFaceRemoteUpdate } from "../../../api/client/hugging_face/types";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import { huggingFaceRemotesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  name: string;
  data: HuggingFaceRemoteUpdate;
}

/** Update is asynchronous (VERIFIED: 202 + task), unlike create. */
export function useUpdateHuggingFaceRemoteMutation() {
  const { registerTask } = useTasksContext();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateHuggingFaceRemote(href, data),
    onSuccess: ({ task }, { name }) => {
      registerTask({
        href: task,
        label: `Update remote "${name}"`,
        invalidateKeys: [huggingFaceRemotesListRootKey],
      });
    },
  });
}
