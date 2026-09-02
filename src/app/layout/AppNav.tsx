import { NavLink, useLocation } from "react-router-dom";
import { Nav, NavExpandable, NavItem, NavList } from "@patternfly/react-core";

import { deriveCapabilities } from "../../api/capabilities";
import { useStatusQuery } from "../../hooks/useStatusQuery";
import { NAV_TREE, type NavLeaf } from "./navTree";

function renderNavItem(leaf: NavLeaf, pathname: string) {
  const isActive = leaf.path === "/" ? pathname === "/" : pathname.startsWith(leaf.path);
  return (
    <NavItem key={leaf.path} itemId={leaf.path} isActive={isActive}>
      <NavLink to={leaf.path}>{leaf.label}</NavLink>
    </NavItem>
  );
}

export function AppNav() {
  const location = useLocation();
  const statusQuery = useStatusQuery();

  // Fail open: while status is loading, or if it fails, show every nav
  // group rather than hiding real navigation over a transient/unrelated
  // problem - deriveCapabilities(undefined) is all-false, which would
  // otherwise read as "nothing installed". Only hide a plugin's group once
  // status has actually confirmed it's absent.
  const capabilities = statusQuery.data
    ? deriveCapabilities(statusQuery.data)
    : undefined;
  const navTree = capabilities
    ? NAV_TREE.filter(
        (node) =>
          node.type !== "group" || !node.capability || capabilities[node.capability],
      )
    : NAV_TREE;

  return (
    <Nav aria-label="PulpIT navigation">
      <NavList>
        {navTree.map((node) => {
          if (node.type === "item") {
            return renderNavItem(node, location.pathname);
          }
          const containsCurrentPage = node.children.some((leaf) =>
            location.pathname.startsWith(leaf.path),
          );
          return (
            <NavExpandable
              key={node.label}
              title={node.label}
              isActive={containsCurrentPage}
              // Expanded by default whenever the current route lives inside
              // this group, so landing on (or reloading) a page under e.g.
              // /access/... never collapses its own section - PatternFly's
              // NavExpandable only re-syncs its internal expanded state when
              // this prop's value actually changes, so manually
              // expanding/collapsing an unrelated group still works normally.
              isExpanded={containsCurrentPage}
            >
              {node.children.map((leaf) => renderNavItem(leaf, location.pathname))}
            </NavExpandable>
          );
        })}
      </NavList>
    </Nav>
  );
}
