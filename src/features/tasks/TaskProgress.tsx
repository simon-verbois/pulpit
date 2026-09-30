import type { ReactNode } from "react";
import { Flex, FlexItem, Progress, Stack, StackItem } from "@patternfly/react-core";

import type { PulpProgressReport } from "../../api/client/tasks";

const VARIANT: Record<string, "success" | "danger" | "warning" | undefined> = {
  completed: "success",
  failed: "danger",
  canceled: "warning",
};

/** A 0/0 counter (e.g. rpm sync's "Skipping Packages" when nothing was
 * skipped) or a skipped stage carries no information worth a row. */
function isMeaningful(report: PulpProgressReport): boolean {
  return report.state !== "skipped" && report.total !== 0;
}

function formatCount(report: PulpProgressReport): string {
  const done = (report.done ?? 0).toLocaleString();
  const count = report.total ? `${done} / ${report.total.toLocaleString()}` : done;
  return report.suffix ? `${count} ${report.suffix}` : count;
}

/**
 * Renders the task's own `progress_reports` - never an estimate: a bar only
 * when Pulp reports a `total`, a plain counter otherwise (downloads and
 * metadata fetches are open-ended). `runningOnly` narrows it to the stages
 * currently in flight, for the compact Tasks drawer. `heading` renders only
 * when at least one row does.
 */
export function TaskProgress({
  reports,
  runningOnly = false,
  heading,
}: {
  reports: PulpProgressReport[] | undefined;
  runningOnly?: boolean;
  heading?: ReactNode;
}) {
  const visible = (reports ?? []).filter(
    (report) => isMeaningful(report) && (!runningOnly || report.state === "running"),
  );
  if (visible.length === 0) {
    return null;
  }

  return (
    <Stack hasGutter>
      {heading ? <StackItem>{heading}</StackItem> : null}
      {visible.map((report, index) => {
        const title = report.message ?? report.code ?? "Progress";
        return (
          <StackItem key={report.code ?? index}>
            {report.total ? (
              <Progress
                size="sm"
                title={title}
                value={report.done ?? 0}
                max={report.total}
                label={formatCount(report)}
                valueText={formatCount(report)}
                measureLocation="top"
                variant={report.state ? VARIANT[report.state] : undefined}
              />
            ) : (
              <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
                <FlexItem>{title}</FlexItem>
                <FlexItem>{formatCount(report)}</FlexItem>
              </Flex>
            )}
          </StackItem>
        );
      })}
    </Stack>
  );
}
