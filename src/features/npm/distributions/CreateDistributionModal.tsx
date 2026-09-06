import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
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

import { listAllNpmRemotes } from "../../../api/client/npm/remotes";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateNpmDistributionMutation } from "./useCreateNpmDistributionMutation";

interface CreateDistributionModalProps {
  repositoryHref: string;
  repositoryName: string;
  onClose: () => void;
}

/** Distributions are managed from the repository they publish (see
 * RepositoryDistributionsTab) - there's no standalone "create for any
 * repository" flow, so the repository is fixed, not a picker.
 *
 * The optional "Pull-through remote" field is specific to this plugin (like
 * maven) - VERIFIED live: a distribution can additionally proxy a remote
 * directly for caching, independent of this repository's own synced
 * content. */
export function CreateDistributionModal({
  repositoryHref,
  repositoryName,
  onClose,
}: CreateDistributionModalProps) {
  const [name, setName] = useState("");
  const [basePath, setBasePath] = useState("");
  const [remote, setRemote] = useState("");
  const createMutation = useCreateNpmDistributionMutation();

  const remotesQuery = useQuery({
    queryKey: ["pulp", "npm", "remotes", "all"],
    queryFn: listAllNpmRemotes,
  });

  const handleSubmit = () => {
    createMutation.mutate(
      {
        name,
        base_path: basePath,
        repository: repositoryHref,
        remote: remote || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="create-distribution-title"
      variant="medium"
    >
      <ModalHeader
        title={`Create distribution for "${repositoryName}"`}
        labelId="create-distribution-title"
      />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the distribution."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="distribution-name">
            <TextInput
              id="distribution-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Base path" isRequired fieldId="distribution-base-path">
            <TextInput
              id="distribution-base-path"
              isRequired
              placeholder="e.g. my-repo"
              value={basePath}
              onChange={(_event, value) => setBasePath(value)}
            />
          </FormGroup>
          <FormGroup label="Pull-through remote" fieldId="distribution-remote">
            <FormSelect
              id="distribution-remote"
              value={remote}
              onChange={(_event, value) => setRemote(value)}
            >
              <FormSelectOption key="" value="" label="None - serve this repository only" />
              {(remotesQuery.data ?? []).map((r) => (
                <FormSelectOption key={r.pulp_href} value={r.pulp_href} label={r.name} />
              ))}
            </FormSelect>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Flex justifyContent={{ default: "justifyContentFlexEnd" }} style={{ width: "100%" }}>
          <FlexItem>
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              isDisabled={!name || !basePath || createMutation.isPending}
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
