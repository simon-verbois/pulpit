import {
  Alert,
  Checkbox,
  Content,
  Form,
  FormGroup,
  Stack,
  StackItem,
  TextInput,
} from "@patternfly/react-core";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { useSigningSettingsQuery } from "./useSigningSettingsQuery";
import { useUpdateSigningSettingsMutation } from "./useUpdateSigningSettingsMutation";
import { CopyableValue } from "./CopyableValue";

export function RepositorySigningGeneralSection() {
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

  const settings = settingsQuery.data;
  const publicKeyUrl = `${window.location.origin}/keys/${settings.public_key_filename}`;

  return (
    <Stack hasGutter>
      <StackItem>
        <Content component="h2">General</Content>
      </StackItem>

      <StackItem>
        {updateSettings.isError ? (
          <Alert variant="danger" isInline title="Could not save signing configuration" />
        ) : null}
        <Form>
          <Checkbox
            id="signing-enabled"
            label="Signing enabled"
            isChecked={settings.signing_enabled}
            onChange={(_e, checked) =>
              updateSettings.mutate({ signing_enabled: checked })
            }
          />
          <Checkbox
            id="package-signing-enabled"
            label="Package signing enabled"
            isChecked={settings.package_signing_enabled}
            onChange={(_e, checked) =>
              updateSettings.mutate({ package_signing_enabled: checked })
            }
          />
          <Checkbox
            id="metadata-signing-enabled"
            label="Metadata signing enabled"
            isChecked={settings.metadata_signing_enabled}
            onChange={(_e, checked) =>
              updateSettings.mutate({ metadata_signing_enabled: checked })
            }
          />
        </Form>
      </StackItem>

      <StackItem>
        <Stack style={{ gap: "0.75rem" }}>
          <StackItem>
            <Stack style={{ gap: "0.25rem" }}>
              <StackItem>
                <Content component="small" style={{ margin: 0 }}>
                  The filename used in the public key URL below.
                </Content>
              </StackItem>
              <StackItem>
                <Form>
                  <FormGroup fieldId="public-key-filename">
                    <TextInput
                      id="public-key-filename"
                      aria-label="Public key filename"
                      type="text"
                      autoComplete="off"
                      value={settings.public_key_filename}
                      onChange={(_e, value) =>
                        updateSettings.mutate({ public_key_filename: value })
                      }
                    />
                  </FormGroup>
                </Form>
              </StackItem>
            </Stack>
          </StackItem>

          <StackItem>
            <Stack style={{ gap: "0.25rem" }}>
              <StackItem>
                <Content component="small" style={{ margin: 0 }}>
                  The full URL where the public signing key is served.
                </Content>
              </StackItem>
              <StackItem>
                <CopyableValue value={publicKeyUrl} />
              </StackItem>
            </Stack>
          </StackItem>
        </Stack>
      </StackItem>
    </Stack>
  );
}
