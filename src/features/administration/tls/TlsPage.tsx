import {
  PageSection,
  Stack,
  StackItem,
  Tab,
  TabTitleText,
  Tabs,
} from "@patternfly/react-core";

import { TlsCertificateSection } from "./TlsCertificateSection";
import { TlsCertificateHistorySection } from "./TlsCertificateHistorySection";
import { ManualCertificateSection } from "./ManualCertificateSection";

/** Administration > TLS, mirroring Access's own nested sub-tabs (Users/
 * Groups/Roles) - an Overview plus manual certificate import. */
export function TlsPage({
  activeSubTab,
  onSelectSubTab,
}: {
  activeSubTab: string;
  onSelectSubTab: (subtab: string) => void;
}) {
  const selectedSubTab = activeSubTab === "manual" ? "manual" : "overview";

  return (
    <Tabs
      activeKey={selectedSubTab}
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
    </Tabs>
  );
}
