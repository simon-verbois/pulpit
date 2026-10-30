import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, PageSection, Tab, TabTitleText, Tabs } from "@patternfly/react-core";

import { PageLayout } from "../../../components/PageLayout";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { useUrlTab } from "../../../hooks/useUrlTab";
import { useGroupByNameQuery } from "./useGroupByNameQuery";
import { useDeleteGroupMutation } from "./useDeleteGroupMutation";
import { GroupMembersTab } from "./GroupMembersTab";
import { GroupRolesTab } from "./GroupRolesTab";

export function GroupDetailPage() {
  const { name = "" } = useParams<{ name: string }>();
  const [activeTab, setActiveTab] = useUrlTab("members");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  const groupQuery = useGroupByNameQuery(name);
  const deleteMutation = useDeleteGroupMutation();

  if (groupQuery.isPending) {
    return (
      <PageLayout title={name}>
        <LoadingState label="Loading group" />
      </PageLayout>
    );
  }

  if (groupQuery.isError) {
    return (
      <PageLayout title={name}>
        <ErrorState error={groupQuery.error} onRetry={() => groupQuery.refetch()} />
      </PageLayout>
    );
  }

  const group = groupQuery.data;
  if (!group) {
    return (
      <PageLayout title={name}>
        <EmptyState title="Group not found" body={`No group named "${name}" exists.`} />
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title={group.name}
        actions={
          <Button variant="danger" onClick={() => setIsConfirmingDelete(true)}>
            Delete group
          </Button>
        }
        type="tabs"
      >
        <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(key)}>
          <Tab eventKey="members" title={<TabTitleText>Members</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <GroupMembersTab group={group} />
            </PageSection>
          </Tab>
          <Tab eventKey="roles" title={<TabTitleText>Roles</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <GroupRolesTab group={group} />
            </PageSection>
          </Tab>
        </Tabs>
      </PageLayout>

      {isConfirmingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="group"
          itemLabel={group.name}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: group.pulp_href, name: group.name },
              { onSuccess: () => navigate("/admin?tab=access&subtab=groups") },
            )
          }
        />
      ) : null}
    </>
  );
}
