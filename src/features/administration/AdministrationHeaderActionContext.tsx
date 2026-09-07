import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AdministrationHeaderActionContextValue {
  registry: Record<string, ReactNode>;
  register: (tabId: string, node: ReactNode) => void;
}

const AdministrationHeaderActionContext =
  createContext<AdministrationHeaderActionContextValue | null>(null);

/** Wraps AdministrationPage's tabs so each tab page can register its own
 * primary action (useAdministrationHeaderAction below) and the page itself
 * can read the active tab's action into its one shared PageHeader, top
 * right - same as every other page in the app (CLAUDE.md "Page-wide actions
 * live in the page header (top right), not in a toolbar"). Users/Groups/
 * Roles/Content guards used to render their own "Create X" button inside
 * their own Toolbar purely because they lost their own PageHeader when they
 * merged into tabs here (docs/adr/0010-merged-administration-page.md) -
 * this closes that gap without giving every tab page its own PageHeader
 * back. */
export function AdministrationHeaderActionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [registry, setRegistry] = useState<Record<string, ReactNode>>({});
  const register = useCallback((tabId: string, node: ReactNode) => {
    setRegistry((prev) => (prev[tabId] === node ? prev : { ...prev, [tabId]: node }));
  }, []);
  const value = useMemo(() => ({ registry, register }), [registry, register]);
  return (
    <AdministrationHeaderActionContext.Provider value={value}>
      {children}
    </AdministrationHeaderActionContext.Provider>
  );
}

/** What AdministrationPage puts in its shared PageHeader's `actions` -
 * whichever tab last registered an action for this id, or nothing. */
// eslint-disable-next-line react-refresh/only-export-components -- context + accompanying hook is the standard pattern
export function useAdministrationHeaderActionFor(tabId: string): ReactNode {
  const context = useContext(AdministrationHeaderActionContext);
  return context?.registry[tabId] ?? null;
}

/** For a tab page's own tests, rendered in isolation without
 * AdministrationPage around it - mirrors exactly what AdministrationPage
 * itself does with useAdministrationHeaderActionFor, so the test can find
 * the page's "Create X" button right where it's really rendered (see
 * renderApp's `withAdministrationHeaderAction` option). */
export function AdministrationHeaderActionSlot({ tabId }: { tabId: string }) {
  return <>{useAdministrationHeaderActionFor(tabId)}</>;
}

/**
 * A tab page that lost its own PageHeader when it merged into
 * AdministrationPage's tabs (Users/Groups/Roles/Content guards - docs/adr/
 * 0010-merged-administration-page.md) calls this once with its own tab id
 * and its primary action, so it renders in the shared PageHeader instead of
 * inside its own Toolbar.
 *
 * `node` must be a stable reference (wrap the JSX in `useMemo` at the call
 * site, deps `[]` - the click handler only needs a `useState` setter, which
 * is already stable) - otherwise this effect refires every render. That's
 * harmless (the registry setter bails out when the node is unchanged) but
 * wasteful. Safe to call with no AdministrationHeaderActionProvider above
 * it (e.g. this page's own tests rendered without AdministrationPage) -
 * it's just a no-op then.
 */
// eslint-disable-next-line react-refresh/only-export-components -- context + accompanying hook is the standard pattern
export function useAdministrationHeaderAction(tabId: string, node: ReactNode) {
  const context = useContext(AdministrationHeaderActionContext);
  const register = context?.register;
  useEffect(() => {
    register?.(tabId, node);
    return () => register?.(tabId, null);
  }, [register, tabId, node]);
}
