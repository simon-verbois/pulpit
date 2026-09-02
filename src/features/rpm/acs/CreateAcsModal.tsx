import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
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

import { listAllRpmRemotes } from "../../../api/client/rpm/remotes";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateAcsMutation } from "./useCreateAcsMutation";

export function CreateAcsModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [remote, setRemote] = useState("");
  const [pathsInput, setPathsInput] = useState("");
  const createMutation = useCreateAcsMutation();

  // Only remotes with the "on_demand" policy are valid for an ACS
  // (VERIFIED live: any other policy is rejected with a 400).
  const remotesQuery = useQuery({
    queryKey: ["pulp", "rpm", "remotes", "all"],
    queryFn: listAllRpmRemotes,
  });
  const onDemandRemotes = (remotesQuery.data ?? []).filter(
    (r) => r.policy === "on_demand",
  );

  const handleSubmit = () => {
    const paths = pathsInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    createMutation.mutate(
      { name, remote, paths: paths.length > 0 ? paths : undefined },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="create-acs-title" variant="medium">
      <ModalHeader title="Create alternate content source" labelId="create-acs-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the alternate content source."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="acs-name">
            <TextInput
              id="acs-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Remote" isRequired fieldId="acs-remote">
            <FormSelect
              id="acs-remote"
              value={remote}
              onChange={(_event, value) => setRemote(value)}
            >
              <FormSelectOption key="" value="" label="Select a remote…" />
              {onDemandRemotes.map((r) => (
                <FormSelectOption key={r.pulp_href} value={r.pulp_href} label={r.name} />
              ))}
            </FormSelect>
            {onDemandRemotes.length === 0 ? (
              <p>
                Only remotes with the "On demand" sync policy can be used here - create
                one first if none are listed.
              </p>
            ) : null}
          </FormGroup>
          <FormGroup label="Paths" fieldId="acs-paths">
            <TextInput
              id="acs-paths"
              placeholder="e.g. rhel8/baseos, rhel8/appstream (comma-separated)"
              value={pathsInput}
              onChange={(_event, value) => setPathsInput(value)}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!name || !remote || createMutation.isPending}
          isLoading={createMutation.isPending}
          onClick={handleSubmit}
        >
          Create
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
