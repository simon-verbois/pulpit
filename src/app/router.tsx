import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./layout/AppLayout";
import { RequireAuth } from "./layout/RequireAuth";
import { LoginPage } from "../features/auth/LoginPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { TasksPage } from "../features/tasks/TasksPage";
import { AdministrationPage } from "../features/administration/AdministrationPage";
import { UserDetailPage } from "../features/access/users/UserDetailPage";
import { GroupDetailPage } from "../features/access/groups/GroupDetailPage";
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
import { RepositoriesPage as FileRepositoriesPage } from "../features/files/repositories/RepositoriesPage";
import { RepositoryDetailPage as FileRepositoryDetailPage } from "../features/files/repositories/RepositoryDetailPage";
import { ContentPage as FileContentPage } from "../features/files/content/ContentPage";
import { RemotesPage as FileRemotesPage } from "../features/files/remotes/RemotesPage";
import { RepositoriesPage as HuggingFaceRepositoriesPage } from "../features/huggingFace/repositories/RepositoriesPage";
import { RepositoryDetailPage as HuggingFaceRepositoryDetailPage } from "../features/huggingFace/repositories/RepositoryDetailPage";
import { ContentPage as HuggingFaceContentPage } from "../features/huggingFace/content/ContentPage";
import { RemotesPage as HuggingFaceRemotesPage } from "../features/huggingFace/remotes/RemotesPage";
import { RepositoriesPage as GemRepositoriesPage } from "../features/gems/repositories/RepositoriesPage";
import { RepositoryDetailPage as GemRepositoryDetailPage } from "../features/gems/repositories/RepositoryDetailPage";
import { ContentPage as GemContentPage } from "../features/gems/content/ContentPage";
import { RemotesPage as GemRemotesPage } from "../features/gems/remotes/RemotesPage";
import { RepositoriesPage as MavenRepositoriesPage } from "../features/maven/repositories/RepositoriesPage";
import { RepositoryDetailPage as MavenRepositoryDetailPage } from "../features/maven/repositories/RepositoryDetailPage";
import { ContentPage as MavenContentPage } from "../features/maven/content/ContentPage";
import { RemotesPage as MavenRemotesPage } from "../features/maven/remotes/RemotesPage";
import { RepositoriesPage as NpmRepositoriesPage } from "../features/npm/repositories/RepositoriesPage";
import { RepositoryDetailPage as NpmRepositoryDetailPage } from "../features/npm/repositories/RepositoryDetailPage";
import { ContentPage as NpmContentPage } from "../features/npm/content/ContentPage";
import { RemotesPage as NpmRemotesPage } from "../features/npm/remotes/RemotesPage";
import { RepositoriesPage as PythonRepositoriesPage } from "../features/python/repositories/RepositoriesPage";
import { RepositoryDetailPage as PythonRepositoryDetailPage } from "../features/python/repositories/RepositoryDetailPage";
import { ContentPage as PythonContentPage } from "../features/python/content/ContentPage";
import { RemotesPage as PythonRemotesPage } from "../features/python/remotes/RemotesPage";
import { RepositoriesPage as DebRepositoriesPage } from "../features/deb/repositories/RepositoriesPage";
import { RepositoryDetailPage as DebRepositoryDetailPage } from "../features/deb/repositories/RepositoryDetailPage";
import { ContentPage as DebContentPage } from "../features/deb/content/ContentPage";
import { RemotesPage as DebRemotesPage } from "../features/deb/remotes/RemotesPage";

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

          { path: "files/repositories", element: <FileRepositoriesPage /> },
          {
            path: "files/repositories/:name",
            element: <FileRepositoryDetailPage />,
          },
          { path: "files/content", element: <FileContentPage /> },
          { path: "files/remotes", element: <FileRemotesPage /> },

          {
            path: "hugging-face/repositories",
            element: <HuggingFaceRepositoriesPage />,
          },
          {
            path: "hugging-face/repositories/:name",
            element: <HuggingFaceRepositoryDetailPage />,
          },
          { path: "hugging-face/content", element: <HuggingFaceContentPage /> },
          { path: "hugging-face/remotes", element: <HuggingFaceRemotesPage /> },

          { path: "gems/repositories", element: <GemRepositoriesPage /> },
          { path: "gems/repositories/:name", element: <GemRepositoryDetailPage /> },
          { path: "gems/content", element: <GemContentPage /> },
          { path: "gems/remotes", element: <GemRemotesPage /> },

          { path: "maven/repositories", element: <MavenRepositoriesPage /> },
          { path: "maven/repositories/:name", element: <MavenRepositoryDetailPage /> },
          { path: "maven/content", element: <MavenContentPage /> },
          { path: "maven/remotes", element: <MavenRemotesPage /> },

          { path: "npm/repositories", element: <NpmRepositoriesPage /> },
          { path: "npm/repositories/:name", element: <NpmRepositoryDetailPage /> },
          { path: "npm/content", element: <NpmContentPage /> },
          { path: "npm/remotes", element: <NpmRemotesPage /> },

          { path: "python/repositories", element: <PythonRepositoriesPage /> },
          { path: "python/repositories/:name", element: <PythonRepositoryDetailPage /> },
          { path: "python/content", element: <PythonContentPage /> },
          { path: "python/remotes", element: <PythonRemotesPage /> },

          { path: "deb/repositories", element: <DebRepositoriesPage /> },
          { path: "deb/repositories/:name", element: <DebRepositoryDetailPage /> },
          { path: "deb/content", element: <DebContentPage /> },
          { path: "deb/remotes", element: <DebRemotesPage /> },

          { path: "tasks", element: <TasksPage /> },

          { path: "access/users/:username", element: <UserDetailPage /> },
          { path: "access/groups/:name", element: <GroupDetailPage /> },

          { path: "admin", element: <AdministrationPage /> },
        ],
      },
    ],
  },
]);
