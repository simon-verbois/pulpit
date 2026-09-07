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
  Label,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Stack,
  StackItem,
  TextInput,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import type { FreeIpaWizardStepResult } from "../../../api/client/pulpitCore/types";
import { useRunFreeIpaWizardSetupMutation } from "./useRunFreeIpaWizardSetupMutation";

const STEP_STATUS_COLOR: Record<FreeIpaWizardStepResult["status"], "green" | "blue" | "red"> = {
  created: "green",
  already_exists: "blue",
  failed: "red",
};

const STEP_STATUS_LABEL: Record<FreeIpaWizardStepResult["status"], string> = {
  created: "Done",
  already_exists: "Already existed",
  failed: "Failed",
};

/** IPA's realm defaults to the domain name uppercased (VERIFIED as FreeIPA's
 * own installer default - an administrator can still deviate from this, which
 * is exactly why the field this feeds stays editable, not read-only). Empty
 * until the common name has at least one dot to derive a domain from. */
function deriveDefaultTargetPrincipal(commonName: string): string {
  const dotIndex = commonName.indexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  const domain = commonName.slice(dotIndex + 1);
  return domain ? `HTTP/${commonName}@${domain.toUpperCase()}` : "";
}

export function FreeIpaWizardModal({ onClose }: { onClose: () => void }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [verifyTls, setVerifyTls] = useState(true);
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [commonName, setCommonName] = useState("");
  // null = "not manually touched yet" - the field displays the derived
  // default below; typing anything (even clearing it back to "") stores an
  // explicit override here and stops the auto-fill, same "auto-fill until
  // the admin touches it themselves" convention as RemoteConnectionSettingsFields'
  // instance-default-proxy sync, but as a derived value rather than an
  // effect (no extra render, nothing to keep in sync by hand).
  const [targetPrincipalOverride, setTargetPrincipalOverride] = useState<string | null>(null);
  const targetPrincipal = targetPrincipalOverride ?? deriveDefaultTargetPrincipal(commonName);
  const [serviceAccountUsername, setServiceAccountUsername] = useState("svc-pulpit-tls");
  const [ca, setCa] = useState("ipa");
  const [profile, setProfile] = useState("");
  const [renewBeforeDays, setRenewBeforeDays] = useState(30);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

  const wizardMutation = useRunFreeIpaWizardSetupMutation();
  const result = wizardMutation.data;

  const handleRun = () => {
    wizardMutation.mutate(
      {
        base_url: baseUrl,
        verify_tls: verifyTls,
        admin_username: adminUsername,
        admin_password: adminPassword,
        common_name: commonName,
        target_principal: targetPrincipal,
        service_account_username: serviceAccountUsername,
        ca,
        profile: profile || undefined,
        renew_before_days: renewBeforeDays,
      },
      // The admin password field only ever holds this one value for the
      // duration of the request - cleared immediately once it's been sent,
      // regardless of outcome, rather than lingering in this form's state.
      { onSettled: () => setAdminPassword("") },
    );
  };

  const isRequiredFilled =
    baseUrl.trim() &&
    adminUsername.trim() &&
    adminPassword.trim() &&
    commonName.trim() &&
    targetPrincipal.trim() &&
    serviceAccountUsername.trim();

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="freeipa-wizard-title" variant="medium">
      <ModalHeader title="FreeIPA guided setup" labelId="freeipa-wizard-title" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Content component="small">
              Your IPA administrator password is used once, for this request only - never
              stored, logged, or reused. Only the new automation account it creates is saved
              (see docs/tls.md "Guided setup (wizard)").
            </Content>
          </StackItem>

          {wizardMutation.isError ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title={
                  wizardMutation.error instanceof PulpApiError
                    ? wizardMutation.error.message
                    : "Could not run the guided setup."
                }
              />
            </StackItem>
          ) : null}

          {result ? (
            <StackItem>
              <Alert
                isInline
                variant={result.success ? "success" : "danger"}
                title={
                  result.success
                    ? "Setup completed - the automation account's credentials were saved."
                    : "Setup did not complete - see the step that failed below."
                }
              />
              <List isPlain>
                {result.steps.map((step, index) => (
                  <ListItem key={index}>
                    <Flex spaceItems={{ default: "spaceItemsSm" }} alignItems={{ default: "alignItemsCenter" }}>
                      <FlexItem>
                        <Label color={STEP_STATUS_COLOR[step.status]}>
                          {STEP_STATUS_LABEL[step.status]}
                        </Label>
                      </FlexItem>
                      <FlexItem>{step.step}</FlexItem>
                    </Flex>
                    {step.detail ? (
                      <Content component="small">{step.detail}</Content>
                    ) : null}
                  </ListItem>
                ))}
              </List>
            </StackItem>
          ) : (
            <StackItem>
              <Form>
                <FormGroup label="FreeIPA base URL" isRequired fieldId="wizard-base-url">
                  <TextInput
                    id="wizard-base-url"
                    placeholder="https://ipa.example.com"
                    autoComplete="off"
                    value={baseUrl}
                    onChange={(_event, value) => setBaseUrl(value)}
                  />
                </FormGroup>

                <Divider />

                <FormGroup label="IPA administrator username" isRequired fieldId="wizard-admin-username">
                  <TextInput
                    id="wizard-admin-username"
                    autoComplete="off"
                    value={adminUsername}
                    onChange={(_event, value) => setAdminUsername(value)}
                  />
                </FormGroup>
                <FormGroup label="IPA administrator password" isRequired fieldId="wizard-admin-password">
                  <TextInput
                    id="wizard-admin-password"
                    type="password"
                    autoComplete="off"
                    value={adminPassword}
                    onChange={(_event, value) => setAdminPassword(value)}
                  />
                </FormGroup>

                <Divider />

                <FormGroup label="Common name" isRequired fieldId="wizard-common-name">
                  <TextInput
                    id="wizard-common-name"
                    placeholder="pulpit.example.com"
                    autoComplete="off"
                    value={commonName}
                    onChange={(_event, value) => setCommonName(value)}
                  />
                </FormGroup>
              </Form>
            </StackItem>
          )}

          {!result ? (
            <StackItem>
              <ExpandableSection
                toggleText={isAdvancedExpanded ? "Hide advanced settings" : "Advanced settings"}
                isExpanded={isAdvancedExpanded}
                onToggle={(_event, expanded) => setIsAdvancedExpanded(expanded)}
              >
                <Form>
                  <FormGroup label="Target service principal" isRequired fieldId="wizard-target-principal">
                    <TextInput
                      id="wizard-target-principal"
                      placeholder="HTTP/pulpit.example.com@EXAMPLE.COM"
                      autoComplete="off"
                      value={targetPrincipal}
                      onChange={(_event, value) => setTargetPrincipalOverride(value)}
                    />
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>
                          Defaults to <code>HTTP/&lt;common name&gt;@&lt;domain, uppercased&gt;</code> -
                          IPA's own default realm naming. Only override if your realm differs.
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                  <FormGroup
                    label="New automation account username"
                    isRequired
                    fieldId="wizard-service-account-username"
                  >
                    <TextInput
                      id="wizard-service-account-username"
                      placeholder="svc-pulpit-tls"
                      autoComplete="off"
                      value={serviceAccountUsername}
                      onChange={(_event, value) => setServiceAccountUsername(value)}
                    />
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>
                          Always created fresh - never reuses an existing account.
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                  <FormGroup fieldId="wizard-verify-tls">
                    <Checkbox
                      id="wizard-verify-tls"
                      label="Verify FreeIPA's own TLS certificate"
                      isChecked={verifyTls}
                      onChange={(_event, checked) => setVerifyTls(checked)}
                    />
                  </FormGroup>
                  <FormGroup label="CA" fieldId="wizard-ca">
                    <TextInput
                      id="wizard-ca"
                      autoComplete="off"
                      value={ca}
                      onChange={(_event, value) => setCa(value)}
                    />
                  </FormGroup>
                  <FormGroup label="Certificate profile" fieldId="wizard-profile">
                    <TextInput
                      id="wizard-profile"
                      placeholder="caIPAserviceCert"
                      autoComplete="off"
                      value={profile}
                      onChange={(_event, value) => setProfile(value)}
                    />
                  </FormGroup>
                  <FormGroup label="Renew this many days before expiry" fieldId="wizard-renew-before-days">
                    <NumberInput
                      id="wizard-renew-before-days"
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
          ) : null}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Flex justifyContent={{ default: "justifyContentFlexEnd" }} style={{ width: "100%" }}>
          <FlexItem>
            <Button variant="link" onClick={onClose}>
              {result ? "Close" : "Cancel"}
            </Button>
          </FlexItem>
          {!result ? (
            <FlexItem>
              <Button
                variant="primary"
                isLoading={wizardMutation.isPending}
                isDisabled={wizardMutation.isPending || !isRequiredFilled}
                onClick={handleRun}
              >
                Run setup
              </Button>
            </FlexItem>
          ) : null}
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
