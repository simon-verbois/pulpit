import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Nav, NavExpandable, NavItem, NavList, Skeleton } from "@patternfly/react-core";

import { deriveCapabilities } from "../../api/capabilities";
import { useStatusQuery } from "../../hooks/useStatusQuery";
import { useNavVisibilityQuery } from "../../hooks/useNavVisibilityQuery";
import { NAV_TREE, type NavGroup, type NavLeaf } from "./navTree";

function renderNavItem(leaf: NavLeaf, pathname: string) {
  const isActive = leaf.path === "/" ? pathname === "/" : pathname.startsWith(leaf.path);
  return (
    <NavItem key={leaf.path} itemId={leaf.path} isActive={isActive}>
      <NavLink to={leaf.path}>{leaf.label}</NavLink>
    </NavItem>
  );
}

/** id of whichever top-level group's own children contain this path, if
 * any - group membership only, unrelated to capability/nav-visibility
 * filtering (a hidden group still "contains" its own paths for this
 * purpose, it just never renders). */
function groupIdContaining(pathname: string): string | undefined {
  return NAV_TREE.find(
    (node): node is NavGroup =>
      node.type === "group" &&
      node.children.some((leaf) => pathname.startsWith(leaf.path)),
  )?.id;
}

export function AppNav() {
  const location = useLocation();
  const statusQuery = useStatusQuery();
  const navVisibilityQuery = useNavVisibilityQuery();
  // Per-group expand/collapse, independent of every other group - BUG
  // FOUND LIVE: driving `isExpanded` off `containsCurrentPage` alone
  // collapses every *other* open group (even one auto-opened just because
  // it held the current page, not manually clicked) the moment you
  // navigate to a page outside of it - that group's own
  // `containsCurrentPage` flips true -> false, and NavExpandable re-syncs
  // to the new prop value. This map is the actual source of truth for
  // every group's expanded state instead: seeded once for whichever group
  // holds the initial route, and updated by two things only - explicitly
  // clicking a group's header (onExpand below, which can both open and
  // close), or the render-time check further down that ADDS the
  // newly-entered group on a route change without ever removing another
  // one. Route changes only ever grow this map, never shrink it, so
  // several sections can stay open across navigation exactly as if you'd
  // clicked each one open by hand.
  const [manuallyExpanded, setManuallyExpanded] = useState<Record<string, boolean>>(
    () => {
      const initialGroupId = groupIdContaining(location.pathname);
      return initialGroupId ? { [initialGroupId]: true } : {};
    },
  );
  const [lastPathname, setLastPathname] = useState(location.pathname);
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname);
    const enteredGroupId = groupIdContaining(location.pathname);
    if (enteredGroupId && !manuallyExpanded[enteredGroupId]) {
      setManuallyExpanded((prev) => ({ ...prev, [enteredGroupId]: true }));
    }
  }

  // Fail open: while status is loading, or if it fails, show every nav
  // group rather than hiding real navigation over a transient/unrelated
  // problem - deriveCapabilities(undefined) is all-false, which would
  // otherwise read as "nothing installed". Only hide a plugin's group once
  // status has actually confirmed it's absent.
  const capabilities = statusQuery.data
    ? deriveCapabilities(statusQuery.data)
    : undefined;
  // Global and default-visible, same for every signed-in user regardless
  // of role - no staff bypass (docs/adr/0009-nav-visibility-settings.md).
  // `null` means unrestricted - either nothing has been explicitly
  // restricted yet, or no data yet/an error, which fails open the same way
  // capability gating does (never hide real navigation over a transient
  // problem - safe here specifically because this is UI convenience, never
  // the actual security boundary). A non-null array restricts EVERY user,
  // including whichever staff account configured it.
  const visibleModuleIds = navVisibilityQuery.data?.visible_module_ids ?? null;
  const navTree = NAV_TREE.filter((node) => {
    if (node.type !== "group") {
      return true;
    }
    if (capabilities && node.capability && !capabilities[node.capability]) {
      return false;
    }
    return visibleModuleIds === null || visibleModuleIds.includes(node.id);
  });

  // First paint only (not a background refetch of already-loaded data) -
  // `isLoading` is `isPending && isFetching`, true exactly once per mount.
  // Rendering placeholder rows here instead of the fail-open `navTree`
  // above avoids the real symptom fail-open otherwise causes on every
  // refresh: every group flashing in, then the ones the connected Pulp
  // instance doesn't have installed vanishing again a moment later once
  // status/nav-visibility actually load. Same row count as NAV_TREE so the
  // swap to real content doesn't itself shift the page layout.
  const isInitialLoad = statusQuery.isLoading || navVisibilityQuery.isLoading;

  return (
    <Nav aria-label="PulpIT navigation">
      <NavList>
        {isInitialLoad
          ? NAV_TREE.map((node, index) => (
              <NavItem key={node.type === "item" ? node.path : node.id} itemId={index}>
                <Skeleton
                  width="70%"
                  screenreaderText={index === 0 ? "Loading navigation" : undefined}
                />
              </NavItem>
            ))
          : navTree.map((node) => {
              if (node.type === "item") {
                return renderNavItem(node, location.pathname);
              }
              const containsCurrentPage = node.children.some((leaf) =>
                location.pathname.startsWith(leaf.path),
              );
              const isExpanded = manuallyExpanded[node.id] ?? containsCurrentPage;
              return (
                <NavExpandable
                  key={node.label}
                  title={node.label}
                  isActive={containsCurrentPage}
                  // Expanded by default whenever the current route lives inside
                  // this group, so landing on (or reloading) a page under e.g.
                  // /access/... never collapses its own section - but once a
                  // group has been manually toggled, that explicit choice wins
                  // (see manuallyExpanded above), independent of every other
                  // group and independent of route changes elsewhere.
                  isExpanded={isExpanded}
                  onExpand={(_event, val) =>
                    setManuallyExpanded((prev) => ({ ...prev, [node.id]: val }))
                  }
                >
                  {node.children.map((leaf) => renderNavItem(leaf, location.pathname))}
                </NavExpandable>
              );
            })}
      </NavList>
    </Nav>
  );
}
