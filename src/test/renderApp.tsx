import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { TasksProvider } from "../api/tasks/TasksContext";
import { TasksDrawer } from "../app/layout/TasksDrawer";
import { TaskTrackers } from "../features/tasks/TaskTrackers";

/**
 * Shared render helper for feature pages that need a QueryClient, a router
 * (for `<Link>`/`useParams`/`useNavigate`) and the tasks context (for
 * mutations that register tracked tasks) - the combination every RPM page
 * test needs, per docs/TESTING.md "Component tests".
 *
 * `withTasksDrawer` also mounts `<TaskTrackers>` (headless polling/
 * invalidation - see src/features/tasks/TaskTrackers.tsx) and `<TasksDrawer>`
 * (visible task list) alongside the page, matching production
 * (src/app/layout/AppLayout.tsx). `<TaskTrackers>` is the one that actually
 * matters for invalidation: PatternFly's Drawer only mounts a
 * <TasksDrawer>-only tree once the drawer has first been expanded, which is
 * exactly the real bug this pairing was added to catch and fix.
 */
export function renderApp(
  ui: ReactElement,
  {
    route = "/",
    path = "/",
    withTasksDrawer = false,
  }: { route?: string; path?: string; withTasksDrawer?: boolean } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <TasksProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={path} element={ui} />
            </Routes>
          </MemoryRouter>
          {withTasksDrawer ? (
            <>
              <TaskTrackers />
              <TasksDrawer />
            </>
          ) : null}
        </TasksProvider>
      </QueryClientProvider>,
    ),
  };
}
