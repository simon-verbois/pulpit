import type { PulpitCapabilities } from "../../api/capabilities";

export interface NavLeaf {
  type: "item";
  label: string;
  path: string;
}

export interface NavGroup {
  type: "group";
  /** Stable identifier, independent of `label` (which can be renamed freely -
   * see the Debian/NPM relabeling history) - this is the "module id" nav
   * visibility settings (docs/adr/0009-nav-visibility-settings.md) store in
   * pulpit-core and match against. Renaming an `id` silently orphans any
   * hidden-module rule already configured for it - treat it as append-only,
   * same caution as a database column name. */
  id: string;
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
  id: string,
  label: string,
  children: NavLeaf[],
  capability?: keyof PulpitCapabilities,
): NavGroup => ({
  type: "group",
  id,
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
    "rpm",
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
    "deb",
    "Debian",
    [
      item("Repositories", "/deb/repositories"),
      item("Content", "/deb/content"),
      item("Remotes", "/deb/remotes"),
    ],
    "deb",
  ),
  group(
    "container",
    "Container Registry",
    [
      item("Repositories", "/containers/repositories"),
      item("Tags", "/containers/tags"),
      item("Remotes", "/containers/remotes"),
    ],
    "container",
  ),
  group(
    "ansible",
    "Ansible Galaxy",
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
  group(
    "file",
    "Files",
    [
      item("Repositories", "/files/repositories"),
      item("Content", "/files/content"),
      item("Remotes", "/files/remotes"),
    ],
    "file",
  ),
  group(
    "hugging_face",
    "Hugging Face",
    [
      item("Repositories", "/hugging-face/repositories"),
      item("Content", "/hugging-face/content"),
      item("Remotes", "/hugging-face/remotes"),
    ],
    "hugging_face",
  ),
  group(
    "gem",
    "Gems",
    [
      item("Repositories", "/gems/repositories"),
      item("Content", "/gems/content"),
      item("Remotes", "/gems/remotes"),
    ],
    "gem",
  ),
  group(
    "maven",
    "Maven",
    [
      item("Repositories", "/maven/repositories"),
      item("Content", "/maven/content"),
      item("Remotes", "/maven/remotes"),
    ],
    "maven",
  ),
  group(
    "npm",
    "NPM",
    [
      item("Repositories", "/npm/repositories"),
      item("Content", "/npm/content"),
      item("Remotes", "/npm/remotes"),
    ],
    "npm",
  ),
  group(
    "python",
    "Python",
    [
      item("Repositories", "/python/repositories"),
      item("Content", "/python/content"),
      item("Remotes", "/python/remotes"),
    ],
    "python",
  ),
  item("Tasks", "/tasks"),
  // A plain link, not a NavExpandable group - Access (Users/Groups/Roles)
  // and the 4 former standalone admin pages (Repository Signing, Pulp
  // Signing Services, Content guards, Global Proxy Settings) are now all tabs
  // on this one page (AdministrationPage.tsx, docs/adr/
  // 0010-merged-administration-page.md), so there's nothing left to
  // expand. Consequence: "administration" is no longer one of
  // NAV_VISIBILITY_MODULES below (that list only derives from groups) -
  // same as Overview/Tasks, it's always shown to any authenticated user;
  // the module's own settings writes, and Users/Groups/Roles' own writes,
  // stay gated server-side exactly as before.
  item("Administration", "/admin"),
];

/** Every nav module a nav-visibility rule can target - the Administration
 * page's own General tab (NavVisibilitySettingsSection.tsx) builds its
 * checklist from this, so a future plugin module added to NAV_TREE above
 * is automatically configurable here too, with no second list to
 * update. */
export const NAV_VISIBILITY_MODULES: { id: string; label: string }[] = NAV_TREE.filter(
  (node): node is NavGroup => node.type === "group",
).map((node) => ({ id: node.id, label: node.label }));
