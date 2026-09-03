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

import { AccessOverviewTopic } from "./access/Overview";
import { AccessUsersTopic } from "./access/Users";
import { AccessGroupsTopic } from "./access/Groups";
import { AccessRolesTopic } from "./access/Roles";

import { AdministrationOverviewTopic } from "./administration/Overview";
import { AdministrationSystemStatusTopic } from "./administration/SystemStatus";
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
   * every page's own (more specific) `path`. */
  pathPrefix: string;
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
    label: "Containers",
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
    label: "Ansible",
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
    id: "tasks",
    label: "Tasks",
    pathPrefix: "/tasks",
    pages: [{ id: "overview", label: "Overview", Component: TasksTopic }],
  },
  {
    id: "access",
    label: "Access",
    pathPrefix: "/access",
    pages: [
      { id: "overview", label: "Overview", Component: AccessOverviewTopic },
      { id: "users", label: "Users", path: "/access/users", Component: AccessUsersTopic },
      {
        id: "groups",
        label: "Groups",
        path: "/access/groups",
        Component: AccessGroupsTopic,
      },
      { id: "roles", label: "Roles", path: "/access/roles", Component: AccessRolesTopic },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    pathPrefix: "/admin",
    pages: [
      { id: "overview", label: "Overview", Component: AdministrationOverviewTopic },
      {
        id: "status",
        label: "System status",
        path: "/admin/status",
        Component: AdministrationSystemStatusTopic,
      },
      {
        id: "repository-signing",
        label: "Repository Signing",
        path: "/admin/repository-signing",
        Component: AdministrationRepositorySigningTopic,
      },
      {
        id: "signing",
        label: "Pulp Signing Services",
        path: "/admin/signing",
        Component: AdministrationPulpSigningServicesTopic,
      },
      {
        id: "content-guards",
        label: "Content guards",
        path: "/admin/content-guards",
        Component: AdministrationContentGuardsTopic,
      },
      {
        id: "default-settings",
        label: "Default Settings",
        path: "/admin/default-settings",
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
    if (category.pathPrefix === "/" || !pathname.startsWith(category.pathPrefix)) {
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
