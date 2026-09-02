import { Checkbox, Content, FormGroup } from "@patternfly/react-core";

import type { RepositorySigningPolicy } from "../../../api/client/pulpitCore/types";

/**
 * The repository create/edit form's "Signing" section (task section 10).
 * Renders nothing at all if pulpit-core is unreachable or nothing is
 * enabled globally - failing closed here (unlike AppNav's fail-open
 * capability gating) because there's no safe default signing
 * service/fingerprint to fall back to; a hidden section is a much better
 * outcome than a checkbox nothing backs.
 */
export function RepositorySigningFieldGroup({
  policy,
  idPrefix,
  signPackages,
  onSignPackagesChange,
  signMetadata,
  onSignMetadataChange,
}: {
  policy: RepositorySigningPolicy | undefined;
  idPrefix: string;
  signPackages: boolean;
  onSignPackagesChange: (checked: boolean) => void;
  signMetadata: boolean;
  onSignMetadataChange: (checked: boolean) => void;
}) {
  if (!policy || (!policy.package_signing_enabled && !policy.metadata_signing_enabled)) {
    return null;
  }

  return (
    <FormGroup label="Signing" fieldId={`${idPrefix}-signing`}>
      <Content component="small">
        Uses the current global signing key - see Administration → Repository Signing.
      </Content>
      {policy.package_signing_enabled ? (
        <Checkbox
          id={`${idPrefix}-sign-packages`}
          label="Sign packages"
          isChecked={signPackages}
          onChange={(_event, checked) => onSignPackagesChange(checked)}
        />
      ) : null}
      {policy.metadata_signing_enabled ? (
        <Checkbox
          id={`${idPrefix}-sign-metadata`}
          label="Sign repository metadata"
          isChecked={signMetadata}
          onChange={(_event, checked) => onSignMetadataChange(checked)}
        />
      ) : null}
    </FormGroup>
  );
}
