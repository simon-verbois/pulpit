import { useState } from "react";
import {
  Checkbox,
  ExpandableSection,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from "@patternfly/react-core";

/** Standard pulpcore Remote connection fields - not specific to any one
 * plugin, hence living in src/components rather than a feature folder (see
 * AGENTS.md #16: promote out of a feature only once genuinely reused - this
 * is used by both RPM and Ansible remotes). */
export interface RemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
}

export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

function hiddenFieldHint(fields: HiddenRemoteField[] | undefined, name: string) {
  if (!fields?.find((f) => f.name === name)?.is_set) {
    return undefined;
  }
  return "Currently set - leave blank to keep it, or type a new value to replace it.";
}

interface RemoteConnectionSettingsFieldsProps {
  idPrefix: string;
  value: RemoteConnectionSettings;
  onChange: (next: RemoteConnectionSettings) => void;
  /** Only present when editing an existing remote - GET never echoes back
   * proxy/origin credentials (VERIFIED live), only whether one is set. */
  hiddenFields?: HiddenRemoteField[];
}

/** Shared by every plugin's Create/Edit remote modal - proxy/origin auth
 * settings. Collapsed by default since most remotes don't need them. */
export function RemoteConnectionSettingsFields({
  idPrefix,
  value,
  onChange,
  hiddenFields,
}: RemoteConnectionSettingsFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <ExpandableSection
      toggleText={
        isExpanded ? "Hide advanced connection settings" : "Advanced connection settings"
      }
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
    >
      <FormGroup label="Proxy URL" fieldId={`${idPrefix}-proxy-url`}>
        <TextInput
          id={`${idPrefix}-proxy-url`}
          placeholder="http://proxy.example.com:3128"
          value={value.proxy_url ?? ""}
          onChange={(_event, v) => onChange({ ...value, proxy_url: v })}
        />
      </FormGroup>
      <FormGroup label="Proxy username" fieldId={`${idPrefix}-proxy-username`}>
        <TextInput
          id={`${idPrefix}-proxy-username`}
          value={value.proxy_username ?? ""}
          onChange={(_event, v) => onChange({ ...value, proxy_username: v })}
        />
        {hiddenFieldHint(hiddenFields, "proxy_username") ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {hiddenFieldHint(hiddenFields, "proxy_username")}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>
      <FormGroup label="Proxy password" fieldId={`${idPrefix}-proxy-password`}>
        <TextInput
          id={`${idPrefix}-proxy-password`}
          type="password"
          value={value.proxy_password ?? ""}
          onChange={(_event, v) => onChange({ ...value, proxy_password: v })}
        />
        {hiddenFieldHint(hiddenFields, "proxy_password") ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {hiddenFieldHint(hiddenFields, "proxy_password")}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>
      <FormGroup label="Origin server username" fieldId={`${idPrefix}-username`}>
        <TextInput
          id={`${idPrefix}-username`}
          value={value.username ?? ""}
          onChange={(_event, v) => onChange({ ...value, username: v })}
        />
        {hiddenFieldHint(hiddenFields, "username") ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{hiddenFieldHint(hiddenFields, "username")}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>
      <FormGroup label="Origin server password" fieldId={`${idPrefix}-password`}>
        <TextInput
          id={`${idPrefix}-password`}
          type="password"
          value={value.password ?? ""}
          onChange={(_event, v) => onChange({ ...value, password: v })}
        />
        {hiddenFieldHint(hiddenFields, "password") ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{hiddenFieldHint(hiddenFields, "password")}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>
      <FormGroup fieldId={`${idPrefix}-tls-validation`}>
        <Checkbox
          id={`${idPrefix}-tls-validation`}
          label="Validate TLS certificates"
          isChecked={value.tls_validation ?? true}
          onChange={(_event, checked) => onChange({ ...value, tls_validation: checked })}
        />
      </FormGroup>
    </ExpandableSection>
  );
}
