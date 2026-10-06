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
import type { RpmRepository } from "../../../api/client/rpm/types";
import {
  rpmRepositoriesListRootKey,
  rpmRepositoryByNameKey,
  rpmRepositoryVersionsKey,
} from "./queryKeys";
import { useResignRepositoryMutation } from "./useResignRepositoryMutation";

/** `signing.resign_repository_packages`'s result (pulpit-core jobs.py). A
 * metadata-only policy runs `signing.publish_repository_metadata` instead,
 * whose result has none of these counts. */
interface ResignResult {
  evaluated?: number;
  candidates?: number;
  signed?: number;
  cache_hits?: number;
  skipped?: number;
  failed?: number;
  failed_packages?: { package: string; error: string }[];
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Confirms, then runs, the per-repository "Re-sign" action: re-applies the
 * current signing policy to this repository and checks every package in it
 * against the active key, re-signing whatever isn't signed with it yet - for
 * when the automatic post-sync/rotation paths didn't get it there. */
export function ResignRepositoryModal({
  repository,
  onClose,
}: {
  repository: RpmRepository;
  onClose: () => void;
}) {
  const resignMutation = useResignRepositoryMutation();
  const job = useJob(resignMutation.data?.id);

  const jobFailed = job.data?.status === "failed";
  const jobSucceeded = job.data?.status === "success";
  const result = job.data?.result as ResignResult | undefined;
  const isRunning =
    resignMutation.isPending ||
    job.data?.status === "queued" ||
    job.data?.status === "running";

  const failedCount = result?.failed ?? 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="resign-repository-title"
      variant="small"
    >
      <ModalHeader
        title={`Re-sign "${repository.name}"?`}
        labelId="resign-repository-title"
      />
      <ModalBody>
        <Stack hasGutter>
          {resignMutation.isError ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title={
                  resignMutation.error instanceof PulpApiError
                    ? resignMutation.error.message
                    : "Could not start re-signing."
                }
              />
            </StackItem>
          ) : null}
          {jobFailed ? (
            <StackItem>
              <Alert variant="danger" isInline title="Re-signing failed">
                {job.data?.error}
              </Alert>
            </StackItem>
          ) : null}
          {jobSucceeded && result?.evaluated === undefined ? (
            <StackItem>
              <Alert variant="success" isInline title="Metadata republished and signed" />
            </StackItem>
          ) : null}
          {jobSucceeded && result?.evaluated !== undefined ? (
            <StackItem>
              <Alert
                variant={failedCount > 0 ? "warning" : "success"}
                isInline
                title={
                  (result.candidates ?? 0) === 0
                    ? `All ${plural(result.evaluated, "package")} already signed with the active key`
                    : `Checked ${plural(result.evaluated, "package")}: ${result.signed ?? 0} re-signed, ${result.cache_hits ?? 0} reused${failedCount > 0 ? `, ${failedCount} failed` : ""}`
                }
              >
                {(result.skipped ?? 0) > 0 ? (
                  <Content component="p">
                    {plural(result.skipped ?? 0, "package")} not yet in the published
                    metadata were skipped - run this again to cover them.
                  </Content>
                ) : null}
                {result.failed_packages && result.failed_packages.length > 0 ? (
                  <List>
                    {result.failed_packages.map((failure) => (
                      <ListItem key={failure.package}>
                        {failure.package}: {failure.error}
                      </ListItem>
                    ))}
                  </List>
                ) : null}
              </Alert>
            </StackItem>
          ) : null}
          {isRunning && resignMutation.data ? (
            <StackItem>
              <Content component="p">
                Re-signing in the background - you can close this dialog and follow it
                from the Tasks drawer.
              </Content>
            </StackItem>
          ) : null}
          {!jobSucceeded && !jobFailed && !isRunning ? (
            <StackItem>
              <Content component="p">
                Re-applies the current signing policy to this repository and checks every
                package in it against the active signing key. Packages not signed with it
                are <strong>re-signed</strong> (re-downloaded, re-signed, re-uploaded - a
                new repository version, which can take a while for a large repository);
                packages already signed correctly are left alone.
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
                variant="primary"
                isDisabled={isRunning}
                isLoading={isRunning}
                onClick={() =>
                  resignMutation.mutate({
                    href: repository.pulp_href,
                    name: repository.name,
                    invalidateKeys: [
                      rpmRepositoryByNameKey(repository.name),
                      rpmRepositoriesListRootKey,
                      rpmRepositoryVersionsKey(repository.versions_href),
                    ],
                  })
                }
              >
                Re-sign
              </Button>
            </FlexItem>
          ) : null}
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
