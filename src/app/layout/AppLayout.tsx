import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  Flex,
  FlexItem,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  Page,
  PageSidebar,
  PageSidebarBody,
  SkipToContent,
} from "@patternfly/react-core";

import { TasksProvider, useTasksContext } from "../../api/tasks/TasksContext";
import { TaskTrackers } from "../../features/tasks/TaskTrackers";
import { AppFooter } from "./AppFooter";
import { AppNav } from "./AppNav";
import { HelpButton } from "./HelpButton";
import { HelpPanel } from "./HelpPanel";
import { PulpApiDocsLink } from "./PulpApiDocsLink";
import { TasksDrawer } from "./TasksDrawer";
import { TasksIndicator } from "./TasksIndicator";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

const MAIN_CONTAINER_ID = "pulpit-main-content";

// Split out so it can consume useTasksContext() as a descendant of the
// TasksProvider that AppLayout itself renders below.
function AppShell() {
  const { isDrawerOpen, setIsDrawerOpen } = useTasksContext();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const isPanelOpen = isDrawerOpen || isHelpOpen;

  // Neither PatternFly's Drawer nor NotificationDrawer close on Escape by
  // themselves (unlike Modal, which already handles this) - wire it up here
  // so Tasks/Help behave the same way, and restore focus to whichever
  // toggle button opened the panel (also covers the header's own Close
  // button, which otherwise drops focus back to <body>).
  const wasPanelOpenRef = useRef(false);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  // Set right before an outside click closes the panel (below) so the
  // focus-restore effect skips stealing focus back to the toggle button -
  // the user just deliberately moved their attention elsewhere by clicking
  // it, unlike Escape/the close button, where restoring focus to the
  // trigger is the expected keyboard-accessible behavior.
  const skipFocusRestoreRef = useRef(false);

  useEffect(() => {
    if (isPanelOpen && !wasPanelOpenRef.current) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    } else if (!isPanelOpen && wasPanelOpenRef.current) {
      if (!skipFocusRestoreRef.current) {
        lastFocusedElementRef.current?.focus();
      }
      skipFocusRestoreRef.current = false;
    }
    wasPanelOpenRef.current = isPanelOpen;
  }, [isPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
        setIsHelpOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPanelOpen, setIsDrawerOpen]);

  // Clicking anywhere else in the app (main content, sidebar nav, ...)
  // closes whichever of Tasks/Help is open - mousedown (not click) so it
  // closes before the click target's own handler runs, and excluded from
  // both the drawer panel itself and the masthead's Tasks/Help toggle
  // buttons (`.pulpit-masthead-actions`) so a toggle button's own onClick
  // remains the only thing controlling its open/close, not fought by this
  // handler closing it out from under that click first.
  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(".pf-v6-c-drawer__panel") ||
        target?.closest(".pulpit-masthead-actions")
      ) {
        return;
      }
      skipFocusRestoreRef.current = true;
      setIsDrawerOpen(false);
      setIsHelpOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isPanelOpen, setIsDrawerOpen]);

  const masthead = (
    <Masthead>
      <MastheadMain>
        {/* No nav-toggle button (removed by request) - the icon sits in its
            place, at the masthead's leading edge, and the sidebar
            (isManagedSidebar on <Page> below) is always shown rather than
            manually collapsible. */}
        <MastheadBrand>
          <MastheadLogo
            component={(props) => <Link to="/" {...props} />}
            style={{ width: "auto", textDecoration: "none" }}
          >
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              spaceItems={{ default: "spaceItemsSm" }}
              flexWrap={{ default: "nowrap" }}
            >
              <FlexItem>
                <img
                  src="/pulpit-mark.svg"
                  alt=""
                  width={32}
                  height={32}
                  style={{ display: "block" }}
                />
              </FlexItem>
              <FlexItem>
                <span className="pulpit-brand-text">PulpIT</span>
              </FlexItem>
            </Flex>
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent className="pulpit-masthead-actions">
        <TasksIndicator onToggle={() => setIsHelpOpen(false)} />
        <HelpButton
          onClick={() => {
            setIsDrawerOpen(false);
            setIsHelpOpen((open) => !open);
          }}
        />
        <PulpApiDocsLink />
        <ThemeToggle />
        <UserMenu />
      </MastheadContent>
    </Masthead>
  );

  const sidebar = (
    <PageSidebar>
      <PageSidebarBody>
        <AppNav />
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <Page
      mainContainerId={MAIN_CONTAINER_ID}
      // PatternFly defaults this to -1 (focusable only via the skip link,
      // never a normal Tab stop) on the assumption that page content always
      // supplies its own focusable elements. Some pages (Overview, System
      // status) are read-only summaries with none at all, and axe correctly
      // flags a scrollable main region a keyboard user can never reach -
      // VERIFIED live (e2e/a11y.spec.ts caught this after the breadcrumb,
      // which incidentally used to provide the only focusable element on
      // those pages, was removed per direct user feedback). 0 makes main
      // itself a real, reachable Tab stop on every page instead.
      mainTabIndex={0}
      mainAriaLabel="Main content"
      masthead={masthead}
      sidebar={sidebar}
      isManagedSidebar
      notificationDrawer={
        isHelpOpen ? <HelpPanel onClose={() => setIsHelpOpen(false)} /> : <TasksDrawer />
      }
      isNotificationDrawerExpanded={isDrawerOpen || isHelpOpen}
      // Help's two-level topic/page content (topics/index.ts) needs more
      // room than the Tasks list this same drawer slot otherwise shows -
      // widened only while Help is open, left as PatternFly's own default
      // for Tasks. Still user-resizable (a plain default, not a fixed size).
      drawerDefaultSize={isHelpOpen ? "44rem" : undefined}
      drawerMinSize={isHelpOpen ? "28rem" : undefined}
      skipToContent={
        <SkipToContent href={`#${MAIN_CONTAINER_ID}`}>Skip to content</SkipToContent>
      }
    >
      <Outlet />
      <TaskTrackers />
      <AppFooter />
    </Page>
  );
}

export function AppLayout() {
  return (
    <TasksProvider>
      <AppShell />
    </TasksProvider>
  );
}
