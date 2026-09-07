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

import { listContainerManifests } from "../../../api/client/container/manifests";
import type { ContainerRepository } from "../../../api/client/container/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  containerRepositoryByNameKey,
  containerRepositoryVersionsKey,
} from "./queryKeys";
import { useTagImageMutation } from "./useTagImageMutation";

export function TagImageModal({
  repository,
  onClose,
}: {
  repository: ContainerRepository;
  onClose: () => void;
}) {
  const [tag, setTag] = useState("");
  const [digest, setDigest] = useState("");
  const tagMutation = useTagImageMutation();

  const manifestsQuery = useQuery({
    queryKey: ["pulp", "container", "manifests", repository.latest_version_href],
    queryFn: () =>
      listContainerManifests({
        limit: 100,
        offset: 0,
        repository_version: repository.latest_version_href,
      }),
  });

  const handleSubmit = () => {
    tagMutation.mutate(
      {
        href: repository.pulp_href,
        repositoryName: repository.name,
        tag,
        digest,
        invalidateKeys: [
          containerRepositoryByNameKey(repository.name),
          containerRepositoryVersionsKey(repository.versions_href),
        ],
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="tag-image-title" variant="medium">
      <ModalHeader
        title={`Tag an image in "${repository.name}"`}
        labelId="tag-image-title"
      />
      <ModalBody>
        <Form>
          {tagMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                tagMutation.error instanceof PulpApiError
                  ? tagMutation.error.message
                  : "Could not tag the image."
              }
            />
          ) : null}
          {manifestsQuery.isSuccess && manifestsQuery.data.results.length === 0 ? (
            <Alert
              variant="warning"
              isInline
              title="This repository has no manifests yet - sync a remote or the tag will have nothing to point at."
            />
          ) : null}
          <FormGroup label="Manifest" isRequired fieldId="tag-manifest">
            <FormSelect
              id="tag-manifest"
              value={digest}
              onChange={(_event, value) => setDigest(value)}
            >
              <FormSelectOption key="" value="" label="Select a manifest…" />
              {(manifestsQuery.data?.results ?? []).map((manifest) => (
                <FormSelectOption
                  key={manifest.pulp_href}
                  value={manifest.digest}
                  label={manifest.digest}
                />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Tag name" isRequired fieldId="tag-name">
            <TextInput
              id="tag-name"
              isRequired
              value={tag}
              onChange={(_event, value) => setTag(value)}
            />
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
              isDisabled={!tag || !digest || tagMutation.isPending}
              isLoading={tagMutation.isPending}
              onClick={handleSubmit}
            >
              Tag
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
