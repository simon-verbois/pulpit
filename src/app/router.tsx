import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./layout/AppLayout";
import { RequireAuth } from "./layout/RequireAuth";
import { LoginPage } from "../features/auth/LoginPage";

// Every page below except login/layout is loaded on demand (`lazy`), so the
// entry bundle doesn't carry the pages of all 12 content types.
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
          {
            index: true,
            lazy: async () => ({
              Component: (await import("../features/overview/OverviewPage")).OverviewPage,
            }),
          },

          {
            path: "rpm/repositories",
            lazy: async () => ({
              Component: (await import("../features/rpm/repositories/RepositoriesPage"))
                .RepositoriesPage,
            }),
          },
          {
            path: "rpm/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/rpm/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "rpm/packages",
            lazy: async () => ({
              Component: (await import("../features/rpm/packages/PackagesPage"))
                .PackagesPage,
            }),
          },
          {
            path: "rpm/advisories",
            lazy: async () => ({
              Component: (await import("../features/rpm/advisories/AdvisoriesPage"))
                .AdvisoriesPage,
            }),
          },
          {
            path: "rpm/remotes",
            lazy: async () => ({
              Component: (await import("../features/rpm/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },
          {
            path: "rpm/alternate-sources",
            lazy: async () => ({
              Component: (await import("../features/rpm/acs/AlternateSourcesPage"))
                .AlternateSourcesPage,
            }),
          },

          {
            path: "containers/repositories",
            lazy: async () => ({
              Component: (
                await import("../features/containers/repositories/RepositoriesPage")
              ).RepositoriesPage,
            }),
          },
          {
            path: "containers/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/containers/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "containers/tags",
            lazy: async () => ({
              Component: (await import("../features/containers/tags/TagsPage")).TagsPage,
            }),
          },
          {
            path: "containers/remotes",
            lazy: async () => ({
              Component: (await import("../features/containers/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },

          {
            path: "ansible/repositories",
            lazy: async () => ({
              Component: (
                await import("../features/ansible/repositories/RepositoriesPage")
              ).RepositoriesPage,
            }),
          },
          {
            path: "ansible/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/ansible/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "ansible/collections",
            lazy: async () => ({
              Component: (
                await import("../features/ansible/collectionVersions/CollectionVersionsPage")
              ).CollectionVersionsPage,
            }),
          },
          {
            path: "ansible/roles",
            lazy: async () => ({
              Component: (await import("../features/ansible/roles/RolesPage")).RolesPage,
            }),
          },
          {
            path: "ansible/remotes",
            lazy: async () => ({
              Component: (await import("../features/ansible/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },
          {
            path: "ansible/namespaces",
            lazy: async () => ({
              Component: (await import("../features/ansible/namespaces/NamespacesPage"))
                .NamespacesPage,
            }),
          },
          {
            path: "ansible/search",
            lazy: async () => ({
              Component: (await import("../features/ansible/search/SearchPage"))
                .SearchPage,
            }),
          },

          {
            path: "files/repositories",
            lazy: async () => ({
              Component: (await import("../features/files/repositories/RepositoriesPage"))
                .RepositoriesPage,
            }),
          },
          {
            path: "files/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/files/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "files/content",
            lazy: async () => ({
              Component: (await import("../features/files/content/ContentPage"))
                .ContentPage,
            }),
          },
          {
            path: "files/remotes",
            lazy: async () => ({
              Component: (await import("../features/files/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },

          {
            path: "hugging-face/repositories",
            lazy: async () => ({
              Component: (
                await import("../features/huggingFace/repositories/RepositoriesPage")
              ).RepositoriesPage,
            }),
          },
          {
            path: "hugging-face/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/huggingFace/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "hugging-face/content",
            lazy: async () => ({
              Component: (await import("../features/huggingFace/content/ContentPage"))
                .ContentPage,
            }),
          },
          {
            path: "hugging-face/remotes",
            lazy: async () => ({
              Component: (await import("../features/huggingFace/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },

          {
            path: "gems/repositories",
            lazy: async () => ({
              Component: (await import("../features/gems/repositories/RepositoriesPage"))
                .RepositoriesPage,
            }),
          },
          {
            path: "gems/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/gems/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "gems/content",
            lazy: async () => ({
              Component: (await import("../features/gems/content/ContentPage"))
                .ContentPage,
            }),
          },
          {
            path: "gems/remotes",
            lazy: async () => ({
              Component: (await import("../features/gems/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },

          {
            path: "maven/repositories",
            lazy: async () => ({
              Component: (await import("../features/maven/repositories/RepositoriesPage"))
                .RepositoriesPage,
            }),
          },
          {
            path: "maven/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/maven/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "maven/content",
            lazy: async () => ({
              Component: (await import("../features/maven/content/ContentPage"))
                .ContentPage,
            }),
          },
          {
            path: "maven/remotes",
            lazy: async () => ({
              Component: (await import("../features/maven/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },

          {
            path: "npm/repositories",
            lazy: async () => ({
              Component: (await import("../features/npm/repositories/RepositoriesPage"))
                .RepositoriesPage,
            }),
          },
          {
            path: "npm/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/npm/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "npm/content",
            lazy: async () => ({
              Component: (await import("../features/npm/content/ContentPage"))
                .ContentPage,
            }),
          },
          {
            path: "npm/remotes",
            lazy: async () => ({
              Component: (await import("../features/npm/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },

          {
            path: "python/repositories",
            lazy: async () => ({
              Component: (
                await import("../features/python/repositories/RepositoriesPage")
              ).RepositoriesPage,
            }),
          },
          {
            path: "python/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/python/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "python/content",
            lazy: async () => ({
              Component: (await import("../features/python/content/ContentPage"))
                .ContentPage,
            }),
          },
          {
            path: "python/remotes",
            lazy: async () => ({
              Component: (await import("../features/python/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },

          {
            path: "deb/repositories",
            lazy: async () => ({
              Component: (await import("../features/deb/repositories/RepositoriesPage"))
                .RepositoriesPage,
            }),
          },
          {
            path: "deb/repositories/:name",
            lazy: async () => ({
              Component: (
                await import("../features/deb/repositories/RepositoryDetailPage")
              ).RepositoryDetailPage,
            }),
          },
          {
            path: "deb/content",
            lazy: async () => ({
              Component: (await import("../features/deb/content/ContentPage"))
                .ContentPage,
            }),
          },
          {
            path: "deb/remotes",
            lazy: async () => ({
              Component: (await import("../features/deb/remotes/RemotesPage"))
                .RemotesPage,
            }),
          },

          {
            path: "tasks",
            lazy: async () => ({
              Component: (await import("../features/tasks/TasksPage")).TasksPage,
            }),
          },

          {
            path: "access/users/:username",
            lazy: async () => ({
              Component: (await import("../features/access/users/UserDetailPage"))
                .UserDetailPage,
            }),
          },
          {
            path: "access/groups/:name",
            lazy: async () => ({
              Component: (await import("../features/access/groups/GroupDetailPage"))
                .GroupDetailPage,
            }),
          },

          {
            path: "admin",
            lazy: async () => ({
              Component: (await import("../features/administration/AdministrationPage"))
                .AdministrationPage,
            }),
          },
        ],
      },
    ],
  },
]);
