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

  const settings = settingsQuery.data;

  return (
    <Grid hasGutter>
      <GridItem span={6}>
        <FormGroup label="Key name" fieldId={`${idPrefix}key-name`}>
          <TextInput
            id={`${idPrefix}key-name`}
            type="text"
            autoComplete="off"
            value={settings.key_name}
            onChange={(_e, value) => updateSettings.mutate({ key_name: value })}
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
            value={settings.identity_name}
            onChange={(_e, value) => updateSettings.mutate({ identity_name: value })}
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
            value={settings.identity_email}
            onChange={(_e, value) => updateSettings.mutate({ identity_email: value })}
          />
        </FormGroup>
      </GridItem>
      <GridItem span={6}>
        <FormGroup label="Algorithm" fieldId={`${idPrefix}algorithm`}>
          <FormSelect
            id={`${idPrefix}algorithm`}
            value={settings.algorithm}
            onChange={(_e, value) => updateSettings.mutate({ algorithm: value })}
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
            value={settings.public_key_filename}
            onChange={(_e, value) =>
              updateSettings.mutate({ public_key_filename: value })
            }
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
            value={settings.rpm_signing_service_name}
            onChange={(_e, value) =>
              updateSettings.mutate({ rpm_signing_service_name: value })
            }
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
            value={settings.metadata_signing_service_name}
            onChange={(_e, value) =>
              updateSettings.mutate({ metadata_signing_service_name: value })
            }
          />
        </FormGroup>
      </GridItem>
    </Grid>
  );
}
