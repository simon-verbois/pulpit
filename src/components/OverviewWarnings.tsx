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
import { UiIcon } from "./icons/UiIcon";

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
    <Card isCompact className="pulpit-dashboard-panel pulpit-warnings-panel">
      <CardTitle>Warnings</CardTitle>
      <CardBody>
        {warnings.length === 0 ? (
          <div className="pulpit-healthy-state">
            <div className="pulpit-healthy-state__icon" aria-hidden="true">
              <UiIcon name="shield-check" />
            </div>
            <div>
              <Content component="p" className="pulpit-healthy-state__title">
                No issues detected.
              </Content>
              <Content component="small">
                Your system is healthy. Check logs for details.
              </Content>
            </div>
          </div>
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
