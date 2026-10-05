import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Page } from "@patternfly/react-core";

import { TasksProvider, useTasksContext } from "../../api/tasks/TasksContext";
import { HelpButton } from "./HelpButton";
import { HelpPanel } from "./HelpPanel";
import { TasksDrawer } from "./TasksDrawer";
import { TasksIndicator } from "./TasksIndicator";

// Mirrors the real wiring in AppLayout.tsx: Tasks and Help share Page's one
// notificationDrawer slot, so they render at the same level/alignment and
// opening one closes the other.
function Harness() {
  const { isDrawerOpen, setIsDrawerOpen } = useTasksContext();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <Page
      notificationDrawer={
        isHelpOpen ? <HelpPanel onClose={() => setIsHelpOpen(false)} /> : <TasksDrawer />
      }
      isNotificationDrawerExpanded={isDrawerOpen || isHelpOpen}
    >
      <TasksIndicator onToggle={() => setIsHelpOpen(false)} />
      <HelpButton
        onClick={() => {
          setIsDrawerOpen(false);
          setIsHelpOpen((open) => !open);
        }}
      />
    </Page>
  );
}

function renderHarness(route = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TasksProvider>
        <MemoryRouter initialEntries={[route]}>
          <Harness />
        </MemoryRouter>
      </TasksProvider>
    </QueryClientProvider>,
  );
}

describe("HelpButton + HelpPanel", () => {
  it("defaults to the Overview topic on the home route and switches topics", () => {
    renderHarness("/");

    fireEvent.click(screen.getByRole("button", { name: "Helper" }));
    expect(
      screen.getByText(/PulpIT is where you manage the content/, { exact: false }),
    ).toBeInTheDocument();

    const helpTopicsNav = screen.getByRole("navigation", { name: "Help topics" });
    fireEvent.click(within(helpTopicsNav).getByText("RPM"));
    expect(
      screen.getByText(/Use this area to manage RPM content/, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/PulpIT is where you manage the content/, { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("opens directly on the specific page for the current route, not just its category", () => {
    renderHarness("/rpm/repositories");

    fireEvent.click(screen.getByRole("button", { name: "Helper" }));
    // Deep-links to the Repositories page itself (not just the RPM
    // category's overview) - getHelpLocationForPath matches the most
    // specific page path available.
    expect(
      screen.getByText(/This page is the list of every RPM repository/, { exact: false }),
    ).toBeInTheDocument();
  });

  it("expands a category's sub-pages and lets you pick one, without losing the others", () => {
    renderHarness("/");

    fireEvent.click(screen.getByRole("button", { name: "Helper" }));
    const helpTopicsNav = screen.getByRole("navigation", { name: "Help topics" });

    fireEvent.click(within(helpTopicsNav).getByText("RPM"));
    expect(
      screen.getByText(/Use this area to manage RPM content/, { exact: false }),
    ).toBeInTheDocument();
    expect(within(helpTopicsNav).getByText("Packages")).toBeInTheDocument();
    expect(within(helpTopicsNav).getByText("Alternate sources")).toBeInTheDocument();

    fireEvent.click(within(helpTopicsNav).getByText("Packages"));
    expect(
      screen.queryByText(/Use this area to manage RPM content/, { exact: false }),
    ).not.toBeInTheDocument();
    // Switching pages within RPM keeps the RPM group expanded - Packages is
    // still visible to click again, not collapsed away.
    expect(within(helpTopicsNav).getByText("Packages")).toBeInTheDocument();
  });

  it("flat, single-page categories (Tasks) have no sub-page list", () => {
    renderHarness("/");

    fireEvent.click(screen.getByRole("button", { name: "Helper" }));
    const helpTopicsNav = screen.getByRole("navigation", { name: "Help topics" });

    fireEvent.click(within(helpTopicsNav).getByText("Tasks"));
    expect(
      screen.getByText(/Pulp runs them in the background/, { exact: false }),
    ).toBeInTheDocument();
  });

  it("shares one slot with Tasks - opening either closes the other", () => {
    renderHarness("/");
    const helpButton = screen.getByRole("button", { name: "Helper" });
    const tasksButton = screen.getByRole("button", { name: /Tasks/ });

    fireEvent.click(helpButton);
    expect(
      screen.getByText(/PulpIT is where you manage the content/, { exact: false }),
    ).toBeInTheDocument();

    fireEvent.click(tasksButton);
    expect(screen.getByText("No tasks tracked yet")).toBeInTheDocument();
    expect(
      screen.queryByText(/PulpIT is where you manage the content/, { exact: false }),
    ).not.toBeInTheDocument();

    fireEvent.click(helpButton);
    expect(
      screen.getByText(/PulpIT is where you manage the content/, { exact: false }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No tasks tracked yet")).not.toBeInTheDocument();
  });
});
