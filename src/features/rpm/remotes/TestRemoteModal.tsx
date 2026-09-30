import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

import { testRpmRemote } from "../../../api/client/rpm/remoteTest";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { LoadingState } from "../../../components/LoadingState";

/** Runs the connection test as soon as it opens (the row's "Test" action is
 * the explicit trigger) and shows the outcome; "Test again" re-runs it.
 * A query rather than a mutation only so StrictMode's double mount doesn't
 * fire two probes - never cached or retried, every open is a fresh test. */
export function TestRemoteModal({
  remote,
  onClose,
}: {
  remote: { pulp_href: string; name: string };
  onClose: () => void;
}) {
  const testQuery = useQuery({
    queryKey: ["pulp", "rpm", "remoteTest", remote.pulp_href],
    queryFn: () => testRpmRemote(remote.pulp_href),
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const result = testQuery.data;

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="test-remote-title" variant="small">
      <ModalHeader title={`Test "${remote.name}"`} labelId="test-remote-title" />
      <ModalBody>
        {testQuery.isFetching ? <LoadingState label="Testing connection" /> : null}
        {!testQuery.isFetching && testQuery.isError ? (
          <Alert variant="danger" isInline title="Could not run the connection test">
            {testQuery.error instanceof PulpApiError
              ? testQuery.error.message
              : String(testQuery.error)}
          </Alert>
        ) : null}
        {!testQuery.isFetching && testQuery.isSuccess && result ? (
          <Alert
            variant={result.ok ? "success" : "danger"}
            isInline
            title={result.ok ? "Connection OK" : "Connection failed"}
          >
            <p>{result.detail}</p>
            <p>
              Tested: <code>{result.url}</code>
            </p>
          </Alert>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Flex
          justifyContent={{ default: "justifyContentFlexEnd" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <Button variant="link" onClick={onClose}>
              Close
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="secondary"
              isDisabled={testQuery.isFetching}
              onClick={() => testQuery.refetch()}
            >
              Test again
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
