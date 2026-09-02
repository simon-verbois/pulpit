import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Flex,
  FlexItem,
  PageSection,
  Tab,
  TabTitleText,
  Tabs,
} from "@patternfly/react-core";

import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { useUserByUsernameQuery } from "./useUserByUsernameQuery";
import { useDeleteUserMutation } from "./useDeleteUserMutation";
import { UserOverviewTab } from "./UserOverviewTab";
import { UserRolesTab } from "./UserRolesTab";
import { EditUserModal } from "./EditUserModal";

export function UserDetailPage() {
  const { username = "" } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<string | number>("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  const userQuery = useUserByUsernameQuery(username);
  const deleteMutation = useDeleteUserMutation();

  if (userQuery.isPending) {
    return (
      <>
        <PageHeader title={username} />
        <PageSection hasBodyWrapper={false}>
          <LoadingState label="Loading user" />
        </PageSection>
      </>
    );
  }

  if (userQuery.isError) {
    return (
      <>
        <PageHeader title={username} />
        <PageSection hasBodyWrapper={false}>
          <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />
        </PageSection>
      </>
    );
  }

  const user = userQuery.data;
  if (!user) {
    return (
      <>
        <PageHeader title={username} />
        <PageSection hasBodyWrapper={false}>
          <EmptyState
            title="User not found"
            body={`No user named "${username}" exists.`}
          />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={user.username}
        actions={
          <Flex spaceItems={{ default: "spaceItemsSm" }}>
            <FlexItem>
              <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
                Edit
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant="danger" onClick={() => setIsConfirmingDelete(true)}>
                Delete user
              </Button>
            </FlexItem>
          </Flex>
        }
      />
      <PageSection hasBodyWrapper={false} type="tabs">
        <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(key)}>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <UserOverviewTab user={user} />
            </PageSection>
          </Tab>
          <Tab eventKey="roles" title={<TabTitleText>Roles</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <UserRolesTab user={user} />
            </PageSection>
          </Tab>
        </Tabs>
      </PageSection>

      {isEditOpen ? (
        <EditUserModal user={user} onClose={() => setIsEditOpen(false)} />
      ) : null}
      {isConfirmingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="user"
          itemLabel={user.username}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: user.pulp_href, username: user.username },
              { onSuccess: () => navigate("/access/users") },
            )
          }
        />
      ) : null}
    </>
  );
}
