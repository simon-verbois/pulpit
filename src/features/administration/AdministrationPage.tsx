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
import { LdapSettingsPage } from "./ldap/LdapSettingsPage";
import { TlsPage } from "./tls/TlsPage";

const DEFAULT_TAB = "general";
// Every tab with its own nested sub-tabs (Access: Users/Groups/Roles/LDAP;
// Repository Signing: General/Pulp Signing Services; TLS: Overview/Manual)
// needs a default subtab to land on when the URL names the tab but not a
// subtab - one shared map instead of a per-tab branch, so a future tab
// gaining sub-tabs is a one-line addition here.
const DEFAULT_SUBTAB_BY_TAB: Record<string, string> = {
  access: "users",
  "repository-signing": "general",
  tls: "overview",
};
// Tabs whose per-subtab pages register their own header action by subtab
// id, not by the outer tab id (TLS's subtabs register nothing, so "tls"
// itself is looked up directly instead) - see headerAction below.
const TABS_KEYED_BY_SUBTAB_FOR_HEADER_ACTION = ["access", "repository-signing"];

/** One merged page for every instance-wide admin concern - previously 4
 * separate standalone admin pages plus the whole Access area (Users/Groups/
 * Roles), each with its own left-nav item (docs/adr/
 * 0010-merged-administration-page.md). "Administration" is now a single
 * flat nav link (AppNav.tsx/navTree.ts), and what used to be distinct
 * pages/sections are tabs here instead. Users/Groups/Roles/LDAP (Access),
 * Repository Signing/Pulp Signing Services (Repository Signing - the
 * latter is just the read-only inventory of the underlying Pulp
 * SigningService objects the former's key-generation settings reference by
 * name, not an unrelated concern), and the TLS certificate options (TLS)
 * are each merged into one top-level tab with its own nested sub-tabs,
 * rather than separate top-level tabs.
 *
 * The active tab (and, for tabs with sub-tabs, the active sub-tab) lives in
 * the URL's query string (`?tab=...&subtab=...`), not component state -
 * VERIFIED: React Router's own history/location state (what this used
 * before) does not survive a hard reload (F5), so a refresh always reset
 * back to General. The URL does survive a reload, so this is the one
 * source of truth for both the initial render AND every tab switch
 * afterwards; a caller can also deep-link straight into a tab/sub-tab (e.g.
 * UserDetailPage/GroupDetailPage navigate here with
 * `/admin?tab=access&subtab=users` after a delete) the same way. */
export function AdministrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? DEFAULT_TAB;
  const activeSubTab =
    searchParams.get("subtab") ?? DEFAULT_SUBTAB_BY_TAB[activeTab] ?? "";

  const onSelectTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    // Always reset to THIS tab's own default sub-tab, never carry over
    // whatever sub-tab happened to be selected on a different tab (e.g.
    // Access's "groups" leaking into TLS as its subtab) - clicking a
    // top-level tab is a fresh entry into it, sub-tab memory within a tab
    // is only ever changed by onSelectSubTab below.
    if (tab in DEFAULT_SUBTAB_BY_TAB) {
      next.set("subtab", DEFAULT_SUBTAB_BY_TAB[tab]);
    } else {
      next.delete("subtab");
    }
    // replace, not push - switching tabs shouldn't make the back button
    // step through every tab ever visited.
    setSearchParams(next, { replace: true });
  };

  const onSelectSubTab = (tab: string, subtab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    next.set("subtab", subtab);
    setSearchParams(next, { replace: true });
  };

  return (
    <AdministrationHeaderActionProvider>
      <AdministrationPageContent
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onSelectTab={onSelectTab}
        onSelectSubTab={onSelectSubTab}
      />
    </AdministrationHeaderActionProvider>
  );
}

function AdministrationPageContent({
  activeTab,
  activeSubTab,
  onSelectTab,
  onSelectSubTab,
}: {
  activeTab: string;
  activeSubTab: string;
  onSelectTab: (tab: string) => void;
  onSelectSubTab: (tab: string, subtab: string) => void;
}) {
  // Whichever tab (or, on a tab with its own sub-tabs, sub-tab) is active
  // right now registered its own primary action
  // (AdministrationHeaderActionContext.tsx) - General/Repository
  // Signing/Pulp Signing Services/Global Proxy Settings register nothing,
  // so this is `null` for them and PageHeader shows no actions at all.
  const headerAction = useAdministrationHeaderActionFor(
    TABS_KEYED_BY_SUBTAB_FOR_HEADER_ACTION.includes(activeTab) ? activeSubTab : activeTab,
  );

  return (
    <>
      <PageHeader
        title="Administration"
        className="pulpit-administration-header"
        description="Instance-wide configuration: what every user sees, users/groups/roles, LDAP authentication, repository signing, Pulp signing services, content guards, TLS, and a global outbound proxy and trusted CA certificates."
        actions={headerAction}
      />
      <PageSection hasBodyWrapper={false} type="tabs">
        {/* mountOnEnter - several tabs have their own list/settings
            queries; without this every one of them would fetch on every
            /admin visit regardless of which tab is actually shown. */}
        <Tabs
          activeKey={activeTab}
          onSelect={(_event, key) => onSelectTab(String(key))}
          mountOnEnter
          tabListAriaLabel="Administration sections"
          isOverflowHorizontal={{
            showTabCount: true,
            defaultTitleText: "More",
            toggleAriaLabel: "More administration sections",
          }}
        >
          <Tab eventKey="general" title={<TabTitleText>General</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <NavVisibilitySettingsSection />
            </PageSection>
          </Tab>
          <Tab eventKey="access" title={<TabTitleText>Access</TabTitleText>}>
            <Tabs
              activeKey={activeSubTab}
              onSelect={(_event, key) => onSelectSubTab("access", String(key))}
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
              <Tab eventKey="ldap" title={<TabTitleText>LDAP</TabTitleText>}>
                <LdapSettingsPage />
              </Tab>
            </Tabs>
          </Tab>
          <Tab
            eventKey="repository-signing"
            title={<TabTitleText>Repository Signing</TabTitleText>}
          >
            <Tabs
              activeKey={activeSubTab}
              onSelect={(_event, key) =>
                onSelectSubTab("repository-signing", String(key))
              }
              mountOnEnter
            >
              <Tab eventKey="general" title={<TabTitleText>General</TabTitleText>}>
                <RepositorySigningPage />
              </Tab>
              <Tab
                eventKey="pulp-signing-services"
                title={<TabTitleText>Pulp Signing Services</TabTitleText>}
              >
                <SigningPage />
              </Tab>
            </Tabs>
          </Tab>
          <Tab
            eventKey="content-guards"
            title={<TabTitleText>Content guards</TabTitleText>}
          >
            <ContentGuardsPage />
          </Tab>
          <Tab eventKey="tls" title={<TabTitleText>TLS</TabTitleText>}>
            <TlsPage
              activeSubTab={activeSubTab}
              onSelectSubTab={(subtab) => onSelectSubTab("tls", subtab)}
            />
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
