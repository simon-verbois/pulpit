import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Content,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import { listAllAnsibleRepositories } from "../../../api/client/ansible/repositories";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useDeprecateCollectionMutation } from "./useDeprecateCollectionMutation";

/** Deprecation applies to every version of a namespace+name collection, not
 * one repository - `repository` is only required by the API to associate
 * the deprecation marker with (see docs/PULP_API.md). There's no
 * un-deprecate action (VERIFIED live schema: no DELETE on this resource). */
export function DeprecateCollectionModal({ onClose }: { onClose: () => void }) {
  const [namespace, setNamespace] = useState("");
  const [name, setName] = useState("");
  const [repository, setRepository] = useState("");
  const deprecateMutation = useDeprecateCollectionMutation();

  const repositoriesQuery = useQuery({
    queryKey: ["pulp", "ansible", "repositories", "all"],
    queryFn: listAllAnsibleRepositories,
  });

  const handleSubmit = () => {
    deprecateMutation.mutate(
      { namespace, name, repository },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="deprecate-collection-title"
      variant="medium"
    >
      <ModalHeader title="Deprecate a collection" labelId="deprecate-collection-title" />
      <ModalBody>
        <Content component="p">
          Marks every version of this collection as deprecated. This can't be undone from
          PulpIT.
        </Content>
        <Form>
          {deprecateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                deprecateMutation.error instanceof PulpApiError
                  ? deprecateMutation.error.message
                  : "Could not deprecate the collection."
              }
            />
          ) : null}
          <FormGroup label="Namespace" isRequired fieldId="deprecate-namespace">
            <TextInput
              id="deprecate-namespace"
              isRequired
              value={namespace}
              onChange={(_event, value) => setNamespace(value)}
            />
          </FormGroup>
          <FormGroup label="Name" isRequired fieldId="deprecate-name">
            <TextInput
              id="deprecate-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Repository" isRequired fieldId="deprecate-repository">
            <FormSelect
              id="deprecate-repository"
              value={repository}
              onChange={(_event, value) => setRepository(value)}
            >
              <FormSelectOption key="" value="" label="Select a repository…" />
              {(repositoriesQuery.data ?? []).map((repo) => (
                <FormSelectOption
                  key={repo.pulp_href}
                  value={repo.pulp_href}
                  label={repo.name}
                />
              ))}
            </FormSelect>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          isDisabled={!namespace || !name || !repository || deprecateMutation.isPending}
          isLoading={deprecateMutation.isPending}
          onClick={handleSubmit}
        >
          Deprecate
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
