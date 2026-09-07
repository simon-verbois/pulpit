import { useState } from "react";
import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import type { AnsibleRepository } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { ansibleRepositoryByNameKey, ansibleRepositoryVersionsKey } from "./queryKeys";
import {
  useMarkContentMutation,
  useUnmarkContentMutation,
} from "./useMarkContentMutation";

/** Marks (or unmarks) every collection version currently in the repository
 * (`["*"]`) with an arbitrary label value - a per-content-unit picker is out
 * of scope for this first pass, matching SignContentModal. */
export function MarkContentModal({
  repository,
  mode,
  onClose,
}: {
  repository: AnsibleRepository;
  mode: "mark" | "unmark";
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const markMutation = useMarkContentMutation();
  const unmarkMutation = useUnmarkContentMutation();
  const mutation = mode === "mark" ? markMutation : unmarkMutation;

  const handleSubmit = () => {
    mutation.mutate(
      {
        href: repository.pulp_href,
        repositoryName: repository.name,
        contentUnits: ["*"],
        value,
        invalidateKeys: [
          ansibleRepositoryByNameKey(repository.name),
          ansibleRepositoryVersionsKey(repository.versions_href),
        ],
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="mark-content-title" variant="medium">
      <ModalHeader
        title={`${mode === "mark" ? "Mark" : "Unmark"} content in "${repository.name}"`}
        labelId="mark-content-title"
      />
      <ModalBody>
        <Content component="p">
          {mode === "mark"
            ? "Applies a label to every collection version currently in the repository's latest version."
            : "Removes a label from every collection version currently in the repository's latest version."}
        </Content>
        <Form>
          {mutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                mutation.error instanceof PulpApiError
                  ? mutation.error.message
                  : `Could not ${mode} the content.`
              }
            />
          ) : null}
          <FormGroup label="Value" isRequired fieldId="mark-value">
            <TextInput
              id="mark-value"
              isRequired
              value={value}
              onChange={(_event, v) => setValue(v)}
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
              isDisabled={!value || mutation.isPending}
              isLoading={mutation.isPending}
              onClick={handleSubmit}
            >
              {mode === "mark" ? "Mark" : "Unmark"}
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
