import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { TasksProvider } from "../api/tasks/TasksContext";
import { TasksDrawer } from "../app/layout/TasksDrawer";
import { TaskTrackers } from "../features/tasks/TaskTrackers";
import {
  AdministrationHeaderActionProvider,
  AdministrationHeaderActionSlot,
} from "../features/administration/AdministrationHeaderActionContext";

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
/** Renders the current URL, so a test can assert where a click navigated. */
// eslint-disable-next-line react-refresh/only-export-components -- test-only helper, never hot-reloaded
function RouteProbe() {
  const location = useLocation();
  return <div data-testid="route-probe">{`${location.pathname}${location.search}`}</div>;
}

export function renderApp(
  ui: ReactElement,
  {
    route = "/",
    path = "/",
    withTasksDrawer = false,
    withAdministrationHeaderAction,
  }: {
    /** A plain path, or `{ pathname, state }` when a test needs to assert
     * on `useLocation().state` (e.g. AdministrationPage's initial-tab
     * selection after a redirect). */
    route?: string | { pathname: string; state?: unknown };
    path?: string;
    withTasksDrawer?: boolean;
    /** For a page that registers its primary action into Administration's
     * shared PageHeader instead of rendering it inline (Users/Groups/Roles/
     * Content guards - AdministrationHeaderActionContext.tsx) - wraps `ui`
     * with the same provider AdministrationPage uses and renders this tab
     * id's slot right alongside it, so the test finds the button exactly
     * where it's really rendered without needing a whole AdministrationPage
     * in the tree. */
    withAdministrationHeaderAction?: string;
  } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = withAdministrationHeaderAction ? (
    <AdministrationHeaderActionProvider>
      <AdministrationHeaderActionSlot tabId={withAdministrationHeaderAction} />
      {ui}
    </AdministrationHeaderActionProvider>
  ) : (
    ui
  );
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <TasksProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={path} element={element} />
              {/* Where a drawer item navigates to (TaskListItem). */}
              {path !== "/tasks" ? (
                <Route path="/tasks" element={<RouteProbe />} />
              ) : null}
            </Routes>
            {/* Inside the router, as in AppLayout - a drawer item navigates. */}
            {withTasksDrawer ? (
              <>
                <TaskTrackers />
                <TasksDrawer />
              </>
            ) : null}
          </MemoryRouter>
        </TasksProvider>
      </QueryClientProvider>,
    ),
  };
}
