import type { ComponentType } from "react";

import { OverviewTopic } from "./OverviewTopic";
import { TasksTopic } from "./TasksTopic";

import { RpmOverviewTopic } from "./rpm/Overview";
import { RpmRepositoriesTopic } from "./rpm/Repositories";
import { RpmPackagesTopic } from "./rpm/Packages";
import { RpmAdvisoriesTopic } from "./rpm/Advisories";
import { RpmRemotesTopic } from "./rpm/Remotes";
import { RpmAlternateSourcesTopic } from "./rpm/AlternateSources";

import { ContainersOverviewTopic } from "./containers/Overview";
import { ContainersRepositoriesTopic } from "./containers/Repositories";
import { ContainersTagsTopic } from "./containers/Tags";
import { ContainersRemotesTopic } from "./containers/Remotes";

import { AnsibleOverviewTopic } from "./ansible/Overview";
import { AnsibleRepositoriesTopic } from "./ansible/Repositories";
import { AnsibleCollectionsTopic } from "./ansible/Collections";
import { AnsibleRolesTopic } from "./ansible/Roles";
import { AnsibleRemotesTopic } from "./ansible/Remotes";
import { AnsibleNamespacesTopic } from "./ansible/Namespaces";
import { AnsibleSearchTopic } from "./ansible/Search";

import { FileOverviewTopic } from "./file/Overview";
import { FileRepositoriesTopic } from "./file/Repositories";
import { FileContentTopic } from "./file/Content";
import { FileRemotesTopic } from "./file/Remotes";

import { HuggingFaceOverviewTopic } from "./huggingFace/Overview";
import { HuggingFaceRepositoriesTopic } from "./huggingFace/Repositories";
import { HuggingFaceContentTopic } from "./huggingFace/Content";
import { HuggingFaceRemotesTopic } from "./huggingFace/Remotes";

import { GemOverviewTopic } from "./gem/Overview";
import { GemRepositoriesTopic } from "./gem/Repositories";
import { GemContentTopic } from "./gem/Content";
import { GemRemotesTopic } from "./gem/Remotes";

import { MavenOverviewTopic } from "./maven/Overview";
import { MavenRepositoriesTopic } from "./maven/Repositories";
import { MavenContentTopic } from "./maven/Content";
import { MavenRemotesTopic } from "./maven/Remotes";

import { NpmOverviewTopic } from "./npm/Overview";
import { NpmRepositoriesTopic } from "./npm/Repositories";
import { NpmContentTopic } from "./npm/Content";
import { NpmRemotesTopic } from "./npm/Remotes";

import { PythonOverviewTopic } from "./python/Overview";
import { PythonRepositoriesTopic } from "./python/Repositories";
import { PythonContentTopic } from "./python/Content";
import { PythonRemotesTopic } from "./python/Remotes";

import { DebOverviewTopic } from "./deb/Overview";
import { DebRepositoriesTopic } from "./deb/Repositories";
import { DebContentTopic } from "./deb/Content";
import { DebRemotesTopic } from "./deb/Remotes";

import { AccessOverviewTopic } from "./access/Overview";
import { AccessUsersTopic } from "./access/Users";
import { AccessGroupsTopic } from "./access/Groups";
import { AccessRolesTopic } from "./access/Roles";

import { AdministrationOverviewTopic } from "./administration/Overview";
import { AdministrationRepositorySigningTopic } from "./administration/RepositorySigning";
import { AdministrationPulpSigningServicesTopic } from "./administration/PulpSigningServices";
import { AdministrationContentGuardsTopic } from "./administration/ContentGuards";
import { AdministrationDefaultSettingsTopic } from "./administration/DefaultSettings";

export interface HelpPage {
  id: string;
  label: string;
  /** Real app route prefix this page documents, used to deep-link Help to
   * whatever page you already have open. Absent only for a category's own
   * synthetic "Overview" entry (always `pages[0]`), which every route in
   * that category falls back to when no more specific page matches. */
  path?: string;
  Component: ComponentType;
}

export interface HelpCategory {
  id: string;
  label: string;
  /** Matches any route under this category, e.g. "/rpm" - checked after
   * every page's own (more specific) `path`. An array when a category's
   * pages live under more than one real route prefix (Administration:
   * `/admin` for its own merged page, `/access` for the User/Group detail
   * pages Users/Groups still link out to - docs/adr/
   * 0010-merged-administration-page.md). */
  pathPrefix: string | string[];
  /** `pages[0]` is always this category's own "what is this section for"
   * overview. A category with only that one entry renders it directly, with
   * no sub-page list - the same flat shape Overview/Tasks always had. A
   * category with more entries renders as an expandable group (HelpPanel.tsx)
   * whose children mirror the app's real sub-navigation (src/app/layout/
   * navTree.ts) for that category. */
  pages: HelpPage[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "overview",
    label: "Overview",
    pathPrefix: "/",
    pages: [{ id: "overview", label: "Overview", Component: OverviewTopic }],
  },
  {
    id: "rpm",
    label: "RPM",
    pathPrefix: "/rpm",
    pages: [
      { id: "overview", label: "Overview", Component: RpmOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/rpm/repositories",
        Component: RpmRepositoriesTopic,
      },
      {
        id: "packages",
        label: "Packages",
        path: "/rpm/packages",
        Component: RpmPackagesTopic,
      },
      {
        id: "advisories",
        label: "Advisories",
        path: "/rpm/advisories",
        Component: RpmAdvisoriesTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/rpm/remotes",
        Component: RpmRemotesTopic,
      },
      {
        id: "alternate-sources",
        label: "Alternate sources",
        path: "/rpm/alternate-sources",
        Component: RpmAlternateSourcesTopic,
      },
    ],
  },
  {
    id: "containers",
    label: "Container Registry",
    pathPrefix: "/containers",
    pages: [
      { id: "overview", label: "Overview", Component: ContainersOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/containers/repositories",
        Component: ContainersRepositoriesTopic,
      },
      {
        id: "tags",
        label: "Tags",
        path: "/containers/tags",
        Component: ContainersTagsTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/containers/remotes",
        Component: ContainersRemotesTopic,
      },
    ],
  },
  {
    id: "ansible",
    label: "Ansible Galaxy",
    pathPrefix: "/ansible",
    pages: [
      { id: "overview", label: "Overview", Component: AnsibleOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/ansible/repositories",
        Component: AnsibleRepositoriesTopic,
      },
      {
        id: "collections",
        label: "Collections",
        path: "/ansible/collections",
        Component: AnsibleCollectionsTopic,
      },
      {
        id: "roles",
        label: "Roles",
        path: "/ansible/roles",
        Component: AnsibleRolesTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/ansible/remotes",
        Component: AnsibleRemotesTopic,
      },
      {
        id: "namespaces",
        label: "Namespaces",
        path: "/ansible/namespaces",
        Component: AnsibleNamespacesTopic,
      },
      {
        id: "search",
        label: "Search",
        path: "/ansible/search",
        Component: AnsibleSearchTopic,
      },
    ],
  },
  {
    id: "file",
    label: "Files",
    pathPrefix: "/files",
    pages: [
      { id: "overview", label: "Overview", Component: FileOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/files/repositories",
        Component: FileRepositoriesTopic,
      },
      {
        id: "content",
        label: "Content",
        path: "/files/content",
        Component: FileContentTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/files/remotes",
        Component: FileRemotesTopic,
      },
    ],
  },
  {
    id: "hugging_face",
    label: "Hugging Face",
    pathPrefix: "/hugging-face",
    pages: [
      { id: "overview", label: "Overview", Component: HuggingFaceOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/hugging-face/repositories",
        Component: HuggingFaceRepositoriesTopic,
      },
      {
        id: "content",
        label: "Content",
        path: "/hugging-face/content",
        Component: HuggingFaceContentTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/hugging-face/remotes",
        Component: HuggingFaceRemotesTopic,
      },
    ],
  },
  {
    id: "gem",
    label: "Gems",
    pathPrefix: "/gems",
    pages: [
      { id: "overview", label: "Overview", Component: GemOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/gems/repositories",
        Component: GemRepositoriesTopic,
      },
      {
        id: "content",
        label: "Content",
        path: "/gems/content",
        Component: GemContentTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/gems/remotes",
        Component: GemRemotesTopic,
      },
    ],
  },
  {
    id: "maven",
    label: "Maven",
    pathPrefix: "/maven",
    pages: [
      { id: "overview", label: "Overview", Component: MavenOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/maven/repositories",
        Component: MavenRepositoriesTopic,
      },
      {
        id: "content",
        label: "Content",
        path: "/maven/content",
        Component: MavenContentTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/maven/remotes",
        Component: MavenRemotesTopic,
      },
    ],
  },
  {
    id: "npm",
    label: "NPM",
    pathPrefix: "/npm",
    pages: [
      { id: "overview", label: "Overview", Component: NpmOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/npm/repositories",
        Component: NpmRepositoriesTopic,
      },
      {
        id: "content",
        label: "Content",
        path: "/npm/content",
        Component: NpmContentTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/npm/remotes",
        Component: NpmRemotesTopic,
      },
    ],
  },
  {
    id: "python",
    label: "Python",
    pathPrefix: "/python",
    pages: [
      { id: "overview", label: "Overview", Component: PythonOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/python/repositories",
        Component: PythonRepositoriesTopic,
      },
      {
        id: "content",
        label: "Content",
        path: "/python/content",
        Component: PythonContentTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/python/remotes",
        Component: PythonRemotesTopic,
      },
    ],
  },
  {
    id: "deb",
    label: "Debian",
    pathPrefix: "/deb",
    pages: [
      { id: "overview", label: "Overview", Component: DebOverviewTopic },
      {
        id: "repositories",
        label: "Repositories",
        path: "/deb/repositories",
        Component: DebRepositoriesTopic,
      },
      {
        id: "content",
        label: "Content",
        path: "/deb/content",
        Component: DebContentTopic,
      },
      {
        id: "remotes",
        label: "Remotes",
        path: "/deb/remotes",
        Component: DebRemotesTopic,
      },
    ],
  },
  {
    id: "tasks",
    label: "Tasks",
    pathPrefix: "/tasks",
    pages: [{ id: "overview", label: "Overview", Component: TasksTopic }],
  },
  {
    id: "administration",
    label: "Administration",
    // Access's own detail pages (/access/users/:username,
    // /access/groups/:name) are the one place this category's routes
    // still live outside /admin - Access (Users/Groups/Roles) was folded
    // in here too (docs/adr/0010-merged-administration-page.md).
    pathPrefix: ["/admin", "/access"],
    pages: [
      // No `path` on any of these below except the two Access detail-page
      // ones - every one of these used to be its own standalone page (or,
      // for Access, its own top-level category); all now live as tabs on
      // the one merged /admin route (AdministrationPage.tsx), so there's
      // no longer a URL to distinguish most of them by. Still manually
      // selectable from this category's own page list; auto-detecting the
      // active route just falls back to this Overview for anything under
      // /admin that isn't a Users/Groups detail page.
      { id: "overview", label: "Overview", Component: AdministrationOverviewTopic },
      { id: "access-overview", label: "Access overview", Component: AccessOverviewTopic },
      {
        id: "users",
        label: "Users",
        path: "/access/users",
        Component: AccessUsersTopic,
      },
      {
        id: "groups",
        label: "Groups",
        path: "/access/groups",
        Component: AccessGroupsTopic,
      },
      { id: "roles", label: "Roles", Component: AccessRolesTopic },
      {
        id: "repository-signing",
        label: "Repository Signing",
        Component: AdministrationRepositorySigningTopic,
      },
      {
        id: "signing",
        label: "Pulp Signing Services",
        Component: AdministrationPulpSigningServicesTopic,
      },
      {
        id: "content-guards",
        label: "Content guards",
        Component: AdministrationContentGuardsTopic,
      },
      {
        id: "default-settings",
        label: "Global Proxy Settings",
        Component: AdministrationDefaultSettingsTopic,
      },
    ],
  },
];

/**
 * Maps the current route to a (category, page) pair, so opening Help lands
 * on the page for whatever you're already looking at - falling back to a
 * category's own Overview page when the route is under that category but
 * doesn't match any specific page (e.g. a repository detail page still
 * matches its list page's `path` prefix), and to the Overview category
 * when nothing else matches at all.
 */
export function getHelpLocationForPath(pathname: string): {
  categoryId: string;
  pageId: string;
} {
  for (const category of HELP_CATEGORIES) {
    const prefixes = Array.isArray(category.pathPrefix)
      ? category.pathPrefix
      : [category.pathPrefix];
    if (!prefixes.some((prefix) => prefix !== "/" && pathname.startsWith(prefix))) {
      continue;
    }
    let best: HelpPage = category.pages[0];
    let bestLength = -1;
    for (const page of category.pages) {
      if (page.path && pathname.startsWith(page.path) && page.path.length > bestLength) {
        best = page;
        bestLength = page.path.length;
      }
    }
    return { categoryId: category.id, pageId: best.id };
  }
  const overview = HELP_CATEGORIES[0];
  return { categoryId: overview.id, pageId: overview.pages[0].id };
}
