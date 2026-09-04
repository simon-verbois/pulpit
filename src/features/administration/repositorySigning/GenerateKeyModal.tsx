import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Content,
  Divider,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useGenerateSigningKeyMutation } from "./useGenerateSigningKeyMutation";
import { useJob } from "../../../api/client/pulpitCore/useJob";
import { useSigningSettingsQuery } from "./useSigningSettingsQuery";
import { useUpdateSigningSettingsMutation } from "./useUpdateSigningSettingsMutation";
import { SigningKeyDefaultsFields } from "./SigningKeyDefaultsFields";

const VALIDITY_PRESETS = [
  { value: "182", label: "6 months" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years (recommended)" },
  { value: "1095", label: "3 years" },
  { value: "1825", label: "5 years" },
  { value: "custom", label: "Custom..." },
  { value: "none", label: "No expiration" },
];

export function GenerateKeyModal({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState("730");
  const [customDays, setCustomDays] = useState(730);
  const settingsQuery = useSigningSettingsQuery();
  const updateSettings = useUpdateSigningSettingsMutation();
  const generateMutation = useGenerateSigningKeyMutation();
  const job = useJob(generateMutation.data?.id);

  const jobFailed = job.data?.status === "failed";
  const jobSucceeded = job.data?.status === "success";
  const settings = settingsQuery.data;
  const allowIndefiniteValidity = settings?.allow_indefinite_validity ?? false;

  const handleGenerate = () => {
    if (preset === "none") {
      generateMutation.mutate({ no_expiration: true });
    } else if (preset === "custom") {
      generateMutation.mutate({ validity_days: customDays });
    } else {
      generateMutation.mutate({ validity_days: Number(preset) });
    }
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="generate-key-title" variant="large">
      <ModalHeader title="Generate signing key" labelId="generate-key-title" />
      <ModalBody>
        <Stack hasGutter>
          {generateMutation.isError ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title={
                  generateMutation.error instanceof PulpApiError
                    ? generateMutation.error.message
                    : "Could not queue key generation."
                }
              />
            </StackItem>
          ) : null}
          {jobFailed ? (
            <StackItem>
              <Alert variant="danger" isInline title="Key generation failed">
                {job.data?.error}
              </Alert>
            </StackItem>
          ) : null}
          {jobSucceeded ? (
            <StackItem>
              <Alert variant="success" isInline title="Key generated" />
            </StackItem>
          ) : null}

          <StackItem>
            <Form>
              <FormGroup label="Validity" isRequired fieldId="generate-key-validity">
                <FormSelect
                  id="generate-key-validity"
                  value={preset}
                  isDisabled={generateMutation.isPending || job.isFetching}
                  onChange={(_event, value) => setPreset(value)}
                >
                  {VALIDITY_PRESETS.filter(
                    (option) => option.value !== "none" || allowIndefiniteValidity,
                  ).map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={option.value}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {preset === "none"
                        ? "A key with no expiration cannot be rotated automatically on a schedule."
                        : "The new key is generated as NEXT and published automatically once ready."}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>

              {preset === "custom" ? (
                <FormGroup
                  label="Validity (days)"
                  isRequired
                  fieldId="generate-key-custom-days"
                >
                  <NumberInput
                    id="generate-key-custom-days"
                    value={customDays}
                    min={1}
                    max={3650}
                    onMinus={() => setCustomDays((v) => Math.max(1, v - 1))}
                    onPlus={() => setCustomDays((v) => Math.min(3650, v + 1))}
                    onChange={(event) =>
                      setCustomDays(Number((event.target as HTMLInputElement).value))
                    }
                  />
                </FormGroup>
              ) : null}
            </Form>
          </StackItem>

          {settings ? (
            <>
              <StackItem>
                <Divider />
              </StackItem>

              <StackItem>
                <Stack hasGutter>
                  <StackItem>
                    <Content component="h3">New key defaults</Content>
                    <Content component="small">
                      Used to generate this key, and every key after it until changed.
                      Changing them does not affect existing keys.
                    </Content>
                  </StackItem>
                  <StackItem>
                    <Form>
                      <SigningKeyDefaultsFields idPrefix="generate-key-" />
                    </Form>
                  </StackItem>
                </Stack>
              </StackItem>

              <StackItem>
                <Divider />
              </StackItem>

              <StackItem>
                <Stack hasGutter>
                  {updateSettings.isError ? (
                    <StackItem>
                      <Alert
                        variant="danger"
                        isInline
                        title="Could not save signing configuration"
                      />
                    </StackItem>
                  ) : null}
                  <StackItem>
                    <Content component="h3">Automatic rotation</Content>
                    <Content component="small">
                      Publishing a key, whether automatically or manually via{" "}
                      <strong>Publish now</strong> in the signing keys table, re-signs
                      existing packages and republishes metadata under the new key. This
                      happens automatically and cannot be turned off. Exactly one key is
                      exposed at the public key URL at any time.
                    </Content>
                  </StackItem>
                  <StackItem>
                    <Stack hasGutter>
                      <StackItem>
                        <Stack style={{ gap: "0.25rem" }}>
                          <StackItem>
                            <Form>
                              <Checkbox
                                id="allow-indefinite-validity"
                                label="Create keys without expiration"
                                isChecked={settings.allow_indefinite_validity}
                                onChange={(_e, checked) =>
                                  updateSettings.mutate({
                                    allow_indefinite_validity: checked,
                                  })
                                }
                              />
                            </Form>
                          </StackItem>
                          <StackItem>
                            <Content component="small" style={{ margin: 0 }}>
                              Allows generating a key with no expiration date using the{" "}
                              <strong>Validity</strong> field above. Because such a key
                              cannot be rotated on a schedule, the settings below are
                              disabled while this option is enabled.
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
                            onChange={(_e, checked) =>
                              updateSettings.mutate({ auto_rotation_enabled: checked })
                            }
                          />
                        </Form>
                      </StackItem>
                    </Stack>
                  </StackItem>
                  <StackItem>
                    <Grid hasGutter>
                      <GridItem span={3}>
                        <FormGroup label="Default key validity" fieldId="validity-days">
                          <NumberInput
                            id="validity-days"
                            isDisabled={
                              !settings.auto_rotation_enabled ||
                              settings.allow_indefinite_validity
                            }
                            value={settings.validity_days}
                            min={1}
                            max={3650}
                            onMinus={() =>
                              updateSettings.mutate({
                                validity_days: Math.max(1, settings.validity_days - 1),
                              })
                            }
                            onPlus={() =>
                              updateSettings.mutate({
                                validity_days: Math.min(3650, settings.validity_days + 1),
                              })
                            }
                            onChange={(event) =>
                              updateSettings.mutate({
                                validity_days: Number(
                                  (event.target as HTMLInputElement).value,
                                ),
                              })
                            }
                          />
                          <FormHelperText>
                            <HelperText>
                              <HelperTextItem>
                                Days. For future keys - not the one above.
                              </HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        </FormGroup>
                      </GridItem>
                      <GridItem span={3}>
                        <FormGroup label="Generate replacement" fieldId="generate-before">
                          <NumberInput
                            id="generate-before"
                            isDisabled={
                              !settings.auto_rotation_enabled ||
                              settings.allow_indefinite_validity
                            }
                            value={settings.rotation_generate_before_days}
                            min={1}
                            max={3650}
                            onMinus={() =>
                              updateSettings.mutate({
                                rotation_generate_before_days: Math.max(
                                  1,
                                  settings.rotation_generate_before_days - 1,
                                ),
                              })
                            }
                            onPlus={() =>
                              updateSettings.mutate({
                                rotation_generate_before_days:
                                  settings.rotation_generate_before_days + 1,
                              })
                            }
                            onChange={(event) =>
                              updateSettings.mutate({
                                rotation_generate_before_days: Number(
                                  (event.target as HTMLInputElement).value,
                                ),
                              })
                            }
                          />
                          <FormHelperText>
                            <HelperText>
                              <HelperTextItem>Days before expiry.</HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        </FormGroup>
                      </GridItem>
                      <GridItem span={3}>
                        <FormGroup label="Publish replacement" fieldId="activate-before">
                          <NumberInput
                            id="activate-before"
                            isDisabled={
                              !settings.auto_rotation_enabled ||
                              settings.allow_indefinite_validity
                            }
                            value={settings.rotation_activate_before_days}
                            min={1}
                            max={3650}
                            onMinus={() =>
                              updateSettings.mutate({
                                rotation_activate_before_days: Math.max(
                                  1,
                                  settings.rotation_activate_before_days - 1,
                                ),
                              })
                            }
                            onPlus={() =>
                              updateSettings.mutate({
                                rotation_activate_before_days:
                                  settings.rotation_activate_before_days + 1,
                              })
                            }
                            onChange={(event) =>
                              updateSettings.mutate({
                                rotation_activate_before_days: Number(
                                  (event.target as HTMLInputElement).value,
                                ),
                              })
                            }
                          />
                          <FormHelperText>
                            <HelperText>
                              <HelperTextItem>Days before expiry.</HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        </FormGroup>
                      </GridItem>
                      <GridItem span={3}>
                        <FormGroup label="Old public key retention" fieldId="retention-days">
                          <NumberInput
                            id="retention-days"
                            value={settings.key_retention_days}
                            min={0}
                            max={3650}
                            onMinus={() =>
                              updateSettings.mutate({
                                key_retention_days: Math.max(
                                  0,
                                  settings.key_retention_days - 1,
                                ),
                              })
                            }
                            onPlus={() =>
                              updateSettings.mutate({
                                key_retention_days: settings.key_retention_days + 1,
                              })
                            }
                            onChange={(event) =>
                              updateSettings.mutate({
                                key_retention_days: Number(
                                  (event.target as HTMLInputElement).value,
                                ),
                              })
                            }
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
              </StackItem>
            </>
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
          <FlexItem>
            <Button
              variant="primary"
              isDisabled={generateMutation.isPending || jobSucceeded}
              isLoading={
                generateMutation.isPending ||
                job.data?.status === "queued" ||
                job.data?.status === "running"
              }
              onClick={handleGenerate}
            >
              Generate
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
