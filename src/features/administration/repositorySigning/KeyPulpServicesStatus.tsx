import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  ClipboardCopy,
  ClipboardCopyVariant,
  Content,
  StackItem,
} from "@patternfly/react-core";

import { getSigningKeyPulpServices } from "../../../api/client/pulpitCore/signing";
import { signingKeyPulpServicesKey } from "./queryKeys";

/** Renders nothing while every required Pulp signing service is already
 * registered, and only surfaces something when a service genuinely needs
 * attention: the one manual step in an otherwise fully automated workflow
 * (see docs/signing.md "Automating the manual Pulp step"). */
export function KeyPulpServicesStatus({ keyId }: { keyId: string }) {
  const query = useQuery({
    queryKey: signingKeyPulpServicesKey(keyId),
    queryFn: () => getSigningKeyPulpServices(keyId),
    refetchInterval: 10000,
  });

  const pending = (query.data ?? []).filter(
    (service) => service.status === "pending_manual_setup",
  );

  if (pending.length === 0) {
    return null;
  }

  return (
    <StackItem>
      <Alert
        variant="warning"
        isInline
        title="Waiting on a one-time manual step to finish publishing this key"
      >
        <Content component="p">
          Pulp signing services can only be registered by running a command on the Pulp
          server itself. Run the command below inside the <code>pulp</code> container;
          this page will detect the change automatically within a few minutes.
        </Content>
        {pending.map((service) => (
          <ClipboardCopy
            key={service.name}
            isReadOnly
            isCode
            hoverTip="Copy"
            clickTip="Copied"
            variant={ClipboardCopyVariant.expansion}
          >
            {`docker compose exec pulp ${service.bootstrap_command}`}
          </ClipboardCopy>
        ))}
      </Alert>
    </StackItem>
  );
}
