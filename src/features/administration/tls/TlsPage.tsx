import { PageSection, Stack, StackItem, Tab, TabTitleText, Tabs } from "@patternfly/react-core";

import { TlsCertificateSection } from "./TlsCertificateSection";
import { TlsCertificateHistorySection } from "./TlsCertificateHistorySection";
import { ManualCertificateSection } from "./ManualCertificateSection";
import { FreeIpaSection } from "./FreeIpaSection";

/** Administration > TLS, mirroring Access's own nested sub-tabs (Users/
 * Groups/Roles) - one sub-tab per certificate provider, plus an Overview
 * showing whichever one is currently active. */
export function TlsPage({
  activeSubTab,
  onSelectSubTab,
}: {
  activeSubTab: string;
  onSelectSubTab: (subtab: string) => void;
}) {
  return (
    <Tabs
      activeKey={activeSubTab}
      onSelect={(_event, key) => onSelectSubTab(String(key))}
      mountOnEnter
    >
      <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
        <PageSection hasBodyWrapper={false}>
          <Stack hasGutter>
            <StackItem>
              <TlsCertificateSection />
            </StackItem>
            <StackItem>
              <TlsCertificateHistorySection />
            </StackItem>
          </Stack>
        </PageSection>
      </Tab>
      <Tab eventKey="manual" title={<TabTitleText>Manual</TabTitleText>}>
        <PageSection hasBodyWrapper={false}>
          <ManualCertificateSection />
        </PageSection>
      </Tab>
      <Tab eventKey="freeipa" title={<TabTitleText>FreeIPA</TabTitleText>}>
        <PageSection hasBodyWrapper={false}>
          <FreeIpaSection />
        </PageSection>
      </Tab>
    </Tabs>
  );
}
