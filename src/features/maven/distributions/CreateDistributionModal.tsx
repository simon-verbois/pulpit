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
} from "@patternfly/react-core";

import { listAllMavenRemotes } from "../../../api/client/maven/remotes";
import { BasePathField } from "../../../components/BasePathField";
import { useContentOrigin } from "../../../hooks/useContentOrigin";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateMavenDistributionMutation } from "./useCreateMavenDistributionMutation";

interface CreateDistributionModalProps {
  repositoryHref: string;
  repositoryName: string;
  onClose: () => void;
}

/** Distributions are managed from the repository they publish (see
 * RepositoryDistributionsTab) - there's no standalone "create for any
 * repository" flow, so the repository is fixed, not a picker.
 *
 * The optional "Pull-through remote" field is specific to this plugin -
 * VERIFIED live: unlike every other plugin's distribution in this app, a
 * Maven distribution can additionally proxy a remote directly for caching,
 * independent of this repository's own content. */
export function CreateDistributionModal({
  repositoryHref,
  repositoryName,
  onClose,
}: CreateDistributionModalProps) {
  const [basePath, setBasePath] = useState("");
  const contentOrigin = useContentOrigin();
  const [remote, setRemote] = useState("");
  const createMutation = useCreateMavenDistributionMutation();

  const remotesQuery = useQuery({
    queryKey: ["pulp", "maven", "remotes", "all"],
    queryFn: listAllMavenRemotes,
  });

  const handleSubmit = () => {
    // Pulp requires a `name` distinct from `base_path`, but both are
    // globally-unique free-text identifiers (VERIFIED live) - reusing the
    // base path as the name avoids asking for the same thing twice.
    createMutation.mutate(
      {
        name: basePath,
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
          <FormGroup label="Base path" isRequired fieldId="distribution-base-path">
            <BasePathField
              id="distribution-base-path"
              isRequired
              prefix={`${contentOrigin}/pulp/content/`}
              placeholder="my-repo"
              value={basePath}
              onChange={setBasePath}
            />
          </FormGroup>
          <FormGroup label="Pull-through remote" fieldId="distribution-remote">
            <FormSelect
              id="distribution-remote"
              value={remote}
              onChange={(_event, value) => setRemote(value)}
            >
              <FormSelectOption
                key=""
                value=""
                label="None - serve this repository only"
              />
              {(remotesQuery.data ?? []).map((r) => (
                <FormSelectOption key={r.pulp_href} value={r.pulp_href} label={r.name} />
              ))}
            </FormSelect>
          </FormGroup>
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
              isDisabled={!basePath || createMutation.isPending}
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
