import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Content,
  Divider,
  ExpandableSection,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Stack,
  StackItem,
  TextInput,
} from "@patternfly/react-core";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useJob } from "../../../api/client/pulpitCore/useJob";
import type {
  FreeIpaTestConnectionResult,
  TlsFreeIpaSettings,
} from "../../../api/client/pulpitCore/types";
import { useFreeIpaSettingsQuery } from "./useFreeIpaSettingsQuery";
import { useUpdateFreeIpaSettingsMutation } from "./useUpdateFreeIpaSettingsMutation";
import { useTestFreeIpaConnectionMutation } from "./useTestFreeIpaConnectionMutation";
import { useRequestFreeIpaCertificateMutation } from "./useRequestFreeIpaCertificateMutation";
import { FreeIpaWizardModal } from "./FreeIpaWizardModal";

export function FreeIpaSection() {
  const settingsQuery = useFreeIpaSettingsQuery();

  return (
    <Stack hasGutter>
      <StackItem>
        <Content component="h2">FreeIPA</Content>
        <Content component="small">
          Requests and auto-renews a certificate for port 8443 from a FreeIPA CA, using a
          dedicated automation account (password/session auth - not Kerberos/keytabs, see
          docs/tls.md). Use the guided setup below for a first-time configuration, or fill
          in the form yourself after following docs/tls.md's manual-mode instructions.
        </Content>
      </StackItem>
      <StackItem>
        {settingsQuery.isPending ? (
          <LoadingState label="Loading FreeIPA settings" />
        ) : null}
        {settingsQuery.isError ? (
          <ErrorState
            error={settingsQuery.error}
            onRetry={() => settingsQuery.refetch()}
          />
        ) : null}
        {settingsQuery.data ? (
          <FreeIpaSettingsForm settings={settingsQuery.data} />
        ) : null}
      </StackItem>
    </Stack>
  );
}

function FreeIpaSettingsForm({ settings }: { settings: TlsFreeIpaSettings }) {
  const updateSettings = useUpdateFreeIpaSettingsMutation();
  const testConnection = useTestFreeIpaConnectionMutation();
  const testJob = useJob(testConnection.data?.id);
  const requestCert = useRequestFreeIpaCertificateMutation();
  const requestCertJob = useJob(requestCert.data?.id);
  const [showWizard, setShowWizard] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

  const [enabled, setEnabled] = useState(settings.enabled);
  const [baseUrl, setBaseUrl] = useState(settings.base_url);
  const [verifyTls, setVerifyTls] = useState(settings.verify_tls);
  const [commonName, setCommonName] = useState(settings.common_name);
  const [servicePrincipal, setServicePrincipal] = useState(settings.service_principal);
  const [serviceUsername, setServiceUsername] = useState(settings.service_username);
  // Blank on load - GET never echoes the password back; blank on submit
  // means "leave unchanged", same convention as LdapSettingsPage.
  const [servicePassword, setServicePassword] = useState("");
  const [ca, setCa] = useState(settings.ca);
  const [profile, setProfile] = useState(settings.profile ?? "");
  const [autoRenewEnabled, setAutoRenewEnabled] = useState(settings.auto_renew_enabled);
  const [renewBeforeDays, setRenewBeforeDays] = useState(settings.renew_before_days);

  const passwordHint = settings.service_password_is_set
    ? "Currently set - leave blank to keep it, or type a new value to replace it."
    : "Set by the guided setup automatically, or paste it in after following the manual-mode instructions (docs/tls.md).";

  const isDirty =
    enabled !== settings.enabled ||
    baseUrl !== settings.base_url ||
    verifyTls !== settings.verify_tls ||
    commonName !== settings.common_name ||
    servicePrincipal !== settings.service_principal ||
    serviceUsername !== settings.service_username ||
    servicePassword !== "" ||
    ca !== settings.ca ||
    profile !== (settings.profile ?? "") ||
    autoRenewEnabled !== settings.auto_renew_enabled ||
    renewBeforeDays !== settings.renew_before_days;

  const handleSave = () => {
    updateSettings.mutate(
      {
        enabled,
        base_url: baseUrl,
        verify_tls: verifyTls,
        common_name: commonName,
        service_principal: servicePrincipal,
        service_username: serviceUsername,
        service_password: servicePassword || undefined,
        ca,
        profile,
        auto_renew_enabled: autoRenewEnabled,
        renew_before_days: renewBeforeDays,
      },
      { onSuccess: () => setServicePassword("") },
    );
  };

  const testResult = testJob.data?.result as FreeIpaTestConnectionResult | undefined;
  const testIsRunning =
    testConnection.isPending ||
    testJob.data?.status === "queued" ||
    testJob.data?.status === "running";
  const requestCertIsRunning =
    requestCert.isPending ||
    requestCertJob.data?.status === "queued" ||
    requestCertJob.data?.status === "running";

  return (
    <Stack hasGutter>
      <StackItem>
        <Button variant="secondary" onClick={() => setShowWizard(true)}>
          Guided setup…
        </Button>
      </StackItem>

      <StackItem>
        <Divider />
      </StackItem>

      <StackItem>
        {updateSettings.isError ? (
          <Alert
            variant="danger"
            isInline
            title={
              updateSettings.error instanceof PulpApiError
                ? updateSettings.error.message
                : "Could not save FreeIPA settings."
            }
          />
        ) : null}
        <Form>
          <FormGroup fieldId="freeipa-enabled">
            <Checkbox
              id="freeipa-enabled"
              label="Enable the FreeIPA provider"
              isChecked={enabled}
              onChange={(_event, checked) => setEnabled(checked)}
            />
          </FormGroup>
          <FormGroup label="Base URL" isRequired fieldId="freeipa-base-url">
            <TextInput
              id="freeipa-base-url"
              placeholder="https://ipa.example.com"
              autoComplete="off"
              value={baseUrl}
              onChange={(_event, value) => setBaseUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Common name" isRequired fieldId="freeipa-common-name">
            <TextInput
              id="freeipa-common-name"
              placeholder="pulpit.example.com"
              autoComplete="off"
              value={commonName}
              onChange={(_event, value) => setCommonName(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  The hostname the issued certificate covers.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup
            label="Service principal"
            isRequired
            fieldId="freeipa-service-principal"
          >
            <TextInput
              id="freeipa-service-principal"
              placeholder="HTTP/pulpit.example.com@EXAMPLE.COM"
              autoComplete="off"
              value={servicePrincipal}
              onChange={(_event, value) => setServicePrincipal(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  The IPA service the certificate is requested for - distinct from the
                  automation account below, which is who makes the request.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <Divider />

          <FormGroup
            label="Automation account username"
            isRequired
            fieldId="freeipa-service-username"
          >
            <TextInput
              id="freeipa-service-username"
              placeholder="svc-pulpit-tls"
              autoComplete="off"
              value={serviceUsername}
              onChange={(_event, value) => setServiceUsername(value)}
            />
          </FormGroup>
          <FormGroup
            label="Automation account password"
            fieldId="freeipa-service-password"
          >
            <TextInput
              id="freeipa-service-password"
              type="password"
              autoComplete="new-password"
              value={servicePassword}
              onChange={(_event, value) => setServicePassword(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{passwordHint}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </StackItem>

      <StackItem>
        <ExpandableSection
          toggleText={isAdvancedExpanded ? "Hide advanced settings" : "Advanced settings"}
          isExpanded={isAdvancedExpanded}
          onToggle={(_event, expanded) => setIsAdvancedExpanded(expanded)}
        >
          <Form>
            <FormGroup fieldId="freeipa-verify-tls">
              <Checkbox
                id="freeipa-verify-tls"
                label="Verify FreeIPA's own TLS certificate"
                isChecked={verifyTls}
                onChange={(_event, checked) => setVerifyTls(checked)}
              />
            </FormGroup>
            <FormGroup label="CA" fieldId="freeipa-ca">
              <TextInput
                id="freeipa-ca"
                autoComplete="off"
                value={ca}
                onChange={(_event, value) => setCa(value)}
              />
            </FormGroup>
            <FormGroup label="Certificate profile" fieldId="freeipa-profile">
              <TextInput
                id="freeipa-profile"
                placeholder="caIPAserviceCert"
                autoComplete="off"
                value={profile}
                onChange={(_event, value) => setProfile(value)}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Leave blank to use FreeIPA's own default profile.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup fieldId="freeipa-auto-renew">
              <Checkbox
                id="freeipa-auto-renew"
                label="Automatically renew before expiry"
                isChecked={autoRenewEnabled}
                onChange={(_event, checked) => setAutoRenewEnabled(checked)}
              />
            </FormGroup>
            <FormGroup
              label="Renew this many days before expiry"
              fieldId="freeipa-renew-before-days"
            >
              <NumberInput
                id="freeipa-renew-before-days"
                value={renewBeforeDays}
                min={1}
                max={3650}
                onMinus={() => setRenewBeforeDays((v) => Math.max(1, v - 1))}
                onPlus={() => setRenewBeforeDays((v) => Math.min(3650, v + 1))}
                onChange={(event) =>
                  setRenewBeforeDays(Number((event.target as HTMLInputElement).value))
                }
              />
            </FormGroup>
          </Form>
        </ExpandableSection>
      </StackItem>

      <StackItem>
        <Flex>
          <FlexItem>
            <Button
              variant="primary"
              isDisabled={!isDirty || updateSettings.isPending}
              isLoading={updateSettings.isPending}
              onClick={handleSave}
            >
              Save
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="secondary"
              isDisabled={testIsRunning || !settings.base_url}
              isLoading={testIsRunning}
              onClick={() => testConnection.mutate()}
            >
              Test connection
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="secondary"
              isDisabled={requestCertIsRunning || !settings.enabled}
              isLoading={requestCertIsRunning}
              onClick={() => requestCert.mutate()}
            >
              Request certificate
            </Button>
          </FlexItem>
        </Flex>
        {isDirty ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="warning">
                Save your changes above before testing/requesting - these buttons use the
                last saved settings, not what's currently typed.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </StackItem>

      {testConnection.isError ? (
        <StackItem>
          <Alert
            variant="danger"
            isInline
            title={
              testConnection.error instanceof PulpApiError
                ? testConnection.error.message
                : "Could not queue the connection test."
            }
          />
        </StackItem>
      ) : null}
      {testResult ? (
        <StackItem>
          <Alert
            variant={testResult.success ? "success" : "danger"}
            isInline
            title={testResult.success ? "Connected" : "Connection failed"}
          >
            {testResult.error}
          </Alert>
        </StackItem>
      ) : null}

      {requestCert.isError ? (
        <StackItem>
          <Alert
            variant="danger"
            isInline
            title={
              requestCert.error instanceof PulpApiError
                ? requestCert.error.message
                : "Could not queue certificate issuance."
            }
          />
        </StackItem>
      ) : null}
      {requestCertJob.data?.status === "failed" ? (
        <StackItem>
          <Alert variant="danger" isInline title="Certificate issuance failed">
            {requestCertJob.data.error}
          </Alert>
        </StackItem>
      ) : null}
      {requestCertJob.data?.status === "success" ? (
        <StackItem>
          <Alert variant="success" isInline title="Certificate issued and installed" />
        </StackItem>
      ) : null}

      {showWizard ? <FreeIpaWizardModal onClose={() => setShowWizard(false)} /> : null}
    </Stack>
  );
}
