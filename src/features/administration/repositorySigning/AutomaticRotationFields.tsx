import { useState } from "react";
import {
  Checkbox,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  NumberInput,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import type { SigningSettings } from "../../../api/client/pulpitCore/types";
import { useSigningSettingsQuery } from "./useSigningSettingsQuery";
import { useUpdateSigningSettingsMutation } from "./useUpdateSigningSettingsMutation";

/** Lives in the Generate key dialog, not the General section - these are
 * still global defaults (they govern every future key, not just the one
 * about to be generated), but only matter at the moment you're about to
 * generate one, same rationale as SigningKeyDefaultsFields.tsx next to it. */
export function AutomaticRotationFields() {
  const settingsQuery = useSigningSettingsQuery();
  const updateSettings = useUpdateSigningSettingsMutation();

  if (settingsQuery.isPending) {
    return <LoadingState label="Loading signing configuration" />;
  }
  if (settingsQuery.isError) {
    return (
      <ErrorState error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} />
    );
  }

  return (
    <AutomaticRotationFieldsForm
      settings={settingsQuery.data}
      onChange={(changes) => updateSettings.mutate(changes)}
    />
  );
}

function AutomaticRotationFieldsForm({
  settings,
  onChange,
}: {
  settings: SigningSettings;
  onChange: (changes: Partial<SigningSettings>) => void;
}) {
  const rotationDisabled =
    !settings.auto_rotation_enabled || settings.allow_indefinite_validity;

  // Each number field keeps its OWN local buffer instead of rendering
  // `settings.*` directly - VERIFIED live: bound straight to query data and
  // saved on every change, the field snapped back to the pre-edit value the
  // instant it was typed (the mutation's round trip hadn't resolved yet) -
  // same fix as SigningKeyDefaultsFields.tsx's text inputs.
  const [validityDays, setValidityDays] = useState(settings.validity_days);
  const [generateBeforeDays, setGenerateBeforeDays] = useState(
    settings.rotation_generate_before_days,
  );
  const [activateBeforeDays, setActivateBeforeDays] = useState(
    settings.rotation_activate_before_days,
  );
  const [retentionDays, setRetentionDays] = useState(settings.key_retention_days);

  return (
    <Stack hasGutter>
      <StackItem>
        <Content component="small">
          Publishing a key, whether automatically or manually via{" "}
          <strong>Publish now</strong> in the signing keys table, re-signs existing
          packages and republishes metadata under the new key. This happens automatically
          and cannot be turned off. Exactly one key is exposed at the public key URL at
          any time.
        </Content>
      </StackItem>

      <StackItem>
        <Stack style={{ gap: "0.25rem" }}>
          <StackItem>
            <Form>
              <Checkbox
                id="allow-indefinite-validity"
                label="Create keys without expiration"
                isChecked={settings.allow_indefinite_validity}
                onChange={(_e, checked) =>
                  onChange({ allow_indefinite_validity: checked })
                }
              />
            </Form>
          </StackItem>
          <StackItem>
            <Content component="small" style={{ margin: 0 }}>
              Allows generating a key with no expiration date above. Because such a key
              cannot be rotated on a schedule, the settings below are disabled while this
              option is enabled.
            </Content>
          </StackItem>
        </Stack>
      </StackItem>

      <StackItem>
        <Form>
          <Checkbox
            id="auto-rotation-enabled"
            label="Automatic key rotation enabled"
            isChecked={settings.auto_rotation_enabled}
            isDisabled={settings.allow_indefinite_validity}
            onChange={(_e, checked) => onChange({ auto_rotation_enabled: checked })}
          />
        </Form>
      </StackItem>

      <StackItem>
        <Grid hasGutter>
          <GridItem span={12} md={6}>
            <FormGroup label="Default key validity" fieldId="validity-days">
              <NumberInput
                id="validity-days"
                isDisabled={rotationDisabled}
                value={validityDays}
                min={1}
                max={3650}
                onMinus={() => {
                  const next = Math.max(1, validityDays - 1);
                  setValidityDays(next);
                  onChange({ validity_days: next });
                }}
                onPlus={() => {
                  const next = Math.min(3650, validityDays + 1);
                  setValidityDays(next);
                  onChange({ validity_days: next });
                }}
                onChange={(event) => {
                  const next = Number((event.target as HTMLInputElement).value);
                  setValidityDays(next);
                  onChange({ validity_days: next });
                }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Days. For future keys - not the one active now.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </GridItem>
          <GridItem span={12} md={6}>
            <FormGroup label="Generate replacement" fieldId="generate-before">
              <NumberInput
                id="generate-before"
                isDisabled={rotationDisabled}
                value={generateBeforeDays}
                min={1}
                max={3650}
                onMinus={() => {
                  const next = Math.max(1, generateBeforeDays - 1);
                  setGenerateBeforeDays(next);
                  onChange({ rotation_generate_before_days: next });
                }}
                onPlus={() => {
                  const next = generateBeforeDays + 1;
                  setGenerateBeforeDays(next);
                  onChange({ rotation_generate_before_days: next });
                }}
                onChange={(event) => {
                  const next = Number((event.target as HTMLInputElement).value);
                  setGenerateBeforeDays(next);
                  onChange({ rotation_generate_before_days: next });
                }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Days before expiry.</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </GridItem>
          <GridItem span={12} md={6}>
            <FormGroup label="Publish replacement" fieldId="activate-before">
              <NumberInput
                id="activate-before"
                isDisabled={rotationDisabled}
                value={activateBeforeDays}
                min={1}
                max={3650}
                onMinus={() => {
                  const next = Math.max(1, activateBeforeDays - 1);
                  setActivateBeforeDays(next);
                  onChange({ rotation_activate_before_days: next });
                }}
                onPlus={() => {
                  const next = activateBeforeDays + 1;
                  setActivateBeforeDays(next);
                  onChange({ rotation_activate_before_days: next });
                }}
                onChange={(event) => {
                  const next = Number((event.target as HTMLInputElement).value);
                  setActivateBeforeDays(next);
                  onChange({ rotation_activate_before_days: next });
                }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Days before expiry.</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </GridItem>
          <GridItem span={12} md={6}>
            <FormGroup label="Old public key retention" fieldId="retention-days">
              <NumberInput
                id="retention-days"
                value={retentionDays}
                min={0}
                max={3650}
                onMinus={() => {
                  const next = Math.max(0, retentionDays - 1);
                  setRetentionDays(next);
                  onChange({ key_retention_days: next });
                }}
                onPlus={() => {
                  const next = retentionDays + 1;
                  setRetentionDays(next);
                  onChange({ key_retention_days: next });
                }}
                onChange={(event) => {
                  const next = Number((event.target as HTMLInputElement).value);
                  setRetentionDays(next);
                  onChange({ key_retention_days: next });
                }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Days.</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </GridItem>
        </Grid>
      </StackItem>
    </Stack>
  );
}
