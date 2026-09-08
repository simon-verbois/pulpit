import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  Content,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import type { Warning } from "../lib/warnings";

/**
 * The Overview page's one warnings card, merging every source that has
 * something to say (Pulp version compatibility, an expiring TLS
 * certificate, ...) into a single list - a real, non-decorative signal, not
 * a live drift-detection service (each source decides for itself what's
 * worth surfacing; this card just renders whatever it's handed). Empty by
 * default, exactly like the single-purpose CompatibilityWarnings this
 * replaced.
 */
export function OverviewWarnings({ sources }: { sources: Warning[][] }) {
  const warnings = sources.flat();

  return (
    <Card isCompact>
      <CardTitle>Warnings</CardTitle>
      <CardBody>
        {warnings.length === 0 ? (
          <Content component="small">No issues detected.</Content>
        ) : (
          <Stack hasGutter>
            {warnings.map((warning) => (
              <StackItem key={warning.id}>
                <Alert isInline variant={warning.variant} title={warning.message} />
              </StackItem>
            ))}
          </Stack>
        )}
      </CardBody>
    </Card>
  );
}
