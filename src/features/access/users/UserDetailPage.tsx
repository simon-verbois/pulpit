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

import { PageLayout } from "../../../components/PageLayout";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { useUrlTab } from "../../../hooks/useUrlTab";
import { useUserByUsernameQuery } from "./useUserByUsernameQuery";
import { useDeleteUserMutation } from "./useDeleteUserMutation";
import { UserOverviewTab } from "./UserOverviewTab";
import { UserRolesTab } from "./UserRolesTab";
import { EditUserModal } from "./EditUserModal";

export function UserDetailPage() {
  const { username = "" } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useUrlTab("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  const userQuery = useUserByUsernameQuery(username);
  const deleteMutation = useDeleteUserMutation();

  if (userQuery.isPending) {
    return (
      <PageLayout title={username}>
        <LoadingState label="Loading user" />
      </PageLayout>
    );
  }

  if (userQuery.isError) {
    return (
      <PageLayout title={username}>
        <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />
      </PageLayout>
    );
  }

  const user = userQuery.data;
  if (!user) {
    return (
      <PageLayout title={username}>
        <EmptyState title="User not found" body={`No user named "${username}" exists.`} />
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
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
        type="tabs"
      >
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
      </PageLayout>

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
              { onSuccess: () => navigate("/admin?tab=access&subtab=users") },
            )
          }
        />
      ) : null}
    </>
  );
}
