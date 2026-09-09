import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
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
import type { SigningSettings } from "../../../api/client/pulpitCore/types";
import { useSigningSettingsQuery } from "./useSigningSettingsQuery";
import { useUpdateSigningSettingsMutation } from "./useUpdateSigningSettingsMutation";
import { ApplySigningToAllRepositoriesModal } from "./ApplySigningToAllRepositoriesModal";

/** Just the two settings that matter every time, not just at key-generation
 * time: whether signing is on at all, and where the public key is served.
 * Everything that only matters the moment you're about to generate a key -
 * identity/algorithm defaults, automatic rotation - lives in the Generate
 * key dialog instead (GenerateKeyModal.tsx), not duplicated here. */
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

  return (
    <RepositorySigningGeneralForm
      settings={settingsQuery.data}
      isSaveError={updateSettings.isError}
      onChange={(changes) => updateSettings.mutate(changes)}
    />
  );
}

function RepositorySigningGeneralForm({
  settings,
  isSaveError,
  onChange,
}: {
  settings: SigningSettings;
  isSaveError: boolean;
  onChange: (changes: Partial<SigningSettings>) => void;
}) {
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  // A local buffer, not `settings.public_key_filename` directly - binding straight to
  // query data snapped the field back to the pre-keystroke value mid-typing while the
  // save mutation was still in flight.
  const [publicKeyFilename, setPublicKeyFilename] = useState(
    settings.public_key_filename,
  );
  const publicKeyUrl = `${window.location.origin}/keys/${publicKeyFilename}`;

  return (
    <Stack hasGutter>
      {isSaveError ? (
        <StackItem>
          <Alert variant="danger" isInline title="Could not save signing configuration" />
        </StackItem>
      ) : null}

      <StackItem>
        <Card isCompact>
          <CardTitle>Signing</CardTitle>
          <CardBody>
            <Form>
              <Checkbox
                id="signing-enabled"
                label="Signing enabled"
                isChecked={settings.signing_enabled}
                onChange={(_e, checked) => onChange({ signing_enabled: checked })}
              />
              <Checkbox
                id="package-signing-enabled"
                label="Package signing enabled"
                isChecked={settings.package_signing_enabled}
                onChange={(_e, checked) => onChange({ package_signing_enabled: checked })}
              />
              <Checkbox
                id="metadata-signing-enabled"
                label="Metadata signing enabled"
                isChecked={settings.metadata_signing_enabled}
                onChange={(_e, checked) =>
                  onChange({ metadata_signing_enabled: checked })
                }
              />
            </Form>
          </CardBody>
        </Card>
      </StackItem>

      <StackItem>
        <Card isCompact>
          <CardTitle>Public key</CardTitle>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <Form>
                  <FormGroup label="Filename" fieldId="public-key-filename">
                    <TextInput
                      id="public-key-filename"
                      type="text"
                      autoComplete="off"
                      value={publicKeyFilename}
                      onChange={(_e, value) => {
                        setPublicKeyFilename(value);
                        onChange({ public_key_filename: value });
                      }}
                    />
                  </FormGroup>
                </Form>
              </StackItem>

              <StackItem>
                <Content component="small" style={{ margin: 0 }}>
                  Full URL where the public signing key is served.
                </Content>
                <code style={{ overflowWrap: "anywhere" }}>{publicKeyUrl}</code>
              </StackItem>
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      <StackItem>
        <Card isCompact>
          <CardTitle>Existing repositories</CardTitle>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <Content component="small">
                  Signing above applies automatically to every repository from now on -
                  new repositories need no per-repository choice. A repository created
                  before signing was turned on doesn't otherwise catch up on its own; use
                  this to bring every existing repository into line now.
                </Content>
              </StackItem>
              <StackItem>
                <Button variant="danger" onClick={() => setIsApplyOpen(true)}>
                  Sign all repositories…
                </Button>
              </StackItem>
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      {isApplyOpen ? (
        <ApplySigningToAllRepositoriesModal onClose={() => setIsApplyOpen(false)} />
      ) : null}
    </Stack>
  );
}
