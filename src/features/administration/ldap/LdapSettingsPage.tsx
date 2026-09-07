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
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  PageSection,
  Stack,
  StackItem,
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
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

  const [enabled, setEnabled] = useState(settings.enabled);
  const [serverUri, setServerUri] = useState(settings.server_uri);
  const [bindDn, setBindDn] = useState(settings.bind_dn);
  // Blank on load - GET never echoes the password back (same convention as
  // DefaultSettings.proxy_password); blank on submit means "leave
  // unchanged", not "clear" (see handleSave).
  const [bindPassword, setBindPassword] = useState("");
  const [startTls, setStartTls] = useState(settings.start_tls);
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
      user_search_base: userSearchBase || undefined,
      user_search_filter: userSearchFilter || undefined,
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
          Configures Pulp's own LDAP authentication backend (Django/django-auth-ldap) -
          local accounts (including the "admin" service account this app itself uses) keep
          working exactly as before, LDAP is only tried for a username with no local
          match. Saving here only stores a draft; use "Apply" below to actually push it to
          Pulp.
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
          <FormGroup fieldId="ldap-enabled">
            <Checkbox
              id="ldap-enabled"
              label="Enable LDAP authentication"
              isChecked={enabled}
              onChange={(_event, checked) => setEnabled(checked)}
            />
          </FormGroup>

          <FormGroup label="Server URI" fieldId="ldap-server-uri">
            <TextInput
              id="ldap-server-uri"
              placeholder="ldaps://ldap.example.com:636"
              autoComplete="off"
              value={serverUri}
              onChange={(_event, value) => setServerUri(value)}
            />
          </FormGroup>
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
                  For a plain <code>ldap://</code> server that upgrades to TLS after
                  connecting. Not needed for <code>ldaps://</code>, which is already
                  encrypted from the start.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
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

          <Divider />

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
                  <code>%(user)s</code> is replaced with whatever username was typed into
                  the login form.
                </HelperTextItem>
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
            <FormGroup label="Group search base" fieldId="ldap-group-search-base">
              <TextInput
                id="ldap-group-search-base"
                placeholder="ou=groups,dc=example,dc=com"
                autoComplete="off"
                value={groupSearchBase}
                onChange={(_event, value) => setGroupSearchBase(value)}
              />
            </FormGroup>
            <FormGroup label="Group search filter" fieldId="ldap-group-search-filter">
              <TextInput
                id="ldap-group-search-filter"
                autoComplete="off"
                value={groupSearchFilter}
                onChange={(_event, value) => setGroupSearchFilter(value)}
              />
            </FormGroup>
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
                    Creates/updates matching Groups on every login from the user's LDAP
                    group membership - they then show up in the Access tab like any other
                    group, ready to have roles assigned.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
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
                    Optional - if set, only members of this group may log in at all. Leave
                    blank to allow any user this directory can successfully bind as.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <Divider />

            <Content component="h3">Attribute mapping</Content>
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
            {testResult.success
              ? testResult.user_search_matched !== undefined
                ? testResult.user_search_matched
                  ? "The user search base/filter returned at least one entry."
                  : "Bind succeeded, but the user search base/filter returned nothing - double-check them."
                : null
              : testResult.error}
          </Alert>
        </StackItem>
      ) : null}

      <StackItem>
        <Divider />
      </StackItem>

      <StackItem>
        <Content component="h3">Apply</Content>
        <Content component="small">
          Pushes the settings saved above out to Pulp and restarts its API process to pick
          them up - a brief, instance-wide interruption (see the confirmation dialog).
          Testing the connection above first is strongly recommended.
        </Content>
      </StackItem>
      <StackItem>
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
      </StackItem>

      {isApplyOpen ? (
        <ApplyLdapConfigModal onClose={() => setIsApplyOpen(false)} />
      ) : null}
    </Stack>
  );
}
