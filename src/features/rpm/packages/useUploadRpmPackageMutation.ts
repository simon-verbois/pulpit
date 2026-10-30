import { useMutation } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { useRef } from "react";

import { uploadRpmPackage } from "../../../api/client/rpm/packages";
import { modifyRpmRepository } from "../../../api/client/rpm/repositories";
import { useTasksContext } from "../../../api/tasks/TasksContext";

export type PackageUploadState =
  | { phase: "queued" | "uploading" | "adding" | "submitted" }
  | { phase: "error"; error: unknown };

interface UploadToRepositoryArgs {
  files: File[];
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
  onFileState: (file: File, state: PackageUploadState) => void;
}

/**
 * Two-step flow (VERIFIED against the live schema - see the pulp-api skill
 * notes in src/api/client/rpm/packages.ts): the upload endpoint only
 * creates one content unit (sync, 201). Add accepted units together with
 * one asynchronous `modify`, so Pulp signs one coherent repository version.
 */
export function useUploadRpmPackageMutation() {
  const { registerTask } = useTasksContext();
  // A failed modify can be retried without sending large RPM bodies again.
  const uploaded = useRef(new Map<File, string>());

  return useMutation({
    mutationFn: async ({
      files,
      repositoryHref,
      repositoryName,
      invalidateKeys,
      onFileState,
    }: UploadToRepositoryArgs) => {
      const accepted: File[] = [];
      // Bound memory and request concurrency; File objects go straight to FormData.
      for (const file of files) {
        try {
          if (!uploaded.current.has(file)) {
            onFileState(file, { phase: "uploading" });
            const pkg = await uploadRpmPackage(file);
            uploaded.current.set(file, pkg.pulp_href);
          }
          accepted.push(file);
          onFileState(file, { phase: "adding" });
        } catch (error) {
          onFileState(file, { phase: "error", error });
        }
      }
      if (accepted.length) {
        try {
          const { task } = await modifyRpmRepository(repositoryHref, {
            add_content_units: [
              ...new Set(accepted.map((file) => uploaded.current.get(file)!)),
            ],
          });
          registerTask({
            href: task,
            label:
              accepted.length === 1
                ? `Add "${accepted[0].name}" to "${repositoryName}"`
                : `Add ${accepted.length} RPM packages to "${repositoryName}"`,
            resourceHrefs: [repositoryHref],
            action: "upload",
            invalidateKeys: [...invalidateKeys, ["pulp", "rpm", "packages"]],
          });
          for (const file of accepted) onFileState(file, { phase: "submitted" });
          return { allSubmitted: accepted.length === files.length };
        } catch (error) {
          for (const file of accepted) onFileState(file, { phase: "error", error });
        }
      }
      return { allSubmitted: false };
    },
  });
}
