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
import { useApplyProxyToAllRemotesMutation } from "./useApplyProxyToAllRemotesMutation";

interface ApplyProxyResult {
  updated_count: number;
  updated: string[];
  failed: { name: string | null; error: string }[];
}

/** Confirms, then runs, the bulk "overwrite every Remote's proxy with these
 * settings" job (pulpit-core: default_settings.apply_proxy_to_all_remotes)
 * - explicit and irreversible, unlike the automatic "use instance default"
 * a new Remote can opt into (RemoteConnectionSettingsFields.tsx). Only ever
 * opened while the form has nothing unsaved (DefaultSettingsPage.tsx),
 * so this always applies exactly what's currently saved. */
export function ApplyProxyToAllRemotesModal({ onClose }: { onClose: () => void }) {
  const applyMutation = useApplyProxyToAllRemotesMutation();
  const job = useJob(applyMutation.data?.id);

  const jobFailed = job.data?.status === "failed";
  const jobSucceeded = job.data?.status === "success";
  const result = job.data?.result as ApplyProxyResult | undefined;
  const isRunning =
    applyMutation.isPending ||
    job.data?.status === "queued" ||
    job.data?.status === "running";

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="apply-proxy-all-remotes-title"
      variant="small"
    >
      <ModalHeader
        title="Apply to every remote?"
        labelId="apply-proxy-all-remotes-title"
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
          {jobSucceeded && result ? (
            <StackItem>
              <Alert
                variant={result.failed.length > 0 ? "warning" : "success"}
                isInline
                title={`Updated ${result.updated_count} remote${result.updated_count === 1 ? "" : "s"}${result.failed.length > 0 ? `, ${result.failed.length} failed` : ""}`}
              >
                {result.failed.length > 0 ? (
                  <List>
                    {result.failed.map((failure, index) => (
                      <ListItem key={`${failure.name ?? "unknown"}-${index}`}>
                        {failure.name ?? "Unknown remote"}: {failure.error}
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
                This overwrites the proxy URL, username, password, TLS-validation
                preference, and trusted CA certificate on{" "}
                <strong>every existing Remote</strong>, across every plugin, with whatever
                is currently saved above - regardless of what each one is set to now. This
                cannot be undone; the previous per-remote values aren't recorded anywhere.
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
              Apply to all remotes
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
