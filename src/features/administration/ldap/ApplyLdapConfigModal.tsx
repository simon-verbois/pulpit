import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useJob } from "../../../api/client/pulpitCore/useJob";
import type { LdapApplyResult } from "../../../api/client/pulpitCore/types";
import { useApplyLdapConfigMutation } from "./useApplyLdapConfigMutation";

/** Confirms, then runs, the job that pushes the currently-saved LDAP config
 * out to Pulp and restarts its API process to pick it up - explicit and
 * disruptive (every user's login goes through the restarted process for a
 * few seconds), unlike saving settings, which never reaches Pulp on its
 * own. Only ever opened while the form has nothing unsaved
 * (LdapSettingsPage.tsx), so this always applies exactly what's currently
 * saved. Takes 35-65s (the colocated reconciler's own poll cycle plus a
 * health-check grace period, app/modules/ldap/jobs.py) - much longer than
 * most job-backed actions in this app, so the modal makes that wait
 * explicit rather than looking stuck. */
export function ApplyLdapConfigModal({ onClose }: { onClose: () => void }) {
  const applyMutation = useApplyLdapConfigMutation();
  const job = useJob(applyMutation.data?.id);

  const jobFailed = job.data?.status === "failed";
  const jobSucceeded = job.data?.status === "success";
  const result = job.data?.result as LdapApplyResult | undefined;
  const isRunning =
    applyMutation.isPending ||
    job.data?.status === "queued" ||
    job.data?.status === "running";

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="apply-ldap-config-title"
      variant="small"
    >
      <ModalHeader title="Apply LDAP configuration?" labelId="apply-ldap-config-title" />
      <ModalBody>
        <Stack hasGutter>
          {applyMutation.isError ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title={
                  applyMutation.error instanceof PulpApiError
                    ? applyMutation.error.message
                    : "Could not queue the apply."
                }
              />
            </StackItem>
          ) : null}
          {jobFailed ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title="Could not apply the LDAP configuration"
              >
                {job.data?.error}
              </Alert>
            </StackItem>
          ) : null}
          {jobSucceeded && result ? (
            <StackItem>
              <Alert
                variant={result.pulp_api_healthy ? "success" : "warning"}
                isInline
                title={
                  result.pulp_api_healthy
                    ? "Applied - Pulp's API is back up"
                    : "Applied, but Pulp's API did not come back up healthy"
                }
              >
                {result.pulp_api_healthy ? (
                  "This only confirms the config was written and Pulp's API process restarted successfully - it does not confirm LDAP logins actually work. Use Test connection above for that."
                ) : (
                  <>
                    {result.error ? `${result.error} - ` : ""}
                    check the pulp container's logs (pulpit-ldap-reconciler,
                    pulpcore-api).
                  </>
                )}
              </Alert>
            </StackItem>
          ) : null}
          {!jobSucceeded && !jobFailed ? (
            <StackItem>
              <Content component="p">
                This restarts Pulp's API process to pick up the new authentication backend
                - every user's login (including this one) goes through that process for
                the few seconds it takes to come back up. Takes up to about a minute; this
                dialog stays open until it's done.
              </Content>
            </StackItem>
          ) : null}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Flex
          justifyContent={{ default: "justifyContentFlexEnd" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <Button variant="link" onClick={onClose}>
              {jobSucceeded ? "Close" : "Cancel"}
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="danger"
              isDisabled={isRunning || jobSucceeded}
              isLoading={isRunning}
              onClick={() => applyMutation.mutate()}
            >
              Apply
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
