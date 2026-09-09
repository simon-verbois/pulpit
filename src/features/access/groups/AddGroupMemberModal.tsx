import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertActionLink,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

import { listAllGroupUsers } from "../../../api/client/access/groups";
import { listAllUsers } from "../../../api/client/access/users";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { SearchableMultiSelect } from "../SearchableMultiSelect";
import { usersQueryKey } from "../users/queryKeys";
import { groupUsersKey } from "./queryKeys";
import { useAddGroupUsersMutation } from "./useGroupMembershipMutations";

export function AddGroupMemberModal({
  groupHref,
  onClose,
}: {
  groupHref: string;
  onClose: () => void;
}) {
  const [usernames, setUsernames] = useState<string[]>([]);
  const addMutation = useAddGroupUsersMutation();

  const usersQuery = useQuery({
    queryKey: usersQueryKey(),
    queryFn: listAllUsers,
  });
  const membersQuery = useQuery({
    queryKey: [...groupUsersKey(groupHref), "all"],
    queryFn: () => listAllGroupUsers(groupHref),
  });
  const existingUsernames = new Set(
    (membersQuery.data ?? []).map((member) => member.username),
  );
  const candidates = (usersQuery.data ?? [])
    .map((user) => user.username)
    .filter((username) => !existingUsernames.has(username));
  const isLoading = usersQuery.isPending || membersQuery.isPending;
  const hasLoadError = usersQuery.isError || membersQuery.isError;

  const handleSubmit = () => {
    addMutation.mutate({ groupHref, usernames }, { onSuccess: () => onClose() });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="add-group-member-title"
      variant="medium"
    >
      <ModalHeader title="Add a member" labelId="add-group-member-title" />
      <ModalBody>
        <Form>
          {addMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                addMutation.error instanceof PulpApiError
                  ? addMutation.error.message
                  : "Could not add all selected members."
              }
            />
          ) : null}
          {hasLoadError ? (
            <Alert
              variant="danger"
              isInline
              title="Could not load available users."
              actionLinks={
                <AlertActionLink
                  onClick={() => {
                    if (usersQuery.isError) usersQuery.refetch();
                    if (membersQuery.isError) membersQuery.refetch();
                  }}
                >
                  Retry
                </AlertActionLink>
              }
            />
          ) : null}
          <FormGroup label="Users" isRequired fieldId="add-member-users">
            <SearchableMultiSelect
              id="add-member-users"
              ariaLabel="Users"
              placeholder={isLoading ? "Loading users…" : "Select users…"}
              options={candidates}
              selected={usernames}
              onChange={setUsernames}
              noOptionsText="Every user is already a member."
              isDisabled={hasLoadError}
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
              isDisabled={usernames.length === 0 || addMutation.isPending}
              isLoading={addMutation.isPending}
              onClick={handleSubmit}
            >
              Add
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
