import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
} from "@patternfly/react-core";

import { UploadCertificateModal } from "./UploadCertificateModal";

/** No auto-renewal for this source - there is no key material pulpit-core
 * could regenerate on the admin's behalf, so this is a "paste in a new one
 * before it expires" workflow (docs/tls.md "Manual upload"); the Overview
 * page's warning is the only signal as it nears expiry. */
export function ManualCertificateSection() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <Card isCompact>
      <CardTitle>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
        >
          <FlexItem>Manual certificate</FlexItem>
          <FlexItem>
            <Button variant="primary" onClick={() => setShowUploadModal(true)}>
              Upload certificate
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content component="small">
          Paste a PEM certificate and its matching, unencrypted private key. Installed
          immediately as the active certificate for port 8443. Not auto-renewed -
          re-upload a new one before this one expires (the Overview page warns as it nears
          expiry).
        </Content>
      </CardBody>
      {showUploadModal ? (
        <UploadCertificateModal onClose={() => setShowUploadModal(false)} />
      ) : null}
    </Card>
  );
}
