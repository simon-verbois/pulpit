import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  copyContainerManifests,
  copyContainerTags,
} from "../../../api/client/container/repositories";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useTasksContext } from "../../../api/tasks/TasksContext";
import type { CopyDialogArgs } from "../../../components/CopyContentDialog";

export function useCopyContentMutation() {
  const { registerTask } = useTasksContext();
  const accepted = useRef(new Map<string, string>());
  return useMutation({
    mutationFn: async ({
      sourceRepositoryVersionHref: source,
      destRepositoryHref: dest,
      destRepositoryName,
      selection,
    }: CopyDialogArgs) => {
      const mode = selection?.mode ?? "all";
      const submit = async (type: "tags" | "manifests") => {
        const key = JSON.stringify([type, source, dest, selection]);
        if (accepted.current.has(key)) return;
        const result =
          type === "tags"
            ? await copyContainerTags(
                dest,
                source,
                mode === "tags" ? selection?.values : undefined,
              )
            : await copyContainerManifests(dest, source, {
                ...(mode === "manifests" && selection?.values.length
                  ? { digests: selection.values }
                  : {}),
                ...(mode === "manifests" && selection?.mediaTypes.length
                  ? { media_types: selection.mediaTypes }
                  : {}),
              });
        accepted.current.set(key, result.task);
        registerTask({
          href: result.task,
          label: `Copy ${type} to "${destRepositoryName}"`,
          resourceHrefs: [dest],
          action: "copy",
          invalidateKeys: [["pulp", "container"]],
        });
      };
      const results = await Promise.allSettled([
        ...(mode === "all" || mode === "tags" ? [submit("tags")] : []),
        ...(mode === "all" || mode === "manifests" ? [submit("manifests")] : []),
      ]);
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected")
        throw new PulpApiError(
          "unknown",
          `Some copy requests failed. Accepted requests continue in Tasks; retrying this form only resubmits missing requests. ${failure.reason instanceof Error ? failure.reason.message : "Check the Pulp error details."}`,
          {
            detail:
              failure.reason instanceof PulpApiError ? failure.reason.detail : undefined,
          },
        );
    },
  });
}
