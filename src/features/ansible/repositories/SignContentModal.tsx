import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Content,
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

import { listAllSigningServices } from "../../../api/client/ansible/signingServices";
import type { AnsibleRepository } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { ansibleRepositoryByNameKey, ansibleRepositoryVersionsKey } from "./queryKeys";
import { useSignContentMutation } from "./useSignContentMutation";

/** Signs every collection version currently in the repository (`["*"]`, a
 * value the API explicitly supports) - a per-content-unit picker is out of
 * scope for this first pass. */
export function SignContentModal({
  repository,
  onClose,
}: {
  repository: AnsibleRepository;
  onClose: () => void;
}) {
  const [signingService, setSigningService] = useState("");
  const signMutation = useSignContentMutation();
  const signingServicesQuery = useQuery({
    queryKey: ["pulp", "signingServices", "all"],
    queryFn: listAllSigningServices,
  });

  const handleSubmit = () => {
    signMutation.mutate(
      {
        href: repository.pulp_href,
        repositoryName: repository.name,
        contentUnits: ["*"],
        signingService,
        invalidateKeys: [
          ansibleRepositoryByNameKey(repository.name),
          ansibleRepositoryVersionsKey(repository.versions_href),
        ],
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="sign-content-title" variant="medium">
      <ModalHeader
        title={`Sign content in "${repository.name}"`}
        labelId="sign-content-title"
      />
      <ModalBody>
        <Content component="p">
          This signs every collection version currently in the repository's latest
          version.
        </Content>
        <Form>
          {signMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                signMutation.error instanceof PulpApiError
                  ? signMutation.error.message
                  : "Could not sign the content."
              }
            />
          ) : null}
          {signingServicesQuery.isSuccess && signingServicesQuery.data.length === 0 ? (
            <Alert
              variant="warning"
              isInline
              title="No signing services are configured on this Pulp instance - signing requires one to be set up server-side first."
            />
          ) : null}
          <FormGroup label="Signing service" isRequired fieldId="sign-service">
            <FormSelect
              id="sign-service"
              value={signingService}
              onChange={(_event, value) => setSigningService(value)}
            >
              <FormSelectOption key="" value="" label="Select a signing service" />
              {(signingServicesQuery.data ?? []).map((service) => (
                <FormSelectOption
                  key={service.pulp_href}
                  value={service.pulp_href}
                  label={service.name}
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
              isDisabled={!signingService || signMutation.isPending}
              isLoading={signMutation.isPending}
              onClick={handleSubmit}
            >
              Sign
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
