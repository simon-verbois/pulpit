import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Content,
  Divider,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  PageSection,
  Stack,
  StackItem,
  TextArea,
  TextInput,
} from "@patternfly/react-core";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import type { DefaultSettings } from "../../../api/client/pulpitCore/types";
import { useDefaultSettingsQuery } from "./useDefaultSettingsQuery";
import { useUpdateDefaultSettingsMutation } from "./useUpdateDefaultSettingsMutation";
import { ApplyProxyToAllRemotesModal } from "./ApplyProxyToAllRemotesModal";

export function DefaultSettingsPage() {
  const settingsQuery = useDefaultSettingsQuery();

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        {settingsQuery.isPending ? (
          <LoadingState label="Loading default settings" />
        ) : null}
        {settingsQuery.isError ? (
          <ErrorState
            error={settingsQuery.error}
            onRetry={() => settingsQuery.refetch()}
          />
        ) : null}
        {settingsQuery.data ? (
          <Stack hasGutter>
            <StackItem>
              <ProxySettingsForm settings={settingsQuery.data} />
            </StackItem>
          </Stack>
        ) : null}
      </PageSection>
    </>
  );
}

function ProxySettingsForm({ settings }: { settings: DefaultSettings }) {
  const updateSettings = useUpdateDefaultSettingsMutation();
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(settings.proxy_url);
  const [proxyUsername, setProxyUsername] = useState(settings.proxy_username);
  // Blank on load - GET never echoes the password back (VERIFIED live,
  // pulpit-core/app/modules/default_settings/schemas.py); blank on submit
  // means "leave unchanged", not "clear" (see handleSave).
  const [proxyPassword, setProxyPassword] = useState("");
  const [skipTlsValidation, setSkipTlsValidation] = useState(
    !settings.proxy_tls_validation,
  );
  // Unlike proxyPassword above, this is public material and IS echoed back
  // by GET (models.py's docstring) - prefilled with the real current value,
  // not blank. Applied to every new Remote's own native `ca_cert` field
  // (RemoteConnectionSettingsFields.tsx) - replaces the old trusted_ca
  // module's docker-exec mechanism.
  const [caCert, setCaCert] = useState(settings.proxy_ca_cert ?? "");

  const passwordHint = settings.proxy_password_is_set
    ? "Currently set - leave blank to keep it, or type a new value to replace it."
    : undefined;

  const isDirty =
    proxyUrl !== settings.proxy_url ||
    proxyUsername !== settings.proxy_username ||
    proxyPassword !== "" ||
    skipTlsValidation !== !settings.proxy_tls_validation ||
    caCert !== (settings.proxy_ca_cert ?? "");

  const handleSave = () => {
    updateSettings.mutate(
      {
        proxy_url: proxyUrl,
        proxy_username: proxyUsername,
        proxy_password: proxyPassword || undefined,
        proxy_tls_validation: !skipTlsValidation,
        proxy_ca_cert: caCert,
      },
      {
        onSuccess: (data) => {
          // Blank the password back out rather than leaving whatever was
          // just typed sitting there - the hint below it is the only thing
          // that should reflect "set", same as every Remote's proxy
          // password field. caCert is re-synced to the server's own
          // (whitespace-trimmed) value so isDirty above doesn't stay true
          // after a successful save just because of trailing whitespace.
          setProxyPassword("");
          setCaCert(data.proxy_ca_cert ?? "");
        },
      },
    );
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Content component="h2">Proxy</Content>
        <Content component="small">
          Applied automatically to every new Remote (each Remote's Create/Edit form can
          still override it under its own advanced connection settings).
        </Content>
      </StackItem>

      <StackItem>
        {updateSettings.isError ? (
          <Alert
            variant="danger"
            isInline
            title={
              updateSettings.error instanceof PulpApiError
                ? updateSettings.error.message
                : "Could not save default settings."
            }
          />
        ) : null}
        <Form>
          <FormGroup label="Proxy URL" fieldId="default-settings-proxy-url">
            <TextInput
              id="default-settings-proxy-url"
              placeholder="http://proxy.example.com:3128"
              autoComplete="off"
              value={proxyUrl}
              onChange={(_event, value) => setProxyUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Proxy username" fieldId="default-settings-proxy-username">
            <TextInput
              id="default-settings-proxy-username"
              autoComplete="off"
              value={proxyUsername}
              onChange={(_event, value) => setProxyUsername(value)}
            />
          </FormGroup>
          <FormGroup label="Proxy password" fieldId="default-settings-proxy-password">
            <TextInput
              id="default-settings-proxy-password"
              type="password"
              autoComplete="new-password"
              value={proxyPassword}
              onChange={(_event, value) => setProxyPassword(value)}
            />
            {passwordHint ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{passwordHint}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </FormGroup>
          <FormGroup fieldId="default-settings-proxy-skip-tls-validation">
            <Checkbox
              id="default-settings-proxy-skip-tls-validation"
              label="Skip TLS certificate validation"
              isChecked={skipTlsValidation}
              onChange={(_event, checked) => setSkipTlsValidation(checked)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={skipTlsValidation ? "warning" : undefined}>
                  Pulp has one TLS-validation setting per Remote, shared by the proxy and
                  the origin server - there is no way to skip it for only the proxy.
                  Enabling this also skips certificate validation for the remote's own URL
                  once applied.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup
            label="Trusted CA certificate (PEM)"
            fieldId="default-settings-proxy-ca-cert"
          >
            <TextArea
              id="default-settings-proxy-ca-cert"
              rows={8}
              resizeOrientation="vertical"
              autoComplete="off"
              placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
              value={caCert}
              onChange={(_event, value) => setCaCert(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Applied to every new Remote's own <code>ca_cert</code> field (in
                  addition to the system's own trusted CAs) - most commonly needed to
                  trust a corporate TLS-inspecting proxy. Leave blank for none.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </StackItem>

      <StackItem>
        <Button
          variant="primary"
          isDisabled={!isDirty || updateSettings.isPending}
          isLoading={updateSettings.isPending}
          onClick={handleSave}
        >
          Save
        </Button>
      </StackItem>

      <StackItem>
        <Divider />
      </StackItem>

      <StackItem>
        <Content component="h3">Apply to existing remotes</Content>
        <Content component="small">
          The proxy settings above are only applied automatically to a Remote at the
          moment it's created (or when its own Create/Edit form explicitly opts in). Use
          this to retroactively overwrite every existing Remote's proxy with whatever is
          currently saved above instead.
        </Content>
      </StackItem>
      <StackItem>
        <Button
          variant="danger"
          isDisabled={isDirty}
          onClick={() => setIsApplyOpen(true)}
        >
          Apply to all remotes…
        </Button>
        {isDirty ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="warning">
                Save your changes above first.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </StackItem>

      {isApplyOpen ? (
        <ApplyProxyToAllRemotesModal onClose={() => setIsApplyOpen(false)} />
      ) : null}
    </Stack>
  );
}
