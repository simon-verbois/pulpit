import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Content,
  FormGroup,
  NumberInput,
  Switch,
} from "@patternfly/react-core";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import type { TaskRetentionSettings } from "../../../api/client/pulpitCore/types";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { PurgeTaskHistoryModal } from "./PurgeTaskHistoryModal";
import { useTaskRetentionSettingsQuery } from "./useTaskRetentionSettingsQuery";
import { useUpdateTaskRetentionSettingsMutation } from "./useUpdateTaskRetentionSettingsMutation";

const MIN_DAYS = 1;
const MAX_DAYS = 3650;

/** How long Pulp keeps its finished task history. Pulp never deletes tasks
 * itself, so this drives a daily purge job in pulpit-core (90 days by
 * default); the purged tasks are the audit trail, hence the explicit,
 * confirmed "Purge now" for anything beyond the schedule. */
export function TaskRetentionSection() {
  const settingsQuery = useTaskRetentionSettingsQuery();

  if (settingsQuery.isPending) {
    return <LoadingState label="Loading task retention settings" />;
  }
  if (settingsQuery.isError) {
    return (
      <ErrorState error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} />
    );
  }
  return <TaskRetentionForm settings={settingsQuery.data} />;
}

function TaskRetentionForm({ settings }: { settings: TaskRetentionSettings }) {
  const updateMutation = useUpdateTaskRetentionSettingsMutation();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [days, setDays] = useState(settings.retention_days);
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);

  const isDirty = enabled !== settings.enabled || days !== settings.retention_days;
  const clamp = (value: number) =>
    Math.min(MAX_DAYS, Math.max(MIN_DAYS, Number.isNaN(value) ? MIN_DAYS : value));

  return (
    <Card isFullHeight>
      <CardTitle>Task history</CardTitle>
      <CardBody>
        <Content component="p">
          Pulp keeps finished tasks forever, which slows the Tasks page down over time.
          Completed, failed, canceled and skipped tasks older than the retention period
          are deleted once a day. Deleted tasks cannot be recovered.
        </Content>
        {settings.last_run_error ? (
          <Alert
            variant="danger"
            isInline
            title="The last purge failed"
            style={{ marginBlockEnd: "1rem" }}
          >
            {settings.last_run_error}
          </Alert>
        ) : null}
        {updateMutation.isError ? (
          <Alert
            variant="danger"
            isInline
            style={{ marginBlockEnd: "1rem" }}
            title={
              updateMutation.error instanceof PulpApiError
                ? updateMutation.error.message
                : "Could not save the retention settings."
            }
          />
        ) : null}
        <Switch
          id="task-retention-enabled"
          label="Delete old tasks automatically"
          aria-label="Delete old tasks automatically"
          isChecked={enabled}
          onChange={(_event, checked) => setEnabled(checked)}
        />
        <FormGroup
          label="Keep tasks for"
          fieldId="task-retention-days"
          style={{ marginBlockStart: "1rem" }}
        >
          <NumberInput
            value={days}
            min={MIN_DAYS}
            max={MAX_DAYS}
            unit="days"
            isDisabled={!enabled}
            onMinus={() => setDays((current) => clamp(current - 1))}
            onPlus={() => setDays((current) => clamp(current + 1))}
            onChange={(event) => setDays(clamp(Number(event.currentTarget.value)))}
            inputName="task-retention-days"
            inputAriaLabel="Keep tasks for (days)"
            minusBtnAriaLabel="Decrease days"
            plusBtnAriaLabel="Increase days"
          />
        </FormGroup>
        <Content component="small" style={{ display: "block", marginBlockStart: "1rem" }}>
          {settings.last_run_at
            ? `Last purge ran ${formatRelativeTime(settings.last_run_at)}.`
            : "The purge has not run yet."}
        </Content>
      </CardBody>
      <CardFooter>
        <Button
          variant="secondary"
          isDisabled={!isDirty || updateMutation.isPending}
          isLoading={updateMutation.isPending}
          onClick={() => updateMutation.mutate({ enabled, retention_days: days })}
        >
          Save retention
        </Button>{" "}
        <Button
          variant="secondary"
          isDanger
          isDisabled={isDirty}
          onClick={() => setIsPurgeOpen(true)}
        >
          Purge now
        </Button>
      </CardFooter>
      {isPurgeOpen ? (
        <PurgeTaskHistoryModal
          retentionDays={settings.retention_days}
          onClose={() => setIsPurgeOpen(false)}
        />
      ) : null}
    </Card>
  );
}
