import type { PulpTask } from "../../api/client/tasks";
import type {
  ResolvedTaskResource,
  TaskResourceRef,
} from "../../api/client/taskResources";
import {
  humanizePluginLabel,
  humanizeTaskName,
  taskActionLabel,
} from "./humanizeTaskName";

// Pulpit's own route prefix per plugin (src/app/router.tsx).
const PLUGIN_ROUTES: Record<string, string> = {
  rpm: "rpm",
  container: "containers",
  ansible: "ansible",
  file: "files",
  hugging_face: "hugging-face",
  gem: "gems",
  maven: "maven",
  npm: "npm",
  python: "python",
  deb: "deb",
};

function humanizeVariant(variant: string): string {
  return variant.length <= 3 ? variant.toUpperCase() : variant;
}

/** e.g. "RPM repository", "RPM ULN remote", "Ansible collection remote". */
export function resourceTypeLabel(ref: TaskResourceRef): string {
  return [
    humanizePluginLabel(`pulp_${ref.plugin}`),
    ref.variant ? humanizeVariant(ref.variant) : "",
    ref.kind,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Where the resource lives in Pulpit, when it has a page: a plugin's main
 * repository type has a detail page; remotes only have a per-plugin list. */
export function resourceRoute(
  ref: TaskResourceRef,
  resolved: ResolvedTaskResource | undefined,
): string | undefined {
  const prefix = PLUGIN_ROUTES[ref.plugin];
  if (!prefix || !resolved?.name) return undefined;
  if (ref.kind === "repository" && ref.variant === "") {
    return `/${prefix}/repositories/${encodeURIComponent(resolved.name)}`;
  }
  if (ref.kind === "remote") return `/${prefix}/remotes`;
  return undefined;
}

/** Full sentence for places with room for only one line (drawer, modal
 * title): 'Sync RPM repository "pulpit-sample-rpm"'. */
export function taskTitle(
  task: Pick<PulpTask, "name">,
  ref: TaskResourceRef | undefined,
  resolved: ResolvedTaskResource | undefined,
): string {
  if (!task.name) return "Pulp task";
  if (!ref) return humanizeTaskName(task.name);
  const action = taskActionLabel(task.name);
  const target = resolved?.name ? `"${resolved.name}"` : "(deleted)";
  return `${action} ${resourceTypeLabel(ref)} ${target}`;
}
