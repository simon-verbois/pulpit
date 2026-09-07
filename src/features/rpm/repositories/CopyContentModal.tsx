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

import { listAllRpmRepositories } from "../../../api/client/rpm/repositories";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCopyContentMutation } from "./useCopyContentMutation";

interface CopyContentModalProps {
  sourceRepositoryHref: string;
  sourceRepositoryVersionHref: string;
  onClose: () => void;
}

/** Copies a repository version's entire content to another repository - see
 * src/api/client/rpm/copy.ts for the "whole version, no criteria"
 * simplification this makes. */
export function CopyContentModal({
  sourceRepositoryHref,
  sourceRepositoryVersionHref,
  onClose,
}: CopyContentModalProps) {
  const [destRepository, setDestRepository] = useState("");
  const copyMutation = useCopyContentMutation();

  const repositoriesQuery = useQuery({
    queryKey: ["pulp", "rpm", "repositories", "all"],
    queryFn: listAllRpmRepositories,
  });
  const candidateRepositories = (repositoriesQuery.data ?? []).filter(
    (repo) => repo.pulp_href !== sourceRepositoryHref,
  );

  const handleSubmit = () => {
    const dest = candidateRepositories.find((repo) => repo.pulp_href === destRepository);
    if (!dest) {
      return;
    }
    copyMutation.mutate(
      {
        sourceRepositoryVersionHref,
        destRepositoryHref: dest.pulp_href,
        destRepositoryName: dest.name,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="copy-content-title" variant="medium">
      <ModalHeader
        title="Copy content to another repository"
        labelId="copy-content-title"
      />
      <ModalBody>
        <Form>
          {copyMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                copyMutation.error instanceof PulpApiError
                  ? copyMutation.error.message
                  : "Could not start the copy."
              }
            />
          ) : null}
          <FormGroup
            label="Destination repository"
            isRequired
            fieldId="copy-dest-repository"
          >
            <FormSelect
              id="copy-dest-repository"
              value={destRepository}
              onChange={(_event, value) => setDestRepository(value)}
            >
              <FormSelectOption key="" value="" label="Select a repository…" />
              {candidateRepositories.map((repo) => (
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
              isDisabled={!destRepository || copyMutation.isPending}
              isLoading={copyMutation.isPending}
              onClick={handleSubmit}
            >
              Copy
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
