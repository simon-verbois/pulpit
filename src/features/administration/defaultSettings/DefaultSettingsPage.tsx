import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  Grid,
  GridItem,
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
  // not blank. Published to the shared egress policy and the containers'
  // system trust stores (deployment/docker/pulp/global-network).
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
          One global policy for existing and new remotes, ULN authentication, and outgoing
          application connections. Changes apply to the next connection; active transfers
          are allowed to finish.
        </Content>
      </StackItem>

      <StackItem>
        {updateSettings.isSuccess && !isDirty ? (
          <Alert variant="success" isInline title="Global network policy saved">
            New outbound connections use this configuration.
          </Alert>
        ) : null}
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
          <Grid hasGutter>
            <GridItem span={12} md={6} xl={4}>
              <FormSection title="Connection" titleElement="h3">
                <FormGroup label="Proxy URL" fieldId="default-settings-proxy-url">
                  <TextInput
                    id="default-settings-proxy-url"
                    placeholder="http://proxy.example.com:3128"
                    autoComplete="off"
                    value={proxyUrl}
                    onChange={(_event, value) => setProxyUrl(value)}
                  />
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
                        Enabling this disables TLS certificate checks for outgoing
                        application connections. Prefer adding your trusted CA below.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </FormSection>
            </GridItem>

            <GridItem span={12} md={6} xl={4}>
              <FormSection title="Authentication" titleElement="h3">
                <FormGroup
                  label="Proxy username"
                  fieldId="default-settings-proxy-username"
                >
                  <TextInput
                    id="default-settings-proxy-username"
                    autoComplete="off"
                    value={proxyUsername}
                    onChange={(_event, value) => setProxyUsername(value)}
                  />
                </FormGroup>
                <FormGroup
                  label="Proxy password"
                  fieldId="default-settings-proxy-password"
                >
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
              </FormSection>
            </GridItem>

            <GridItem span={12} xl={4}>
              <FormSection title="Trust" titleElement="h3">
                <FormGroup
                  label="Trusted CA certificate (PEM)"
                  fieldId="default-settings-proxy-ca-cert"
                >
                  <TextArea
                    id="default-settings-proxy-ca-cert"
                    rows={8}
                    resizeOrientation="vertical"
                    autoComplete="off"
                    placeholder={
                      "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                    }
                    value={caCert}
                    onChange={(_event, value) => setCaCert(value)}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Trusted globally in addition to public CAs, including Oracle ULN
                        login. No per-remote setup or manual container copy is required.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </FormSection>
            </GridItem>
          </Grid>
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
    </Stack>
  );
}
