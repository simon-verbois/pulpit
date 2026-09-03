import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./layout/AppLayout";
import { RequireAuth } from "./layout/RequireAuth";
import { LoginPage } from "../features/auth/LoginPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { TasksPage } from "../features/tasks/TasksPage";
import { StatusPage } from "../features/administration/StatusPage";
import { SigningPage } from "../features/administration/signing/SigningPage";
import { RepositorySigningPage } from "../features/administration/repositorySigning/RepositorySigningPage";
import { ContentGuardsPage } from "../features/administration/contentGuards/ContentGuardsPage";
import { DefaultSettingsPage } from "../features/administration/defaultSettings/DefaultSettingsPage";
import { UsersPage } from "../features/access/users/UsersPage";
import { UserDetailPage } from "../features/access/users/UserDetailPage";
import { GroupsPage } from "../features/access/groups/GroupsPage";
import { GroupDetailPage } from "../features/access/groups/GroupDetailPage";
import { RolesPage } from "../features/access/roles/RolesPage";
import { RepositoriesPage as RpmRepositoriesPage } from "../features/rpm/repositories/RepositoriesPage";
import { RepositoryDetailPage as RpmRepositoryDetailPage } from "../features/rpm/repositories/RepositoryDetailPage";
import { PackagesPage as RpmPackagesPage } from "../features/rpm/packages/PackagesPage";
import { AdvisoriesPage as RpmAdvisoriesPage } from "../features/rpm/advisories/AdvisoriesPage";
import { RemotesPage as RpmRemotesPage } from "../features/rpm/remotes/RemotesPage";
import { AlternateSourcesPage as RpmAlternateSourcesPage } from "../features/rpm/acs/AlternateSourcesPage";
import { RepositoriesPage as ContainerRepositoriesPage } from "../features/containers/repositories/RepositoriesPage";
import { RepositoryDetailPage as ContainerRepositoryDetailPage } from "../features/containers/repositories/RepositoryDetailPage";
import { TagsPage as ContainerTagsPage } from "../features/containers/tags/TagsPage";
import { RemotesPage as ContainerRemotesPage } from "../features/containers/remotes/RemotesPage";
import { RepositoriesPage as AnsibleRepositoriesPage } from "../features/ansible/repositories/RepositoriesPage";
import { RepositoryDetailPage as AnsibleRepositoryDetailPage } from "../features/ansible/repositories/RepositoryDetailPage";
import { CollectionVersionsPage as AnsibleCollectionVersionsPage } from "../features/ansible/collectionVersions/CollectionVersionsPage";
import { RolesPage as AnsibleRolesPage } from "../features/ansible/roles/RolesPage";
import { RemotesPage as AnsibleRemotesPage } from "../features/ansible/remotes/RemotesPage";
import { NamespacesPage as AnsibleNamespacesPage } from "../features/ansible/namespaces/NamespacesPage";
import { SearchPage as AnsibleSearchPage } from "../features/ansible/search/SearchPage";

export const router = createBrowserRouter([
  // Public - deliberately outside RequireAuth.
  { path: "/login", element: <LoginPage /> },

  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <OverviewPage /> },

          { path: "rpm/repositories", element: <RpmRepositoriesPage /> },
          { path: "rpm/repositories/:name", element: <RpmRepositoryDetailPage /> },
          { path: "rpm/packages", element: <RpmPackagesPage /> },
          { path: "rpm/advisories", element: <RpmAdvisoriesPage /> },
          { path: "rpm/remotes", element: <RpmRemotesPage /> },
          { path: "rpm/alternate-sources", element: <RpmAlternateSourcesPage /> },

          { path: "containers/repositories", element: <ContainerRepositoriesPage /> },
          {
            path: "containers/repositories/:name",
            element: <ContainerRepositoryDetailPage />,
          },
          { path: "containers/tags", element: <ContainerTagsPage /> },
          { path: "containers/remotes", element: <ContainerRemotesPage /> },

          { path: "ansible/repositories", element: <AnsibleRepositoriesPage /> },
          {
            path: "ansible/repositories/:name",
            element: <AnsibleRepositoryDetailPage />,
          },
          { path: "ansible/collections", element: <AnsibleCollectionVersionsPage /> },
          { path: "ansible/roles", element: <AnsibleRolesPage /> },
          { path: "ansible/remotes", element: <AnsibleRemotesPage /> },
          { path: "ansible/namespaces", element: <AnsibleNamespacesPage /> },
          { path: "ansible/search", element: <AnsibleSearchPage /> },

          { path: "tasks", element: <TasksPage /> },

          { path: "access/users", element: <UsersPage /> },
          { path: "access/users/:username", element: <UserDetailPage /> },
          { path: "access/groups", element: <GroupsPage /> },
          { path: "access/groups/:name", element: <GroupDetailPage /> },
          { path: "access/roles", element: <RolesPage /> },

          { path: "admin/status", element: <StatusPage /> },
          { path: "admin/repository-signing", element: <RepositorySigningPage /> },
          { path: "admin/signing", element: <SigningPage /> },
          { path: "admin/content-guards", element: <ContentGuardsPage /> },
          { path: "admin/default-settings", element: <DefaultSettingsPage /> },
        ],
      },
    ],
  },
]);
