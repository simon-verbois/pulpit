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
import type {
  CertContentGuard,
  CompositeContentGuard,
  ContentGuardKind,
  ContentGuardSummary,
  HeaderContentGuard,
} from "../../../api/client/administration/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { LoadingState } from "../../../components/LoadingState";
import { useContentGuardDetailQuery } from "./useContentGuardDetailQuery";
import { useUpdateContentGuardMutation } from "./useUpdateContentGuardMutation";

type GuardDetail = HeaderContentGuard & CertContentGuard & CompositeContentGuard;

interface EditContentGuardModalProps {
  guard: ContentGuardSummary;
  kind: ContentGuardKind;
  onClose: () => void;
}

/** Loads the flavor-specific detail first (the generic list summary doesn't
 * carry it), then hands it to EditContentGuardForm below - which only ever
 * mounts once that data exists, so its fields can initialize directly from
 * props via plain useState rather than an effect syncing in afterwards. */
export function EditContentGuardModal({
  guard,
  kind,
  onClose,
}: EditContentGuardModalProps) {
  const detailQuery = useContentGuardDetailQuery<GuardDetail>(guard.pulp_href);

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="edit-content-guard-title"
      variant="medium"
    >
      <ModalHeader title={`Edit "${guard.name}"`} labelId="edit-content-guard-title" />
      {detailQuery.isPending ? (
        <ModalBody>
          <LoadingState label="Loading content guard" />
        </ModalBody>
      ) : null}
      {detailQuery.isSuccess ? (
        <EditContentGuardForm
          guard={guard}
          kind={kind}
          detail={detailQuery.data}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function EditContentGuardForm({
  guard,
  kind,
  detail,
  onClose,
}: {
  guard: ContentGuardSummary;
  kind: ContentGuardKind;
  detail: GuardDetail;
  onClose: () => void;
}) {
  const updateMutation = useUpdateContentGuardMutation();

  const [name, setName] = useState(guard.name);
  const [description, setDescription] = useState(guard.description ?? "");
  const [headerName, setHeaderName] = useState(detail.header_name ?? "");
  const [headerValue, setHeaderValue] = useState(detail.header_value ?? "");
  const [jqFilter, setJqFilter] = useState(detail.jq_filter ?? "");
  const [caCertificate, setCaCertificate] = useState(detail.ca_certificate ?? "");
  const [selectedGuards, setSelectedGuards] = useState<string[]>(detail.guards ?? []);

  const guardsQuery = useQuery({
    queryKey: ["pulp", "administration", "contentGuards", "all"],
    queryFn: listAllContentGuards,
    enabled: kind === "composite",
  });

  const handleSubmit = () => {
    const base = {
      name: name !== guard.name ? name : undefined,
      description: description || null,
    };
    const data =
      kind === "header"
        ? {
            ...base,
            header_name: headerName,
            header_value: headerValue,
            jq_filter: jqFilter || null,
          }
        : kind === "x509" || kind === "rhsm"
          ? { ...base, ca_certificate: caCertificate }
          : kind === "composite"
            ? { ...base, guards: selectedGuards }
            : base;

    updateMutation.mutate(
      { href: guard.pulp_href, data },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <>
      <ModalBody>
        <Form>
          {updateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                updateMutation.error instanceof PulpApiError
                  ? updateMutation.error.message
                  : "Could not update the content guard."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="content-guard-edit-name">
            <TextInput
              id="content-guard-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="content-guard-edit-description">
            <TextArea
              id="content-guard-edit-description"
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
                fieldId="content-guard-edit-header-name"
              >
                <TextInput
                  id="content-guard-edit-header-name"
                  isRequired
                  value={headerName}
                  onChange={(_event, value) => setHeaderName(value)}
                />
              </FormGroup>
              <FormGroup
                label="Header value"
                isRequired
                fieldId="content-guard-edit-header-value"
              >
                <TextInput
                  id="content-guard-edit-header-value"
                  isRequired
                  autoComplete="off"
                  value={headerValue}
                  onChange={(_event, value) => setHeaderValue(value)}
                />
              </FormGroup>
              <FormGroup label="jq filter" fieldId="content-guard-edit-jq-filter">
                <TextInput
                  id="content-guard-edit-jq-filter"
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
              fieldId="content-guard-edit-ca-certificate"
            >
              <TextArea
                id="content-guard-edit-ca-certificate"
                isRequired
                rows={8}
                autoComplete="off"
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
              fieldId="content-guard-edit-guards"
            >
              {(guardsQuery.data ?? [])
                .filter((g) => g.pulp_href !== guard.pulp_href)
                .map((g) => (
                  <Checkbox
                    key={g.pulp_href}
                    id={`composite-edit-guard-${g.pulp_href}`}
                    label={g.name}
                    isChecked={selectedGuards.includes(g.pulp_href)}
                    onChange={(_event, checked) =>
                      setSelectedGuards((current) =>
                        checked
                          ? [...current, g.pulp_href]
                          : current.filter((h) => h !== g.pulp_href),
                      )
                    }
                  />
                ))}
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
              isDisabled={!name || updateMutation.isPending}
              isLoading={updateMutation.isPending}
              onClick={handleSubmit}
            >
              Save
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </>
  );
}
