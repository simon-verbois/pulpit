import { useState } from "react";
import {
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  TextInput,
} from "@patternfly/react-core";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { useSigningSettingsQuery } from "./useSigningSettingsQuery";
import { useUpdateSigningSettingsMutation } from "./useUpdateSigningSettingsMutation";
import type { SigningSettings } from "../../../api/client/pulpitCore/types";

const ALGORITHMS = ["rsa2048", "rsa3072", "rsa4096", "ed25519"];

/** Shared by the General section and the Generate key dialog - both edit the
 * same global defaults, live-saved on every change like the rest of this
 * page (docs/signing.md: identity/algorithm/filename live on signing_settings,
 * read at generation time - see generate_key_job). The dialog can be open
 * over the page at the same time, so `idPrefix` keeps the two copies' field
 * ids from colliding. */
export function SigningKeyDefaultsFields({ idPrefix }: { idPrefix: string }) {
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
    <SigningKeyDefaultsFieldsForm
      idPrefix={idPrefix}
      settings={settingsQuery.data}
      onChange={(changes) => updateSettings.mutate(changes)}
    />
  );
}

function SigningKeyDefaultsFieldsForm({
  idPrefix,
  settings,
  onChange,
}: {
  idPrefix: string;
  settings: SigningSettings;
  onChange: (changes: Partial<SigningSettings>) => void;
}) {
  // Each field keeps its OWN local buffer instead of rendering `settings.*`
  // directly - VERIFIED live: a text input bound straight to query data,
  // saved on every keystroke, snaps back to the pre-keystroke value the
  // instant it's typed (the mutation's round trip hasn't resolved yet, so
  // the `value` prop briefly hasn't changed) - the cursor then lands at the
  // end of that reverted string, and every next character types onto the
  // wrong position. Only ever re-initialized from `settings` on mount
  // (`useState`'s lazy-initial-value semantics - a later change to
  // `settings` from elsewhere, e.g. another tab, is intentionally NOT
  // resynced here, same tradeoff as any locally-buffered live-saved field).
  const [keyName, setKeyName] = useState(settings.key_name);
  const [identityName, setIdentityName] = useState(settings.identity_name);
  const [identityEmail, setIdentityEmail] = useState(settings.identity_email);
  const [publicKeyFilename, setPublicKeyFilename] = useState(settings.public_key_filename);
  const [rpmServiceName, setRpmServiceName] = useState(settings.rpm_signing_service_name);
  const [metadataServiceName, setMetadataServiceName] = useState(
    settings.metadata_signing_service_name,
  );

  return (
    <Grid hasGutter>
      <GridItem span={6}>
        <FormGroup label="Key name" fieldId={`${idPrefix}key-name`}>
          <TextInput
            id={`${idPrefix}key-name`}
            type="text"
            autoComplete="off"
            value={keyName}
            onChange={(_e, value) => {
              setKeyName(value);
              onChange({ key_name: value });
            }}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                A display label used only within PulpIT; it is not embedded in the GPG
                key.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </GridItem>
      <GridItem span={6}>
        <FormGroup label="Identity (GPG UID name)" fieldId={`${idPrefix}identity-name`}>
          <TextInput
            id={`${idPrefix}identity-name`}
            type="text"
            autoComplete="off"
            value={identityName}
            onChange={(_e, value) => {
              setIdentityName(value);
              onChange({ identity_name: value });
            }}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Embedded in the GPG key's UID and visible to anyone who imports the public
                key.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </GridItem>
      <GridItem span={6}>
        <FormGroup label="Email (optional)" fieldId={`${idPrefix}identity-contact`}>
          <TextInput
            id={`${idPrefix}identity-contact`}
            type="text"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-protonpass-ignore="true"
            data-form-type="other"
            value={identityEmail}
            onChange={(_e, value) => {
              setIdentityEmail(value);
              onChange({ identity_email: value });
            }}
          />
        </FormGroup>
      </GridItem>
      <GridItem span={6}>
        <FormGroup label="Algorithm" fieldId={`${idPrefix}algorithm`}>
          <FormSelect
            id={`${idPrefix}algorithm`}
            value={settings.algorithm}
            onChange={(_e, value) => onChange({ algorithm: value })}
          >
            {ALGORITHMS.map((algo) => (
              <FormSelectOption key={algo} value={algo} label={algo.toUpperCase()} />
            ))}
          </FormSelect>
        </FormGroup>
      </GridItem>
      <GridItem span={6}>
        <FormGroup label="Public key filename" fieldId={`${idPrefix}public-key-filename`}>
          <TextInput
            id={`${idPrefix}public-key-filename`}
            type="text"
            autoComplete="off"
            value={publicKeyFilename}
            onChange={(_e, value) => {
              setPublicKeyFilename(value);
              onChange({ public_key_filename: value });
            }}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Served at <code>/keys/&lt;this&gt;</code>. The URL stays the same
                regardless of which key is currently active.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </GridItem>
      <GridItem span={6}>
        <FormGroup
          label="RPM signing service name"
          fieldId={`${idPrefix}rpm-service-name`}
        >
          <TextInput
            id={`${idPrefix}rpm-service-name`}
            type="text"
            autoComplete="off"
            value={rpmServiceName}
            onChange={(_e, value) => {
              setRpmServiceName(value);
              onChange({ rpm_signing_service_name: value });
            }}
          />
        </FormGroup>
      </GridItem>
      <GridItem span={6}>
        <FormGroup
          label="Metadata signing service name"
          fieldId={`${idPrefix}metadata-service-name`}
        >
          <TextInput
            id={`${idPrefix}metadata-service-name`}
            type="text"
            autoComplete="off"
            value={metadataServiceName}
            onChange={(_e, value) => {
              setMetadataServiceName(value);
              onChange({ metadata_signing_service_name: value });
            }}
          />
        </FormGroup>
      </GridItem>
    </Grid>
  );
}
