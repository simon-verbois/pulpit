import { Checkbox, FormGroup } from "@patternfly/react-core";

export function RemoteTlsSettingsFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: boolean | undefined;
  onChange: (validate: boolean) => void;
}) {
  return (
    <FormGroup fieldId={`${idPrefix}-ignore-ssl-errors`}>
      <Checkbox
        id={`${idPrefix}-ignore-ssl-errors`}
        label="Ignore SSL certificate errors"
        description="Disable certificate and hostname checks for this remote's HTTPS connections. Otherwise, use the global TLS policy."
        isChecked={value === false}
        onChange={(_, ignore) => onChange(!ignore)}
      />
    </FormGroup>
  );
}
