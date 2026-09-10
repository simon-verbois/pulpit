import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import EllipsisVIcon from "@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon";
import EyeIcon from "@patternfly/react-icons/dist/esm/icons/eye-icon";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { StatusIndicator } from "../../../components/StatusIndicator";
import { formatRelativeTime } from "../../../lib/relativeTime";
import type { SigningKey } from "../../../api/client/pulpitCore/types";
import { useSigningKeysQuery } from "./useSigningKeysQuery";
import { usePublishSigningKeyMutation } from "./usePublishSigningKeyMutation";
import { ExtendExpirationModal } from "./ExtendExpirationModal";
import { SigningKeyDetailsModal } from "./SigningKeyDetailsModal";
import { KeyPulpServicesStatus } from "./KeyPulpServicesStatus";
import { SIGNING_KEY_STATE_COLOR, SIGNING_KEY_STATE_LABEL } from "./signingKeyState";

function KeyRowActions({ signingKey }: { signingKey: SigningKey }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const publishMutation = usePublishSigningKeyMutation();

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        popperProps={{ appendTo: () => document.body, position: "right" }}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            onClick={() => setIsOpen((v) => !v)}
            aria-label="Key actions"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem
            key="export"
            to={signingKey.public_key_url}
            target="_blank"
            rel="noreferrer"
          >
            Export public key
          </DropdownItem>
          {signingKey.state === "next" ? (
            <DropdownItem
              key="publish"
              onClick={() => {
                setIsOpen(false);
                publishMutation.mutate({ keyId: signingKey.id });
              }}
            >
              Publish now
            </DropdownItem>
          ) : null}
          {signingKey.state === "active" || signingKey.state === "next" ? (
            <DropdownItem
              key="extend"
              onClick={() => {
                setIsOpen(false);
                setShowExtend(true);
              }}
            >
              Extend expiration
            </DropdownItem>
          ) : null}
        </DropdownList>
      </Dropdown>
      {showExtend ? (
        <ExtendExpirationModal
          signingKey={signingKey}
          onClose={() => setShowExtend(false)}
        />
      ) : null}
    </>
  );
}

export function RepositorySigningKeysSection({
  onGenerateKey,
}: {
  onGenerateKey: () => void;
}) {
  const keysQuery = useSigningKeysQuery();
  const [inspectKey, setInspectKey] = useState<SigningKey | null>(null);

  const activeKey = keysQuery.data?.find((k) => k.state === "active");
  const nextKey = keysQuery.data?.find((k) => k.state === "next");

  return (
    <Card isCompact>
      <CardTitle>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
        >
          <FlexItem>Signing keys</FlexItem>
          <FlexItem>
            <Flex
              spaceItems={{ default: "spaceItemsSm" }}
              alignItems={{ default: "alignItemsCenter" }}
            >
              <FlexItem>
                <Button variant="primary" onClick={onGenerateKey}>
                  Generate key
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Stack hasGutter>
          {keysQuery.isPending ? (
            <StackItem>
              <LoadingState label="Loading signing keys" />
            </StackItem>
          ) : null}
          {keysQuery.isError ? (
            <StackItem>
              <ErrorState error={keysQuery.error} onRetry={() => keysQuery.refetch()} />
            </StackItem>
          ) : null}
          {keysQuery.isSuccess && keysQuery.data.length === 0 ? (
            <StackItem>
              <EmptyState
                variant="sm"
                title="No signing key generated yet"
                body="Generate a key above to enable package and metadata signing."
              />
            </StackItem>
          ) : null}

          {keysQuery.isSuccess && !activeKey && keysQuery.data.length > 0 ? (
            <StackItem>
              <Content component="p">
                No key is currently published - the public key URL has nothing to serve
                yet.
                {nextKey
                  ? " A key has already been generated and will publish automatically once ready."
                  : ""}
              </Content>
            </StackItem>
          ) : null}
          {activeKey ? <KeyPulpServicesStatus keyId={activeKey.id} /> : null}
          {nextKey ? <KeyPulpServicesStatus keyId={nextKey.id} /> : null}

          {keysQuery.isSuccess && keysQuery.data.length > 0 ? (
            <StackItem>
              <div style={{ overflowX: "auto" }}>
                <Table aria-label="Signing keys" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Status</Th>
                      <Th>Fingerprint</Th>
                      <Th>Identity</Th>
                      <Th>Algorithm</Th>
                      <Th>Created</Th>
                      <Th>Expires</Th>
                      <Th screenReaderText="Actions" />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {keysQuery.data.map((key) => (
                      <Tr key={key.id}>
                        <Td dataLabel="Status">
                          <StatusIndicator
                            color={SIGNING_KEY_STATE_COLOR[key.state]}
                            title={key.state}
                          >
                            {SIGNING_KEY_STATE_LABEL[key.state]}
                          </StatusIndicator>
                        </Td>
                        <Td dataLabel="Fingerprint">
                          <code>{key.fingerprint}</code>
                        </Td>
                        <Td dataLabel="Identity">{key.identity_name}</Td>
                        <Td dataLabel="Algorithm">{key.algorithm.toUpperCase()}</Td>
                        <Td dataLabel="Created">{formatRelativeTime(key.created_at)}</Td>
                        <Td dataLabel="Expires">
                          {key.expires_at ? formatRelativeTime(key.expires_at) : "Never"}
                        </Td>
                        <Td dataLabel="Actions" isActionCell>
                          <Flex
                            spaceItems={{ default: "spaceItemsNone" }}
                            flexWrap={{ default: "nowrap" }}
                            alignItems={{ default: "alignItemsCenter" }}
                          >
                            <FlexItem>
                              <Button
                                variant="plain"
                                aria-label="Inspect key"
                                icon={<EyeIcon />}
                                onClick={() => setInspectKey(key)}
                              />
                            </FlexItem>
                            <FlexItem>
                              <KeyRowActions signingKey={key} />
                            </FlexItem>
                          </Flex>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            </StackItem>
          ) : null}
        </Stack>
      </CardBody>

      {inspectKey ? (
        <SigningKeyDetailsModal
          signingKey={inspectKey}
          onClose={() => setInspectKey(null)}
        />
      ) : null}
    </Card>
  );
}
