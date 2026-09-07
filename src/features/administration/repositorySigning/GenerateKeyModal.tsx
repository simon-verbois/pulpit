import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Content,
  Divider,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
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
import { SigningKeyDefaultsFields } from "./SigningKeyDefaultsFields";
import { AutomaticRotationFields } from "./AutomaticRotationFields";

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
  const generateMutation = useGenerateSigningKeyMutation();
  const job = useJob(generateMutation.data?.id);

  const jobFailed = job.data?.status === "failed";
  const jobSucceeded = job.data?.status === "success";
  const settings = settingsQuery.data;
  const allowIndefiniteValidity = settings?.allow_indefinite_validity ?? false;

  // The new key already shows up in the keys list behind this modal (the
  // mutation invalidates it on success) - nothing more to show here once
  // generation succeeds, so close automatically instead of waiting on the
  // user to click "Close" themselves. Left open on failure so the error
  // stays visible.
  useEffect(() => {
    if (jobSucceeded) {
      onClose();
    }
  }, [jobSucceeded, onClose]);

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
    <Modal isOpen onClose={onClose} aria-labelledby="generate-key-title" variant="medium">
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

          <StackItem>
            <Divider />
          </StackItem>

          <StackItem>
            <Content component="h3">New key defaults</Content>
            <Content component="small">
              Used the next time a key is generated, and every key after it until changed.
              Changing them does not affect existing keys.
            </Content>
          </StackItem>
          <StackItem>
            <Form>
              <SigningKeyDefaultsFields idPrefix="generate-" />
            </Form>
          </StackItem>

          <StackItem>
            <Divider />
          </StackItem>

          <StackItem>
            <Content component="h3">Automatic rotation</Content>
          </StackItem>
          <StackItem>
            <AutomaticRotationFields />
          </StackItem>
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
