import { NavLink, useLocation } from "react-router-dom";
import { Nav, NavExpandable, NavItem, NavList } from "@patternfly/react-core";

import { deriveCapabilities } from "../../api/capabilities";
import { useStatusQuery } from "../../hooks/useStatusQuery";
import { useNavVisibilityQuery } from "../../hooks/useNavVisibilityQuery";
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
  const navVisibilityQuery = useNavVisibilityQuery();

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
