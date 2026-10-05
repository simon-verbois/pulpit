import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Content,
  Divider,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  FormSelect,
  FormSelectOption,
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
import { useJob } from "../../../api/client/pulpitCore/useJob";
import type {
  LdapGroupType,
  LdapSettings,
  LdapTestConnectionResult,
} from "../../../api/client/pulpitCore/types";
import { useLdapSettingsQuery } from "./useLdapSettingsQuery";
import { useUpdateLdapSettingsMutation } from "./useUpdateLdapSettingsMutation";
import { useTestLdapConnectionMutation } from "./useTestLdapConnectionMutation";
import { ApplyLdapConfigModal } from "./ApplyLdapConfigModal";

const GROUP_TYPE_OPTIONS: { value: LdapGroupType; label: string }[] = [
  { value: "group_of_names", label: "groupOfNames (cn, member)" },
  { value: "posix_group", label: "posixGroup (cn, memberUid)" },
  { value: "nested_group_of_names", label: "Nested groupOfNames" },
];

export function LdapSettingsPage() {
  const settingsQuery = useLdapSettingsQuery();

  return (
    <PageSection hasBodyWrapper={false}>
      {settingsQuery.isPending ? <LoadingState label="Loading LDAP settings" /> : null}
      {settingsQuery.isError ? (
        <ErrorState error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} />
      ) : null}
      {settingsQuery.data ? <LdapSettingsForm settings={settingsQuery.data} /> : null}
    </PageSection>
  );
}

function LdapSettingsForm({ settings }: { settings: LdapSettings }) {
  const updateSettings = useUpdateLdapSettingsMutation();
  const testConnection = useTestLdapConnectionMutation();
  const testJob = useJob(testConnection.data?.id);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  const [enabled, setEnabled] = useState(settings.enabled);
  const [serverUri, setServerUri] = useState(settings.server_uri);
  const [bindDn, setBindDn] = useState(settings.bind_dn);
  // Blank on load - GET never echoes the password back (same convention as
  // DefaultSettings.proxy_password); blank on submit means "leave
  // unchanged", not "clear" (see handleSave).
  const [bindPassword, setBindPassword] = useState("");
  const [startTls, setStartTls] = useState(settings.start_tls);
  const [caCert, setCaCert] = useState(settings.ca_cert ?? "");
  const [userSearchBase, setUserSearchBase] = useState(settings.user_search_base);
  const [userSearchFilter, setUserSearchFilter] = useState(settings.user_search_filter);
  const [groupSearchBase, setGroupSearchBase] = useState(settings.group_search_base);
  const [groupSearchFilter, setGroupSearchFilter] = useState(
    settings.group_search_filter,
  );
  const [groupType, setGroupType] = useState<LdapGroupType>(settings.group_type);
  const [requireGroupDn, setRequireGroupDn] = useState(settings.require_group_dn ?? "");
  const [mirrorGroups, setMirrorGroups] = useState(settings.mirror_groups);
  const [attrFirstName, setAttrFirstName] = useState(settings.attr_first_name);
  const [attrLastName, setAttrLastName] = useState(settings.attr_last_name);
  const [attrEmail, setAttrEmail] = useState(settings.attr_email);

  const passwordHint = settings.bind_password_is_set
    ? "Currently set - leave blank to keep it, or type a new value to replace it."
    : "Leave blank for an anonymous bind, if your directory allows searches without one.";

  const isDirty =
    enabled !== settings.enabled ||
    serverUri !== settings.server_uri ||
    bindDn !== settings.bind_dn ||
    bindPassword !== "" ||
    startTls !== settings.start_tls ||
    caCert !== (settings.ca_cert ?? "") ||
    userSearchBase !== settings.user_search_base ||
    userSearchFilter !== settings.user_search_filter ||
    groupSearchBase !== settings.group_search_base ||
    groupSearchFilter !== settings.group_search_filter ||
    groupType !== settings.group_type ||
    requireGroupDn !== (settings.require_group_dn ?? "") ||
    mirrorGroups !== settings.mirror_groups ||
    attrFirstName !== settings.attr_first_name ||
    attrLastName !== settings.attr_last_name ||
    attrEmail !== settings.attr_email;

  const handleSave = () => {
    updateSettings.mutate(
      {
        enabled,
        server_uri: serverUri,
        bind_dn: bindDn,
        bind_password: bindPassword || undefined,
        start_tls: startTls,
        ca_cert: caCert,
        user_search_base: userSearchBase,
        user_search_filter: userSearchFilter,
        group_search_base: groupSearchBase,
        group_search_filter: groupSearchFilter,
        group_type: groupType,
        require_group_dn: requireGroupDn,
        mirror_groups: mirrorGroups,
        attr_first_name: attrFirstName,
        attr_last_name: attrLastName,
        attr_email: attrEmail,
      },
      { onSuccess: () => setBindPassword("") },
    );
  };

  const handleTestConnection = () => {
    testConnection.mutate({
      server_uri: serverUri || undefined,
      bind_dn: bindDn || undefined,
      bind_password: bindPassword || undefined,
      start_tls: startTls,
      ca_cert: caCert,
      user_search_base: userSearchBase || undefined,
      user_search_filter: userSearchFilter || undefined,
      group_search_base: groupSearchBase || undefined,
      group_search_filter: groupSearchFilter || undefined,
      require_group_dn: requireGroupDn || undefined,
    });
  };

  const testResult = testJob.data?.result as LdapTestConnectionResult | undefined;
  const testIsRunning =
    testConnection.isPending ||
    testJob.data?.status === "queued" ||
    testJob.data?.status === "running";

  return (
    <Stack hasGutter>
      <StackItem>
        <Content component="h2">LDAP authentication</Content>
        <Content component="small">
          Configures Pulp's LDAP authentication backend. Local accounts, including admin,
          keep working; LDAP is tried only when no local username matches. Save stores a
          draft; use Apply to push it to Pulp.
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
                : "Could not save LDAP settings."
            }
          />
        ) : null}
        <Form>
          <Grid hasGutter>
            <GridItem span={12}>
              <FormGroup fieldId="ldap-enabled">
                <Checkbox
                  id="ldap-enabled"
                  label="Enable LDAP authentication"
                  isChecked={enabled}
                  onChange={(_event, checked) => setEnabled(checked)}
                />
              </FormGroup>
            </GridItem>

            <GridItem span={12} md={6} xl={4}>
              <FormSection title="Connection" titleElement="h3">
                <Grid hasGutter>
                  <GridItem span={12} xl={7}>
                    <FormGroup label="Server URI" fieldId="ldap-server-uri">
                      <TextInput
                        id="ldap-server-uri"
                        placeholder="ldaps://ldap.example.com:636"
                        autoComplete="off"
                        value={serverUri}
                        onChange={(_event, value) => setServerUri(value)}
                      />
                    </FormGroup>
                  </GridItem>
                  <GridItem span={12} xl={5}>
                    <FormGroup fieldId="ldap-start-tls">
                      <Checkbox
                        id="ldap-start-tls"
                        label="Use STARTTLS"
                        isChecked={startTls}
                        onChange={(_event, checked) => setStartTls(checked)}
                      />
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>
                            Upgrades a plain <code>ldap://</code> connection to TLS.
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    </FormGroup>
                  </GridItem>
                  <GridItem span={12}>
                    <FormGroup label="CA certificate (PEM)" fieldId="ldap-ca-cert">
                      <TextArea
                        id="ldap-ca-cert"
                        rows={3}
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
                            Paste internal CA certificates consecutively; leave blank to
                            use Pulp's system trust store.
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    </FormGroup>
                  </GridItem>
                </Grid>
              </FormSection>
            </GridItem>

            <GridItem span={12} md={6} xl={4}>
              <FormSection title="Bind account" titleElement="h3">
                <FormGroup label="Bind DN" fieldId="ldap-bind-dn">
                  <TextInput
                    id="ldap-bind-dn"
                    placeholder="cn=readonly,dc=example,dc=com"
                    autoComplete="off"
                    value={bindDn}
                    onChange={(_event, value) => setBindDn(value)}
                  />
                </FormGroup>
                <FormGroup label="Bind password" fieldId="ldap-bind-password">
                  <TextInput
                    id="ldap-bind-password"
                    type="password"
                    autoComplete="new-password"
                    value={bindPassword}
                    onChange={(_event, value) => setBindPassword(value)}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>{passwordHint}</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </FormSection>
            </GridItem>

            <GridItem span={12} md={6} xl={4}>
              <FormSection title="User lookup" titleElement="h3">
                <FormGroup label="User search base" fieldId="ldap-user-search-base">
                  <TextInput
                    id="ldap-user-search-base"
                    placeholder="ou=people,dc=example,dc=com"
                    autoComplete="off"
                    value={userSearchBase}
                    onChange={(_event, value) => setUserSearchBase(value)}
                  />
                </FormGroup>
                <FormGroup label="User search filter" fieldId="ldap-user-search-filter">
                  <TextInput
                    id="ldap-user-search-filter"
                    autoComplete="off"
                    value={userSearchFilter}
                    onChange={(_event, value) => setUserSearchFilter(value)}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        <code>%(user)s</code> is replaced with the username entered on the
                        login form.
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
        <Form>
          <Grid hasGutter>
            <GridItem span={12} lg={8}>
              <FormSection title="Group lookup" titleElement="h3">
                <Grid hasGutter>
                  <GridItem span={12} xl={4}>
                    <FormGroup label="Group search base" fieldId="ldap-group-search-base">
                      <TextInput
                        id="ldap-group-search-base"
                        placeholder="ou=groups,dc=example,dc=com"
                        autoComplete="off"
                        value={groupSearchBase}
                        onChange={(_event, value) => setGroupSearchBase(value)}
                      />
                    </FormGroup>
                  </GridItem>
                  <GridItem span={12} xl={4}>
                    <FormGroup
                      label="Group search filter"
                      fieldId="ldap-group-search-filter"
                    >
                      <TextInput
                        id="ldap-group-search-filter"
                        autoComplete="off"
                        value={groupSearchFilter}
                        onChange={(_event, value) => setGroupSearchFilter(value)}
                      />
                    </FormGroup>
                  </GridItem>
                  <GridItem span={12} xl={4}>
                    <FormGroup label="Group type" fieldId="ldap-group-type">
                      <FormSelect
                        id="ldap-group-type"
                        value={groupType}
                        onChange={(_event, value) => setGroupType(value as LdapGroupType)}
                      >
                        {GROUP_TYPE_OPTIONS.map((option) => (
                          <FormSelectOption
                            key={option.value}
                            value={option.value}
                            label={option.label}
                          />
                        ))}
                      </FormSelect>
                    </FormGroup>
                  </GridItem>
                  <GridItem span={12} xl={4}>
                    <FormGroup fieldId="ldap-mirror-groups">
                      <Checkbox
                        id="ldap-mirror-groups"
                        label="Mirror LDAP groups as Pulp groups"
                        isChecked={mirrorGroups}
                        onChange={(_event, checked) => setMirrorGroups(checked)}
                      />
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>
                            Creates or updates matching Pulp groups on login.
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    </FormGroup>
                  </GridItem>
                  <GridItem span={12} xl={8}>
                    <FormGroup label="Require group DN" fieldId="ldap-require-group-dn">
                      <TextInput
                        id="ldap-require-group-dn"
                        placeholder="cn=pulp-users,ou=groups,dc=example,dc=com"
                        autoComplete="off"
                        value={requireGroupDn}
                        onChange={(_event, value) => setRequireGroupDn(value)}
                      />
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>
                            Optional. If set, only members of this group may log in.
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    </FormGroup>
                  </GridItem>
                </Grid>
              </FormSection>
            </GridItem>

            <GridItem span={12} lg={4}>
              <FormSection title="Attribute mapping" titleElement="h3">
                <FormGroup label="First name attribute" fieldId="ldap-attr-first-name">
                  <TextInput
                    id="ldap-attr-first-name"
                    autoComplete="off"
                    value={attrFirstName}
                    onChange={(_event, value) => setAttrFirstName(value)}
                  />
                </FormGroup>
                <FormGroup label="Last name attribute" fieldId="ldap-attr-last-name">
                  <TextInput
                    id="ldap-attr-last-name"
                    autoComplete="off"
                    value={attrLastName}
                    onChange={(_event, value) => setAttrLastName(value)}
                  />
                </FormGroup>
                <FormGroup label="Email attribute" fieldId="ldap-attr-email">
                  <TextInput
                    id="ldap-attr-email"
                    autoComplete="off"
                    value={attrEmail}
                    onChange={(_event, value) => setAttrEmail(value)}
                  />
                </FormGroup>
              </FormSection>
            </GridItem>
          </Grid>
        </Form>
        <Flex style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}>
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
              isDisabled={testIsRunning || !serverUri}
              isLoading={testIsRunning}
              onClick={handleTestConnection}
            >
              Test connection
            </Button>
          </FlexItem>
        </Flex>
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
      {testJob.data?.status === "failed" ? (
        <StackItem>
          <Alert variant="danger" isInline title="Connection test failed to run">
            {testJob.data.error}
          </Alert>
        </StackItem>
      ) : null}
      {testResult ? (
        <StackItem>
          <Alert
            variant={testResult.success ? "success" : "danger"}
            isInline
            title={
              testResult.success
                ? `Connected, bound as ${testResult.bound_as}`
                : "Connection failed"
            }
          >
            {testResult.success ? (
              <HelperText>
                {testResult.user_search_matched !== undefined ? (
                  <HelperTextItem
                    variant={testResult.user_search_error ? "error" : "default"}
                  >
                    {testResult.user_search_error
                      ? `User search failed: ${testResult.user_search_error}`
                      : testResult.user_search_matched
                        ? "The user search base/filter returned at least one entry."
                        : "The user search base/filter returned nothing - double-check them."}
                  </HelperTextItem>
                ) : null}
                {testResult.group_search_matched !== undefined ? (
                  <HelperTextItem
                    variant={testResult.group_search_error ? "error" : "default"}
                  >
                    {testResult.group_search_error
                      ? `Group search failed: ${testResult.group_search_error}`
                      : testResult.group_search_matched
                        ? "The group search base/filter returned at least one entry."
                        : "The group search base/filter returned nothing - double-check them."}
                  </HelperTextItem>
                ) : null}
                {testResult.require_group_dn_exists !== undefined ? (
                  <HelperTextItem
                    variant={
                      testResult.require_group_dn_error ||
                      !testResult.require_group_dn_exists
                        ? "error"
                        : "default"
                    }
                  >
                    {testResult.require_group_dn_error
                      ? `Require group DN check failed: ${testResult.require_group_dn_error}`
                      : testResult.require_group_dn_exists
                        ? "The Require group DN exists."
                        : "The Require group DN does not exist - no one would be able to log in."}
                  </HelperTextItem>
                ) : null}
              </HelperText>
            ) : (
              testResult.error
            )}
          </Alert>
        </StackItem>
      ) : null}

      <StackItem>
        <Divider />
      </StackItem>

      <StackItem>
        <Grid hasGutter>
          <GridItem span={12} md={10}>
            <Content component="h3">Apply</Content>
            <Content component="small">
              Pushes the saved settings to Pulp and restarts its API process - a brief,
              instance-wide interruption. Testing the connection first is strongly
              recommended.
            </Content>
          </GridItem>
          <GridItem span={12} md={2}>
            <Button
              variant="danger"
              isDisabled={isDirty}
              onClick={() => setIsApplyOpen(true)}
            >
              Apply…
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
          </GridItem>
        </Grid>
      </StackItem>

      {isApplyOpen ? (
        <ApplyLdapConfigModal onClose={() => setIsApplyOpen(false)} />
      ) : null}
    </Stack>
  );
}
