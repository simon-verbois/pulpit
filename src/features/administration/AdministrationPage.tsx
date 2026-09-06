import { useSearchParams } from "react-router-dom";
import { PageSection, Tab, TabTitleText, Tabs } from "@patternfly/react-core";

import { PageHeader } from "../../components/PageHeader";
import {
  AdministrationHeaderActionProvider,
  useAdministrationHeaderActionFor,
} from "./AdministrationHeaderActionContext";
import { NavVisibilitySettingsSection } from "./general/NavVisibilitySettingsSection";
import { UsersPage } from "../access/users/UsersPage";
import { GroupsPage } from "../access/groups/GroupsPage";
import { RolesPage } from "../access/roles/RolesPage";
import { RepositorySigningPage } from "./repositorySigning/RepositorySigningPage";
import { SigningPage } from "./signing/SigningPage";
import { ContentGuardsPage } from "./contentGuards/ContentGuardsPage";
import { DefaultSettingsPage } from "./defaultSettings/DefaultSettingsPage";

const DEFAULT_TAB = "general";
const DEFAULT_ACCESS_SUBTAB = "users";

/** One merged page for every instance-wide admin concern - previously 4
 * separate standalone admin pages plus the whole Access area (Users/Groups/
 * Roles), each with its own left-nav item (docs/adr/
 * 0010-merged-administration-page.md). "Administration" is now a single
 * flat nav link (AppNav.tsx/navTree.ts), and what used to be distinct
 * pages/sections are tabs here instead. Users/Groups/Roles are themselves
 * merged into one "Access" tab with its own nested sub-tabs, rather than 3
 * separate top-level tabs.
 *
 * The active tab (and, for Access, the active sub-tab) lives in the URL's
 * query string (`?tab=...&subtab=...`), not component state - VERIFIED:
 * React Router's own history/location state (what this used before) does
 * not survive a hard reload (F5), so a refresh always reset back to
 * General. The URL does survive a reload, so this is the one source of
 * truth for both the initial render AND every tab switch afterwards; a
 * caller can also deep-link straight into a tab/sub-tab (e.g. UserDetailPage/
 * GroupDetailPage navigate here with `/admin?tab=access&subtab=users` after
 * a delete) the same way. */
export function AdministrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? DEFAULT_TAB;
  const activeSubTab = searchParams.get("subtab") ?? DEFAULT_ACCESS_SUBTAB;

  const onSelectTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    if (tab === "access") {
      next.set("subtab", next.get("subtab") ?? DEFAULT_ACCESS_SUBTAB);
    } else {
      next.delete("subtab");
    }
    // replace, not push - switching tabs shouldn't make the back button
    // step through every tab ever visited.
    setSearchParams(next, { replace: true });
  };

  const onSelectAccessSubTab = (subtab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "access");
    next.set("subtab", subtab);
    setSearchParams(next, { replace: true });
  };

  return (
    <AdministrationHeaderActionProvider>
      <AdministrationPageContent
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onSelectTab={onSelectTab}
        onSelectAccessSubTab={onSelectAccessSubTab}
      />
    </AdministrationHeaderActionProvider>
  );
}

function AdministrationPageContent({
  activeTab,
  activeSubTab,
  onSelectTab,
  onSelectAccessSubTab,
}: {
  activeTab: string;
  activeSubTab: string;
  onSelectTab: (tab: string) => void;
  onSelectAccessSubTab: (subtab: string) => void;
}) {
  // Whichever tab (or, on Access, sub-tab) is active right now registered
  // its own primary action (AdministrationHeaderActionContext.tsx) -
  // General/Repository Signing/Pulp Signing Services/Global Proxy Settings
  // register nothing, so this is `null` for them and PageHeader shows no
  // actions at all.
  const headerAction = useAdministrationHeaderActionFor(
    activeTab === "access" ? activeSubTab : activeTab,
  );

  return (
    <>
      <PageHeader
        title="Administration"
        description="Instance-wide configuration: what every user sees, users/groups/roles, repository signing, Pulp signing services, content guards, and a global default proxy for every Remote."
        actions={headerAction}
      />
      <PageSection hasBodyWrapper={false} type="tabs">
        {/* mountOnEnter - 6 tabs, several with their own list/settings
            queries; without this every one of them would fetch on every
            /admin visit regardless of which tab is actually shown. */}
        <Tabs
          activeKey={activeTab}
          onSelect={(_event, key) => onSelectTab(String(key))}
          mountOnEnter
        >
          <Tab eventKey="general" title={<TabTitleText>General</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <NavVisibilitySettingsSection />
            </PageSection>
          </Tab>
          <Tab eventKey="access" title={<TabTitleText>Access</TabTitleText>}>
            <Tabs
              activeKey={activeSubTab}
              onSelect={(_event, key) => onSelectAccessSubTab(String(key))}
              mountOnEnter
            >
              <Tab eventKey="users" title={<TabTitleText>Users</TabTitleText>}>
                <UsersPage />
              </Tab>
              <Tab eventKey="groups" title={<TabTitleText>Groups</TabTitleText>}>
                <GroupsPage />
              </Tab>
              <Tab eventKey="roles" title={<TabTitleText>Roles</TabTitleText>}>
                <RolesPage />
              </Tab>
            </Tabs>
          </Tab>
          <Tab
            eventKey="repository-signing"
            title={<TabTitleText>Repository Signing</TabTitleText>}
          >
            <RepositorySigningPage />
          </Tab>
          <Tab
            eventKey="pulp-signing-services"
            title={<TabTitleText>Pulp Signing Services</TabTitleText>}
          >
            <SigningPage />
          </Tab>
          <Tab
            eventKey="content-guards"
            title={<TabTitleText>Content guards</TabTitleText>}
          >
            <ContentGuardsPage />
          </Tab>
          <Tab
            eventKey="default-settings"
            title={<TabTitleText>Global Proxy Settings</TabTitleText>}
          >
            <DefaultSettingsPage />
          </Tab>
        </Tabs>
      </PageSection>
    </>
  );
}
