import { useSearchParams } from "react-router-dom";

/**
 * Keeps a page's active PatternFly `<Tabs>` selection in the URL's query
 * string instead of component state - VERIFIED (see AdministrationPage.tsx,
 * ADR 0010): React Router's own history/location state does not survive a
 * hard reload (F5), so a refresh always reset back to the first tab. The
 * URL does survive a reload, so this is the one source of truth for both
 * the initial render and every tab switch afterwards - and it lets a
 * caller deep-link straight into a tab (e.g. `?tab=distributions`).
 *
 * This exact regression (the active tab resetting to the first one on F5)
 * has recurred across several detail pages because each one hand-rolled
 * its own `useState` instead of this - use this hook for any page-level
 * `<Tabs>` instead of adding a new one.
 */
export function useUrlTab(defaultTab: string, paramName = "tab") {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get(paramName) ?? defaultTab;

  const setActiveTab = (tab: string | number) => {
    const next = new URLSearchParams(searchParams);
    next.set(paramName, String(tab));
    // replace, not push - switching tabs shouldn't make the back button
    // step through every tab ever visited.
    setSearchParams(next, { replace: true });
  };

  return [activeTab, setActiveTab] as const;
}
