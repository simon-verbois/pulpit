import { useState } from "react";
import {
  Alert,
  Button,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  PageSection,
  Stack,
  StackItem,
  TextInput,
} from "@patternfly/react-core";

import { PageHeader } from "../../../components/PageHeader";
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
      <PageHeader
        title="Default Settings"
        description="Instance-wide defaults PulpIT itself applies - not sent to Pulp as a setting of its own."
      />
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
        {settingsQuery.data ? <ProxySettingsForm settings={settingsQuery.data} /> : null}
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

  const passwordHint = settings.proxy_password_is_set
    ? "Currently set - leave blank to keep it, or type a new value to replace it."
    : undefined;

  const handleSave = () => {
    updateSettings.mutate(
      {
        proxy_url: proxyUrl,
        proxy_username: proxyUsername,
        proxy_password: proxyPassword || undefined,
      },
      // Blank the field back out rather than leaving whatever was just
      // typed sitting there - the hint below it is the only thing that
      // should reflect "set", same as every Remote's proxy password field.
      { onSuccess: () => setProxyPassword("") },
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
              value={proxyUrl}
              onChange={(_event, value) => setProxyUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Proxy username" fieldId="default-settings-proxy-username">
            <TextInput
              id="default-settings-proxy-username"
              value={proxyUsername}
              onChange={(_event, value) => setProxyUsername(value)}
            />
          </FormGroup>
          <FormGroup label="Proxy password" fieldId="default-settings-proxy-password">
            <TextInput
              id="default-settings-proxy-password"
              type="password"
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
        </Form>
      </StackItem>

      <StackItem>
        <Button
          variant="primary"
          isDisabled={updateSettings.isPending}
          isLoading={updateSettings.isPending}
          onClick={handleSave}
        >
          Save
        </Button>
      </StackItem>
    </Stack>
  );
}
