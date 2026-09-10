import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Checkbox,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { BasePathField } from "../../../components/BasePathField";
import { useContentOrigin } from "../../../hooks/useContentOrigin";
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
      isSaving={updateSettings.isPending}
      onChange={(changes) => updateSettings.mutate(changes)}
    />
  );
}

function RepositorySigningGeneralForm({
  settings,
  isSaveError,
  isSaving,
  onChange,
}: {
  settings: SigningSettings;
  isSaveError: boolean;
  isSaving: boolean;
  onChange: (changes: Partial<SigningSettings>) => void;
}) {
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  // A local buffer, not `settings.public_key_filename` directly - binding straight to
  // query data snapped the field back to the pre-keystroke value mid-typing while the
  // save mutation was still in flight. Now also what makes the Save button below
  // possible at all: typing no longer saves on every keystroke (a stray character was
  // otherwise live the moment it was typed) - only clicking Save commits it.
  const [publicKeyFilename, setPublicKeyFilename] = useState(
    settings.public_key_filename,
  );
  const contentOrigin = useContentOrigin();
  const isFilenameDirty = publicKeyFilename !== settings.public_key_filename;

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
            <Form>
              <FormGroup label="Filename" fieldId="public-key-filename">
                <Flex alignItems={{ default: "alignItemsFlexStart" }}>
                  <FlexItem grow={{ default: "grow" }}>
                    <BasePathField
                      id="public-key-filename"
                      prefix={`${contentOrigin}/keys/`}
                      value={publicKeyFilename}
                      onChange={setPublicKeyFilename}
                    />
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="secondary"
                      isDisabled={!isFilenameDirty || !publicKeyFilename}
                      isLoading={isFilenameDirty && isSaving}
                      onClick={() =>
                        onChange({ public_key_filename: publicKeyFilename })
                      }
                    >
                      Save
                    </Button>
                  </FlexItem>
                </Flex>
              </FormGroup>
            </Form>
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
