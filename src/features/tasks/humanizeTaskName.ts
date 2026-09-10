/**
 * Pulp's own task `name` is the dotted Python import path of the function
 * that runs it (e.g. "pulp_rpm.app.tasks.synchronizing.synchronize",
 * "pulpcore.app.tasks.orphan.orphan_cleanup") - accurate, but not something
 * to put in front of a user browsing the task list. This turns it into a
 * short label; the raw path is still shown in full on the task detail
 * modal (TaskDetailModal), which is where anyone who actually needs the
 * exact Python path (support, debugging) can find it.
 *
 * Deliberately a generic "last segment, underscores to spaces, sentence
 * case, optionally prefixed with a plugin label" transform rather than a
 * lookup table of specific task names: Pulp's plugin ecosystem is open-
 * ended (this app alone touches rpm/deb/container/ansible/python/maven/npm/
 * gem/file/hugging_face - see pulp_client.ts), and a table would silently
 * fall back to the raw string for any task type it didn't list.
 */

// Short display label for a plugin's distribution name (the first dotted
// segment, e.g. "pulp_rpm") - only for the handful this app actually talks
// to (see grep for "pulp_" across src/api/client/pulpClient); anything else
// falls back to a generic Capitalized-word derived from the plugin name
// itself, so a plugin missing from this list still gets a reasonable label
// instead of silently keeping its raw form.
const PLUGIN_LABELS: Record<string, string> = {
  pulpcore: "",
  pulp_rpm: "RPM",
  pulp_deb: "APT",
  pulp_container: "Container",
  pulp_ansible: "Ansible",
  pulp_python: "Python",
  pulp_maven: "Maven",
  pulp_npm: "npm",
  pulp_gem: "Gem",
  pulp_file: "File",
  pulp_hugging_face: "Hugging Face",
};

function humanizePluginLabel(pluginSegment: string): string {
  if (pluginSegment in PLUGIN_LABELS) return PLUGIN_LABELS[pluginSegment];
  const suffix = pluginSegment.replace(/^pulp_/, "");
  return suffix
    .split("_")
    .map((word) =>
      word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function normalizeActionSegment(actionSegment: string): string {
  // pulpcore's own async CRUD task functions are literally named
  // "ageneral_create"/"ageneral_update"/"ageneral_delete" (VERIFIED against
  // a real, running instance) - the leading "a" mirrors their sync
  // counterparts (general_create/general_update/general_delete) and is an
  // implementation detail, not something a user should have to read.
  return actionSegment.replace(/^ageneral_/, "general_");
}

function humanizeActionLabel(actionSegment: string): string {
  const words = normalizeActionSegment(actionSegment).split("_").filter(Boolean);
  if (words.length === 0) return actionSegment;
  return words
    .map((word, index) => (index === 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** `name` is optional/absent on some task shapes (e.g. a freshly-created
 * task record) - callers already fall back to a placeholder ("—", "Pulp
 * task") for that case, so this only ever receives a real dotted path. */
export function humanizeTaskName(name: string): string {
  const segments = name.split(".");
  // Not the dotted shape this is meant for (unexpected/custom task naming) -
  // showing it verbatim beats mangling something we don't recognize.
  if (segments.length < 2) return name;

  const [pluginSegment, ...rest] = segments;
  const actionSegment = rest[rest.length - 1];
  const pluginLabel = humanizePluginLabel(pluginSegment);
  const actionLabel = humanizeActionLabel(actionSegment);

  return pluginLabel ? `${pluginLabel} ${actionLabel.toLowerCase()}` : actionLabel;
}
