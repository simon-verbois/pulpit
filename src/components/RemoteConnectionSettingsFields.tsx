import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Checkbox,
  Content,
  ExpandableSection,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextArea,
  TextInput,
} from "@patternfly/react-core";

import { getDefaultProxyCredentials } from "../api/client/pulpitCore/defaultSettings";
import { useDefaultSettingsQuery } from "../features/administration/defaultSettings/useDefaultSettingsQuery";
import { defaultProxyCredentialsKey } from "../features/administration/defaultSettings/queryKeys";

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
  /** A PEM encoded CA certificate Pulp's own aiohttp downloader trusts IN
   * ADDITION to the system CA bundle (verified live in pulpcore's
   * DownloaderFactory) - shared by the origin server and the proxy
   * connection, same as tls_validation above, never two separate fields. */
  ca_cert?: string | null;
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
 * settings. Collapsed by default since most remotes don't need them, unless
 * an instance default proxy (Administration > Default Settings) auto-opens
 * it below. */
export function RemoteConnectionSettingsFields({
  idPrefix,
  value,
  onChange,
  hiddenFields,
}: RemoteConnectionSettingsFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Editing an existing remote is signaled by hiddenFields being present
  // (see its own doc comment) - a fresh Create modal never has one.
  const isEditing = hiddenFields !== undefined;

  const defaultSettingsQuery = useDefaultSettingsQuery();
  const hasDefaultProxy = Boolean(defaultSettingsQuery.data?.proxy_url);

  // Automatic for a brand-new remote (task: "the full automatic version"),
  // manual/override by default when editing one that may already have its
  // own deliberately-different proxy - never silently replaced just by
  // opening Edit.
  const [useInstanceDefault, setUseInstanceDefault] = useState(!isEditing);

  const proxyCredentialsQuery = useQuery({
    queryKey: defaultProxyCredentialsKey,
    queryFn: getDefaultProxyCredentials,
    enabled: hasDefaultProxy && useInstanceDefault,
  });

  // Applies the real (decrypted) default proxy into the parent's connection
  // settings once it's available - the only place the actual password value
  // exists, transiently, in this form's state; never rendered in a text
  // field (below, the manual fields are hidden entirely while this is on).
  // The equality check makes this idempotent instead of an infinite loop:
  // once `value` matches `proxyCredentialsQuery.data`, the effect is a
  // no-op even though `value`'s object identity still changes on every
  // parent re-render.
  useEffect(() => {
    if (
      !useInstanceDefault ||
      !proxyCredentialsQuery.data ||
      !defaultSettingsQuery.data
    ) {
      return;
    }
    const credentials = proxyCredentialsQuery.data;
    const resolvedPassword = credentials.proxy_password ?? "";
    const resolvedTlsValidation = defaultSettingsQuery.data.proxy_tls_validation;
    const resolvedCaCert = credentials.proxy_ca_cert ?? "";
    if (
      value.proxy_url === credentials.proxy_url &&
      value.proxy_username === credentials.proxy_username &&
      value.proxy_password === resolvedPassword &&
      value.tls_validation === resolvedTlsValidation &&
      (value.ca_cert ?? "") === resolvedCaCert
    ) {
      return;
    }
    onChange({
      ...value,
      proxy_url: credentials.proxy_url,
      proxy_username: credentials.proxy_username,
      proxy_password: resolvedPassword,
      // Pulp has one tls_validation flag per Remote, shared by the proxy
      // and the origin server - applying "the default proxy" necessarily
      // also applies its TLS preference, there is no narrower field to set
      // instead (DefaultSettings.proxy_tls_validation's own doc comment).
      tls_validation: resolvedTlsValidation,
      // Same reasoning as tls_validation above - one ca_cert per Remote,
      // shared by proxy and origin server.
      ca_cert: resolvedCaCert,
    });
  }, [
    useInstanceDefault,
    proxyCredentialsQuery.data,
    defaultSettingsQuery.data,
    value,
    onChange,
  ]);

  // Surfaces the automatic default rather than leaving it invisible inside
  // a collapsed section - only once, so manually collapsing it afterward
  // (e.g. once the user has seen it) sticks.
  const hasAutoExpandedRef = useRef(false);
  useEffect(() => {
    if (!isEditing && hasDefaultProxy && !hasAutoExpandedRef.current) {
      hasAutoExpandedRef.current = true;
      setIsExpanded(true);
    }
  }, [isEditing, hasDefaultProxy]);

  const queryClient = useQueryClient();
  const handleUseInstanceDefaultChange = (checked: boolean) => {
    setUseInstanceDefault(checked);
    if (!checked) {
      return;
    }
    // Ensures a fresh fetch even if the toggle was already flipped once
    // this session - a stale cached password would otherwise silently get
    // reapplied instead of whatever's actually configured right now.
    void queryClient.invalidateQueries({ queryKey: defaultProxyCredentialsKey });
  };

  return (
    <ExpandableSection
      toggleText={
        isExpanded ? "Hide advanced connection settings" : "Advanced connection settings"
      }
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
    >
      <Content component="h4" style={{ marginBlockStart: 0 }}>
        Proxy
      </Content>
      {hasDefaultProxy ? (
        <FormGroup fieldId={`${idPrefix}-use-instance-default-proxy`}>
          <Checkbox
            id={`${idPrefix}-use-instance-default-proxy`}
            label="Use the instance default proxy"
            isChecked={useInstanceDefault}
            onChange={(_event, checked) => handleUseInstanceDefaultChange(checked)}
          />
          {useInstanceDefault ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Configured in Administration &gt; Default Settings (
                  {defaultSettingsQuery.data?.proxy_url}), including its TLS validation
                  preference below. Uncheck to set a different proxy for this remote only.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
      ) : null}
      {hasDefaultProxy && useInstanceDefault ? null : (
        <>
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
              autoComplete="off"
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
              autoComplete="new-password"
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
        </>
      )}
      <FormGroup label="Origin server username" fieldId={`${idPrefix}-username`}>
        <TextInput
          id={`${idPrefix}-username`}
          autoComplete="off"
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
          autoComplete="new-password"
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
          label="Validate TLS certificates (origin server and proxy)"
          isChecked={value.tls_validation ?? true}
          isDisabled={hasDefaultProxy && useInstanceDefault}
          onChange={(_event, checked) => onChange({ ...value, tls_validation: checked })}
        />
        {hasDefaultProxy && useInstanceDefault ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Set by the instance default proxy above - uncheck{" "}
                <strong>Use the instance default proxy</strong> to control this separately
                for this remote.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>
      <FormGroup label="Trusted CA certificate (PEM)" fieldId={`${idPrefix}-ca-cert`}>
        <TextArea
          id={`${idPrefix}-ca-cert`}
          rows={6}
          resizeOrientation="vertical"
          autoComplete="off"
          placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
          isDisabled={hasDefaultProxy && useInstanceDefault}
          value={value.ca_cert ?? ""}
          onChange={(_event, v) => onChange({ ...value, ca_cert: v })}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {hasDefaultProxy && useInstanceDefault ? (
                <>
                  Set by the instance default proxy above - uncheck{" "}
                  <strong>Use the instance default proxy</strong> to control this
                  separately for this remote.
                </>
              ) : (
                "Trusted in addition to the system's own CAs - most commonly needed for a self-signed origin server or proxy."
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </ExpandableSection>
  );
}
