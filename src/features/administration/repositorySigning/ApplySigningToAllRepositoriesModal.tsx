import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useJob } from "../../../api/client/pulpitCore/useJob";
import { useApplySigningToAllRepositoriesMutation } from "./useApplySigningToAllRepositoriesMutation";

interface ApplySigningResult {
  updated_count: number;
  updated: string[];
  resigning_count: number;
  republishing_count: number;
  failed: { repository: string; error: string }[];
  skipped_reason?: string;
}

/** Confirms, then runs, the bulk "bring every existing RPM repository under
 * the current signing key" job (pulpit-core: signing.
 * apply_signing_to_all_repositories) - repositories created going forward
 * already apply the policy automatically at creation (no per-repository
 * opt-in), so this is only for repositories that existed before signing was
 * turned on. Can trigger real re-signing of already-synced packages, not
 * just a field change - explicit and irreversible. */
export function ApplySigningToAllRepositoriesModal({ onClose }: { onClose: () => void }) {
  const applyMutation = useApplySigningToAllRepositoriesMutation();
  const job = useJob(applyMutation.data?.id);

  const jobFailed = job.data?.status === "failed";
  const jobSucceeded = job.data?.status === "success";
  const result = job.data?.result as ApplySigningResult | undefined;
  const isRunning =
    applyMutation.isPending ||
    job.data?.status === "queued" ||
    job.data?.status === "running";

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="apply-signing-all-repositories-title"
      variant="small"
    >
      <ModalHeader
        title="Sign every existing repository?"
        labelId="apply-signing-all-repositories-title"
      />
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
                    : "Could not queue the bulk update."
                }
              />
            </StackItem>
          ) : null}
          {jobFailed ? (
            <StackItem>
              <Alert variant="danger" isInline title="The bulk update failed">
                {job.data?.error}
              </Alert>
            </StackItem>
          ) : null}
          {jobSucceeded && result?.skipped_reason === "no_active_key" ? (
            <StackItem>
              <Alert
                variant="warning"
                isInline
                title="No active signing key yet - generate one first"
              />
            </StackItem>
          ) : null}
          {jobSucceeded && result && !result.skipped_reason ? (
            <StackItem>
              <Alert
                variant={result.failed.length > 0 ? "warning" : "success"}
                isInline
                title={`Updated ${result.updated_count} repositor${result.updated_count === 1 ? "y" : "ies"}${result.failed.length > 0 ? `, ${result.failed.length} failed` : ""}`}
              >
                <Content component="p">
                  {result.resigning_count > 0
                    ? `Re-signing existing packages in ${result.resigning_count} repositor${result.resigning_count === 1 ? "y" : "ies"} in the background. `
                    : ""}
                  {result.republishing_count > 0
                    ? `Republishing metadata for ${result.republishing_count} repositor${result.republishing_count === 1 ? "y" : "ies"}.`
                    : ""}
                </Content>
                {result.failed.length > 0 ? (
                  <List>
                    {result.failed.map((failure, index) => (
                      <ListItem key={`${failure.repository}-${index}`}>
                        {failure.repository}: {failure.error}
                      </ListItem>
                    ))}
                  </List>
                ) : null}
              </Alert>
            </StackItem>
          ) : null}
          {!jobSucceeded && !jobFailed ? (
            <StackItem>
              <Content component="p">
                Brings every existing RPM repository under the currently active signing
                key - repositories already signed correctly are left alone. Repositories
                that need package signing turned on have their existing packages{" "}
                <strong>re-signed in the background</strong> (re-downloaded, re-signed,
                re-uploaded - a new repository version, and can take a while for a
                repository with many packages); metadata-only repositories are just
                republished. This cannot be undone.
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
          {!jobSucceeded ? (
            <FlexItem>
              <Button
                variant="danger"
                isDisabled={isRunning}
                isLoading={isRunning}
                onClick={() => applyMutation.mutate()}
              >
                Sign all repositories
              </Button>
            </FlexItem>
          ) : null}
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
