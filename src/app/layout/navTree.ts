import type { PulpitCapabilities } from "../../api/capabilities";

export interface NavLeaf {
  type: "item";
  label: string;
  path: string;
}

export interface NavGroup {
  type: "group";
  label: string;
  children: NavLeaf[];
  /** The capability (src/api/capabilities.ts) this group's pages depend on.
   * Absent means always shown (core, always-installed features). Used to
   * hide a plugin's nav group when the connected Pulp instance doesn't have
   * that plugin installed (docs/ROADMAP.md "API/version-compatibility
   * handling") - AppNav fails open (shows everything) while status is
   * loading or unavailable, so a transient status failure never hides real
   * navigation. */
  capability?: keyof PulpitCapabilities;
}

export type NavNode = NavLeaf | NavGroup;

const item = (label: string, path: string): NavLeaf => ({ type: "item", label, path });
const group = (
  label: string,
  children: NavLeaf[],
  capability?: keyof PulpitCapabilities,
): NavGroup => ({
  type: "group",
  label,
  children,
  capability,
});

// Mirrors docs/UX.md "Navigation". Not every leaf is fully implemented yet
// (docs/ROADMAP.md), but the tree itself is meant to be the stable shape.
//
// PatternFly's Nav sidebar renders cleanly to two levels (flat items, and
// titled NavGroups of items); the conceptual "Repositories > RPM/Containers/
// Ansible > ..." three-level tree from docs/UX.md is flattened here into
// three top-level groups (RPM, Containers, Ansible) rather than fighting a
// third nesting level PatternFly's Nav isn't designed for.
export const NAV_TREE: NavNode[] = [
  item("Overview", "/"),
  group(
    "RPM",
    [
      item("Repositories", "/rpm/repositories"),
      item("Packages", "/rpm/packages"),
      item("Advisories", "/rpm/advisories"),
      item("Remotes", "/rpm/remotes"),
      item("Alternate sources", "/rpm/alternate-sources"),
    ],
    "rpm",
  ),
  group(
    "Containers",
    [
      item("Repositories", "/containers/repositories"),
      item("Tags", "/containers/tags"),
      item("Remotes", "/containers/remotes"),
    ],
    "container",
  ),
  group(
    "Ansible",
    [
      item("Repositories", "/ansible/repositories"),
      item("Collections", "/ansible/collections"),
      item("Roles", "/ansible/roles"),
      item("Remotes", "/ansible/remotes"),
      item("Namespaces", "/ansible/namespaces"),
      item("Search", "/ansible/search"),
    ],
    "ansible",
  ),
  item("Tasks", "/tasks"),
  group("Access", [
    item("Users", "/access/users"),
    item("Groups", "/access/groups"),
    item("Roles", "/access/roles"),
  ]),
  group("Administration", [
    item("System status", "/admin/status"),
    item("Repository Signing", "/admin/repository-signing"),
    item("Pulp Signing Services", "/admin/signing"),
    item("Content guards", "/admin/content-guards"),
  ]),
];
