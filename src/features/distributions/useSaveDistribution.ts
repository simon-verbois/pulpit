import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { pulpFetch } from "../../api/client/httpClient";
import {
  findDistributionMatches,
  isUnusedDistribution,
  publicationCollection,
  saveDistribution,
  type DistributionSummary,
  type DistributionWrite,
} from "../../api/client/distributionManagement";
import type { RepositoryKind } from "../../api/client/repositoryMembership";
import { useTasksContext } from "../../api/tasks/TasksContext";
import { waitForTask } from "../../api/tasks/waitForTask";

export interface DistributionDraft {
  name: string;
  basePath: string;
  target: "latest" | "version" | "publication";
  selectedVersion: string;
  selectedPublication: string;
  options: { content_guard: string; hidden: boolean };
  isPrivate: boolean;
  checkpoint: boolean;
  allowUploads: boolean;
  generateConfig: boolean;
  remote: string;
  description: string;
}

export function useSaveDistribution({
  kind,
  repositoryHref,
  repositoryName,
  initial,
  draft,
  recovery,
  onRecover,
  onSuccess,
}: {
  kind: RepositoryKind;
  repositoryHref: string;
  repositoryName: string;
  initial?: DistributionSummary;
  draft: DistributionDraft;
  recovery?: { href: string; key: string };
  onRecover: (distribution: DistributionSummary, key: string) => void;
  onSuccess: () => void;
}) {
  const { registerTask } = useTasksContext();
  const [stage, setStage] = useState("");
  const {
    name,
    basePath,
    target,
    selectedVersion,
    selectedPublication,
    options,
    isPrivate,
    checkpoint,
    allowUploads,
    generateConfig,
    remote,
    description,
  } = draft;
  const recoveryKey = `${name}\n${basePath}`;
  const reconnecting = recovery?.key === recoveryKey;
  const publicationBase = publicationCollection(kind);
  const supportsRemote = ["maven", "npm", "python", "gem", "huggingFace"].includes(kind);
  const mutation = useMutation({
    mutationFn: async () => {
      setStage("Checking distribution names and paths…");
      const matches = await findDistributionMatches(
        kind,
        name,
        basePath,
        initial?.pulp_href,
      );
      let existingHref = initial?.pulp_href;
      if (matches.length) {
        const candidate = matches[0];
        if (
          initial ||
          matches.length !== 1 ||
          !candidate.sameKind ||
          !isUnusedDistribution(candidate.distribution)
        ) {
          throw new Error(
            "This name or base path is already used by an active distribution. Choose another name/path or edit that distribution.",
          );
        }
        if (!reconnecting || recovery?.href !== candidate.distribution.pulp_href) {
          onRecover(candidate.distribution, recoveryKey);
          setStage("");
          return undefined;
        }
        existingHref = candidate.distribution.pulp_href;
      }
      const data: DistributionWrite = {
        name,
        base_path: basePath,
        content_guard: options.content_guard || null,
        hidden: options.hidden,
        repository: null,
        repository_version: null,
      };
      if (publicationBase) data.publication = null;
      if (target === "latest") data.repository = repositoryHref;
      if (target === "version") {
        if (!selectedVersion.startsWith(`${repositoryHref}versions/`))
          throw new Error("Choose a version from this repository.");
        if (publicationBase) {
          setStage("Publishing the selected version before changing the distribution…");
          const created = await pulpFetch<{ task: string }>(publicationBase, {
            method: "POST",
            body: JSON.stringify({ repository_version: selectedVersion }),
          });
          registerTask({
            href: created.task,
            label: `Publish a version of repository "${repositoryName}"`,
            resourceHrefs: [repositoryHref],
            action: "publish-version",
            invalidateKeys: [["pulp"]],
          });
          const completed = await waitForTask(created.task);
          const href = completed.created_resources?.find((resource) =>
            resource.startsWith(publicationBase),
          );
          if (!href)
            throw new Error(
              "The publication completed without a publication resource. No distribution was changed.",
            );
          data.publication = href;
        } else data.repository_version = selectedVersion;
      }
      if (target === "publication") data.publication = selectedPublication;
      if (["rpm", "file", "deb"].includes(kind)) data.checkpoint = checkpoint;
      if (kind === "container") {
        data.private = isPrivate;
        data.description = description || null;
        // A registry requires a native redirect guard. Omit an empty
        // selection so Pulp installs its default; preserve explicit choices.
        if (!options.content_guard) delete data.content_guard;
      }
      if (kind === "python") data.allow_uploads = allowUploads;
      if (kind === "rpm") data.generate_repo_config = generateConfig;
      if (supportsRemote) data.remote = remote || null;
      setStage("Saving distribution…");
      const result = await saveDistribution(kind, data, existingHref);
      registerTask({
        href: result.task,
        label: `${initial ? "Update" : existingHref ? "Reconnect" : "Create"} distribution "${name}"`,
        resourceHrefs: [repositoryHref, ...(existingHref ? [existingHref] : [])],
        action: "distribution",
        invalidateKeys: [["pulp"]],
      });
      return result;
    },
    onSuccess: (result) => {
      if (result) onSuccess();
    },
  });
  return { mutation, stage, reconnecting };
}
