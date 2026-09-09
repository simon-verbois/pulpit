import { useQuery } from "@tanstack/react-query";
import { Alert, Content, StackItem } from "@patternfly/react-core";

import { getSigningKeyPulpServices } from "../../../api/client/pulpitCore/signing";
import { signingKeyPulpServicesKey } from "./queryKeys";

/** A service normally clears "pending_manual_setup" on its own within well
 * under a minute (the colocated reconciler polls every 30s - see
 * deployment/docker/pulp/pulpit-signing-reconciler and
 * app/modules/signing/jobs.py's check_pulp_bootstrap_job quick-retry loop).
 * Below this age it's still within that expected window, not a real
 * problem worth interrupting the admin over. */
const PENDING_GRACE_PERIOD_MS = 90_000;

/** Renders nothing while every required Pulp signing service is already
 * registered, or still within the automated registration's normal window,
 * and only surfaces something once a service has been pending long enough
 * to genuinely need attention (see docs/signing.md "Automating the manual
 * Pulp step"). */
export function KeyPulpServicesStatus({ keyId }: { keyId: string }) {
  const query = useQuery({
    queryKey: signingKeyPulpServicesKey(keyId),
    queryFn: () => getSigningKeyPulpServices(keyId),
    refetchInterval: 10000,
  });

  // dataUpdatedAt (react-query's own "as of when" timestamp for this fetch)
  // instead of Date.now(), which would make this component impure and
  // update unpredictably between renders.
  const asOf = query.dataUpdatedAt;
  const stuck = (query.data ?? []).filter(
    (service) =>
      service.status === "pending_manual_setup" &&
      asOf - new Date(service.created_at).getTime() > PENDING_GRACE_PERIOD_MS,
  );

  if (stuck.length === 0) {
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
          server itself, and this is taking longer than usual - the automated setup may
          not be available on this deployment. Run the command below inside the{" "}
          <code>pulp</code> container (e.g. <code>docker compose exec pulp ...</code>,{" "}
          <code>podman exec pulp-pulp ...</code>, or{" "}
          <code>kubectl exec deploy/pulp -- ...</code>
          ); this page will detect the change automatically within a few minutes.
        </Content>
        {stuck.map((service) => (
          <pre
            key={service.name}
            style={{
              marginBlockEnd: 0,
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
            }}
          >
            <code>{service.bootstrap_command ?? ""}</code>
          </pre>
        ))}
      </Alert>
    </StackItem>
  );
}
