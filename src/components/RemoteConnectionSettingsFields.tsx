import { useState } from "react";
import {
  Content,
  ExpandableSection,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from "@patternfly/react-core";

export interface RemoteConnectionSettings {
  username?: string | null;
  password?: string | null;
}

export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

interface Props {
  idPrefix: string;
  value: RemoteConnectionSettings;
  onChange: (next: RemoteConnectionSettings) => void;
  hiddenFields?: HiddenRemoteField[];
}

export function RemoteConnectionSettingsFields({
  idPrefix,
  value,
  onChange,
  hiddenFields,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <ExpandableSection
      toggleText={
        isExpanded ? "Hide advanced connection settings" : "Advanced connection settings"
      }
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
    >
      <Content component="p">
        Outbound proxy, TLS validation and trusted CA certificates are managed centrally
        in Administration → Global Proxy Settings.
      </Content>
      {(["username", "password"] as const).map((field) => (
        <FormGroup
          key={field}
          label={`Origin server ${field}`}
          fieldId={`${idPrefix}-${field}`}
        >
          <TextInput
            id={`${idPrefix}-${field}`}
            type={field === "password" ? "password" : "text"}
            autoComplete={field === "password" ? "new-password" : "off"}
            value={value[field] ?? ""}
            onChange={(_event, text) => onChange({ ...value, [field]: text })}
          />
          {hiddenFields?.some((hidden) => hidden.name === field && hidden.is_set) ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Currently set - leave blank to keep it, or type a new value to replace
                  it.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
      ))}
    </ExpandableSection>
  );
}
