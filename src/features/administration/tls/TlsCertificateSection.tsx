import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { useActiveTlsCertificateQuery } from "./useActiveTlsCertificateQuery";
import { useRegenerateSelfSignedCertificateMutation } from "./useRegenerateSelfSignedCertificateMutation";
import { TLS_CERT_SOURCE_LABEL } from "./tlsCertSource";

/** The one card every TLS sub-tab/warning ultimately reads from - see
 * GET /api/v1/tls/active (app/modules/tls/routes/active.py): the same
 * response backs this card AND the Overview-page expiry warning, so the
 * expiry threshold is never hardcoded twice. */
export function TlsCertificateSection() {
  const activeQuery = useActiveTlsCertificateQuery();
  const regenerateMutation = useRegenerateSelfSignedCertificateMutation();

  return (
    <Card isCompact>
      <CardTitle>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
        >
          <FlexItem>Active certificate (port 8443)</FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              isLoading={regenerateMutation.isPending}
              isDisabled={regenerateMutation.isPending}
              onClick={() => regenerateMutation.mutate()}
            >
              Regenerate self-signed certificate
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Stack hasGutter>
          {activeQuery.isPending ? (
            <StackItem>
              <LoadingState label="Loading TLS certificate status" />
            </StackItem>
          ) : null}
          {activeQuery.isError ? (
            <StackItem>
              <ErrorState
                error={activeQuery.error}
                onRetry={() => activeQuery.refetch()}
              />
            </StackItem>
          ) : null}
          {regenerateMutation.isError ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title="Could not queue certificate regeneration."
              />
            </StackItem>
          ) : null}

          {activeQuery.data ? (
            <>
              {activeQuery.data.is_expiring_soon ? (
                <StackItem>
                  <Alert
                    isInline
                    variant="warning"
                    title={`This certificate expires in ${activeQuery.data.days_until_expiry} day(s).`}
                  />
                </StackItem>
              ) : null}
              <StackItem>
                <DescriptionList isHorizontal style={{ rowGap: "1rem" }}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Source</DescriptionListTerm>
                    <DescriptionListDescription>
                      <span className="pulpit-inline-values">
                        {TLS_CERT_SOURCE_LABEL[activeQuery.data.source]}
                      </span>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Subject</DescriptionListTerm>
                    <DescriptionListDescription>
                      {activeQuery.data.subject}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Fingerprint (SHA-256)</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code style={{ wordBreak: "break-all" }}>
                        {activeQuery.data.fingerprint_sha256}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Valid from</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatRelativeTime(activeQuery.data.not_before)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Valid until</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatRelativeTime(activeQuery.data.not_after)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </StackItem>
            </>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
