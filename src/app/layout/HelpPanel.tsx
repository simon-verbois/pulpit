import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  Flex,
  FlexItem,
  Nav,
  NavExpandable,
  NavItem,
  NavList,
  Title,
} from "@patternfly/react-core";

import { getHelpLocationForPath, HELP_CATEGORIES } from "../../features/help/topics";

// Rendered as Page's `notificationDrawer` (shared with TasksDrawer, see
// AppLayout.tsx) - Page already wraps that slot in its own DrawerPanelContent,
// so this must NOT render a second one itself (that produced a broken,
// doubly-nested panel that rendered blank).
//
// Two levels, mirroring both the real app navigation (src/app/layout/
// navTree.ts) and its own AppNav.tsx rendering (NavExpandable groups that
// stay expanded while one of their own items is active): a flat item for a
// single-page category (Overview, Tasks), or an expandable group for a
// category with real sub-pages, whose first entry is always that category's
// own "what is this section for" overview and the rest match its real
// sub-pages one for one.
//
// HelpPanel unmounts while closed (DrawerPanelContent only renders its
// children while expanded - see AGENTS.md/docs/PULP_API.md's note on this
// same behavior for TaskTrackers), so each time it's opened this mounts
// fresh and its useState initializer picks the category/page for whatever
// page you're on right now.
export function HelpPanel({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const initialLocation = () => getHelpLocationForPath(location.pathname);
  const [{ categoryId: activeCategoryId, pageId: activePageId }, setActive] =
    useState(initialLocation);

  const activeCategory =
    HELP_CATEGORIES.find((category) => category.id === activeCategoryId) ??
    HELP_CATEGORIES[0];
  const activePage =
    activeCategory.pages.find((page) => page.id === activePageId) ??
    activeCategory.pages[0];
  const ActiveContent = activePage.Component;

  return (
    <>
      <DrawerHead>
        {/* A real heading (not just styled text) so screen-reader users
            navigating by headings land on it too - the Tasks drawer's
            NotificationDrawerHeader already renders one, this now matches. */}
        <Title headingLevel="h1" size="lg">
          Help
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Flex spaceItems={{ default: "spaceItemsLg" }}>
          <FlexItem
            style={{
              minWidth: "12rem",
              position: "sticky",
              top: 0,
              alignSelf: "flex-start",
            }}
          >
            <Nav aria-label="Help topics">
              <NavList>
                {HELP_CATEGORIES.map((category) => {
                  const isCategoryActive = category.id === activeCategoryId;

                  if (category.pages.length === 1) {
                    return (
                      <NavItem
                        key={category.id}
                        itemId={category.id}
                        isActive={isCategoryActive}
                        onClick={() =>
                          setActive({
                            categoryId: category.id,
                            pageId: category.pages[0].id,
                          })
                        }
                      >
                        {category.label}
                      </NavItem>
                    );
                  }

                  return (
                    <NavExpandable
                      key={category.id}
                      title={category.label}
                      isActive={isCategoryActive}
                      // Expanded whenever this category is the active one -
                      // same "stay open around the current selection"
                      // behavior as the real AppNav (navTree.ts groups).
                      isExpanded={isCategoryActive}
                      // Clicking the category title itself (not yet
                      // expanded) both expands it and jumps straight to its
                      // Overview page - one click to "what is this section
                      // for", same as the old flat topic list's behavior.
                      onExpand={(_event, willExpand) => {
                        if (willExpand) {
                          setActive({
                            categoryId: category.id,
                            pageId: category.pages[0].id,
                          });
                        }
                      }}
                    >
                      {category.pages.map((page) => (
                        <NavItem
                          key={page.id}
                          itemId={`${category.id}:${page.id}`}
                          isActive={isCategoryActive && page.id === activePageId}
                          onClick={() =>
                            setActive({ categoryId: category.id, pageId: page.id })
                          }
                        >
                          {page.label}
                        </NavItem>
                      ))}
                    </NavExpandable>
                  );
                })}
              </NavList>
            </Nav>
          </FlexItem>
          <FlexItem flex={{ default: "flex_1" }} style={{ minWidth: 0 }}>
            <ActiveContent />
          </FlexItem>
        </Flex>
      </DrawerPanelBody>
    </>
  );
}
