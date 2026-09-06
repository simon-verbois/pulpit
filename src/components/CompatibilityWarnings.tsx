import { Alert, Card, CardBody, CardTitle, Content, Stack, StackItem } from "@patternfly/react-core";

import type { PulpStatus } from "../api/client/status";
import { compatibilityStatus, VERIFIED_VERSIONS } from "../lib/pulpCompatibility";

interface Warning {
  component: string;
  variant: "warning" | "info";
  message: string;
}

function buildWarnings(status: PulpStatus): Warning[] {
  const warnings: Warning[] = [];
  for (const v of status.versions ?? []) {
    const result = compatibilityStatus(v.component, v.version);
    // "matches" needs no warning; "not_implemented" just means Pulpit has no
    // UI for this component at all - expected for most of a Pulp instance's
    // components, not a signal anything is wrong.
    if (result === "matches" || result === "not_implemented") {
      continue;
    }
    const baseline = VERIFIED_VERSIONS[v.component];
    if (result === "newer") {
      warnings.push({
        component: v.component,
        variant: "info",
        message: `${v.component} is running ${v.version}, newer than the ${baseline} Pulpit was last verified against - likely fine, but not yet tested.`,
      });
    } else if (result === "older") {
      warnings.push({
        component: v.component,
        variant: "warning",
        message: `${v.component} is running ${v.version}, older than the ${baseline} Pulpit was last verified against.`,
      });
    } else {
      warnings.push({
        component: v.component,
        variant: "warning",
        message: `${v.component} reported version "${v.version}", which couldn't be compared against Pulpit's verified baseline (${baseline}).`,
      });
    }
  }
  return warnings;
}

/**
 * Empty by default - only ever populated by a REAL compatibility check
 * (compatibilityStatus, src/lib/pulpCompatibility.ts) against the versions
 * Pulp's own /status/ endpoint reports, compared against the baseline
 * Pulpit was last manually verified against (docs/ROADMAP.md). Not a live
 * drift-detection service (there's no such Pulp API to check against - see
 * that module's own docstring), but a real, non-decorative signal: this
 * fills in whenever an operator's own Pulp instance (this app is explicitly
 * designed to be pointed at any Pulp deployment, not only the project's own
 * bundled image - docs/ARCHITECTURE.md) drifts from that baseline.
 */
export function CompatibilityWarnings({ status }: { status: PulpStatus }) {
  const warnings = buildWarnings(status);

  return (
    <Card isCompact>
      <CardTitle>Warnings</CardTitle>
      <CardBody>
        {warnings.length === 0 ? (
          <Content component="small">No compatibility issues detected.</Content>
        ) : (
          <Stack hasGutter>
            {warnings.map((warning) => (
              <StackItem key={warning.component}>
                <Alert isInline variant={warning.variant} title={warning.message} />
              </StackItem>
            ))}
          </Stack>
        )}
      </CardBody>
    </Card>
  );
}
