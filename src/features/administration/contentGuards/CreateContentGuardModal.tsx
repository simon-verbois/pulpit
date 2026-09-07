import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
} from "@patternfly/react-core";

import { listAllContentGuards } from "../../../api/client/administration/contentGuards";
import type { ContentGuardKind } from "../../../api/client/administration/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateContentGuardMutation } from "./useCreateContentGuardMutation";

const KIND_OPTIONS: { value: ContentGuardKind; label: string }[] = [
  { value: "header", label: "Header - require a specific HTTP header value" },
  { value: "rbac", label: "RBAC - require a granted role (users/groups)" },
  {
    value: "content_redirect",
    label: "Content redirect - Pulp's own signed-URL mechanism",
  },
  { value: "composite", label: "Composite - require every one of several other guards" },
  {
    value: "x509",
    label: "X.509 certificate - require a client cert signed by a given CA",
  },
  {
    value: "rhsm",
    label: "RHSM certificate - like X.509, validated the way subscription-manager does",
  },
];

/** Every flavor shares name/description; the rest is conditional on `kind`.
 * See docs/PULP_API.md "Administration endpoints" for what each flavor
 * actually checks and how it's VERIFIED to behave live. */
export function CreateContentGuardModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<ContentGuardKind>("header");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headerName, setHeaderName] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [jqFilter, setJqFilter] = useState("");
  const [caCertificate, setCaCertificate] = useState("");
  const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
  const createMutation = useCreateContentGuardMutation();

  const guardsQuery = useQuery({
    queryKey: ["pulp", "administration", "contentGuards", "all"],
    queryFn: listAllContentGuards,
  });

  const isValid =
    Boolean(name) &&
    (kind !== "header" || (headerName && headerValue)) &&
    (kind !== "x509" && kind !== "rhsm" ? true : Boolean(caCertificate)) &&
    (kind !== "composite" || selectedGuards.length > 0);

  const handleSubmit = () => {
    const base = { name, description: description || undefined };
    const data =
      kind === "header"
        ? {
            ...base,
            header_name: headerName,
            header_value: headerValue,
            jq_filter: jqFilter || undefined,
          }
        : kind === "x509" || kind === "rhsm"
          ? { ...base, ca_certificate: caCertificate }
          : kind === "composite"
            ? { ...base, guards: selectedGuards }
            : base;

    createMutation.mutate({ kind, data }, { onSuccess: () => onClose() });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="create-content-guard-title"
      variant="medium"
    >
      <ModalHeader title="Create content guard" labelId="create-content-guard-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the content guard."
              }
            />
          ) : null}
          <FormGroup label="Type" isRequired fieldId="content-guard-kind">
            <FormSelect
              id="content-guard-kind"
              value={kind}
              onChange={(_event, value) => setKind(value as ContentGuardKind)}
            >
              {KIND_OPTIONS.map((option) => (
                <FormSelectOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Name" isRequired fieldId="content-guard-name">
            <TextInput
              id="content-guard-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="content-guard-description">
            <TextArea
              id="content-guard-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
              autoResize
            />
          </FormGroup>

          {kind === "header" ? (
            <>
              <FormGroup
                label="Header name"
                isRequired
                fieldId="content-guard-header-name"
              >
                <TextInput
                  id="content-guard-header-name"
                  isRequired
                  placeholder="e.g. X-Api-Key"
                  value={headerName}
                  onChange={(_event, value) => setHeaderName(value)}
                />
              </FormGroup>
              <FormGroup
                label="Header value"
                isRequired
                fieldId="content-guard-header-value"
              >
                <TextInput
                  id="content-guard-header-value"
                  isRequired
                  autoComplete="off"
                  value={headerValue}
                  onChange={(_event, value) => setHeaderValue(value)}
                />
              </FormGroup>
              <FormGroup label="jq filter" fieldId="content-guard-jq-filter">
                <TextInput
                  id="content-guard-jq-filter"
                  placeholder="Optional - a jq expression to transform the header value before comparing"
                  value={jqFilter}
                  onChange={(_event, value) => setJqFilter(value)}
                />
              </FormGroup>
            </>
          ) : null}

          {kind === "x509" || kind === "rhsm" ? (
            <FormGroup
              label="CA certificate"
              isRequired
              fieldId="content-guard-ca-certificate"
            >
              <TextArea
                id="content-guard-ca-certificate"
                isRequired
                rows={8}
                autoComplete="off"
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                value={caCertificate}
                onChange={(_event, value) => setCaCertificate(value)}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>A PEM-encoded X.509 certificate.</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          ) : null}

          {kind === "composite" ? (
            <FormGroup
              label="Guards to require"
              isRequired
              fieldId="content-guard-guards"
            >
              {(guardsQuery.data ?? []).map((guard) => (
                <Checkbox
                  key={guard.pulp_href}
                  id={`composite-guard-${guard.pulp_href}`}
                  label={guard.name}
                  isChecked={selectedGuards.includes(guard.pulp_href)}
                  onChange={(_event, checked) =>
                    setSelectedGuards((current) =>
                      checked
                        ? [...current, guard.pulp_href]
                        : current.filter((g) => g !== guard.pulp_href),
                    )
                  }
                />
              ))}
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    A client must satisfy every guard checked here.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          ) : null}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Flex
          justifyContent={{ default: "justifyContentFlexEnd" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              isDisabled={!isValid || createMutation.isPending}
              isLoading={createMutation.isPending}
              onClick={handleSubmit}
            >
              Create
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
