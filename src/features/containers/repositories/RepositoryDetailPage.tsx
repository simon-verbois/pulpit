import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageSection, Tab, TabTitleText, Tabs } from "@patternfly/react-core";

import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { RepositoryHeaderActions } from "../../../components/RepositoryHeaderActions";
import { useUrlTab } from "../../../hooks/useUrlTab";
import { useContainerRepositoryByNameQuery } from "./useContainerRepositoryByNameQuery";
import { useDeleteContainerRepositoryMutation } from "./useDeleteContainerRepositoryMutation";
import { RepositoryOverviewTab } from "./RepositoryOverviewTab";
import { RepositoryTagsTab } from "./RepositoryTagsTab";
import { RepositoryManifestsTab } from "./RepositoryManifestsTab";
import { RepositoryDistributionsTab } from "./RepositoryDistributionsTab";
import { ObjectAccessTab } from "../../access/ObjectAccessTab";
import { RepositoryVersionsTab } from "./RepositoryVersionsTab";
import { EditRepositoryModal } from "./EditRepositoryModal";
import {
  containerRepositoriesListRootKey,
  containerRepositoryByNameKey,
  containerRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncContainerRepositoryMutation } from "./useSyncContainerRepositoryMutation";

export function RepositoryDetailPage() {
  const { name = "" } = useParams<{ name: string }>();
  const [activeTab, setActiveTab] = useUrlTab("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  const repositoryQuery = useContainerRepositoryByNameQuery(name);
  const deleteMutation = useDeleteContainerRepositoryMutation();
  const syncMutation = useSyncContainerRepositoryMutation();

  if (repositoryQuery.isPending) {
    return (
      <>
        <PageHeader title={name} />
        <PageSection hasBodyWrapper={false}>
          <LoadingState label="Loading repository" />
        </PageSection>
      </>
    );
  }

  if (repositoryQuery.isError) {
    return (
      <>
        <PageHeader title={name} />
        <PageSection hasBodyWrapper={false}>
          <ErrorState
            error={repositoryQuery.error}
            onRetry={() => repositoryQuery.refetch()}
          />
        </PageSection>
      </>
    );
  }

  const repository = repositoryQuery.data;
  if (!repository) {
    return (
      <>
        <PageHeader title={name} />
        <PageSection hasBodyWrapper={false}>
          <EmptyState
            title="Repository not found"
            body={`No container repository named "${name}" exists.`}
          />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={repository.name}
        description={repository.description ?? undefined}
        actions={
          <RepositoryHeaderActions
            resourceHref={repository.pulp_href}
            sync={{
              isDisabled: !repository.remote || syncMutation.isPending,
              isLoading: syncMutation.isPending,
              description: repository.remote
                ? undefined
                : "This repository has no default remote configured",
              onClick: () =>
                syncMutation.mutate({
                  href: repository.pulp_href,
                  name: repository.name,
                  invalidateKeys: [
                    containerRepositoryByNameKey(repository.name),
                    containerRepositoriesListRootKey,
                    containerRepositoryVersionsKey(repository.versions_href),
                  ],
                }),
            }}
            onEdit={() => setIsEditOpen(true)}
            onDelete={() => setIsConfirmingDelete(true)}
          />
        }
      />
      <PageSection hasBodyWrapper={false} type="tabs">
        <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(key)}>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <RepositoryOverviewTab
                repository={repository}
                onShowVersions={() => setActiveTab("versions")}
              />
            </PageSection>
          </Tab>
          <Tab eventKey="tags" title={<TabTitleText>Tags</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <RepositoryTagsTab repository={repository} />
            </PageSection>
          </Tab>
          <Tab eventKey="manifests" title={<TabTitleText>Manifests</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <RepositoryManifestsTab repository={repository} />
            </PageSection>
          </Tab>
          <Tab eventKey="versions" title={<TabTitleText>Versions</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <RepositoryVersionsTab repository={repository} />
            </PageSection>
          </Tab>
          <Tab
            eventKey="distributions"
            title={<TabTitleText>Distributions</TabTitleText>}
          >
            <PageSection hasBodyWrapper={false}>
              <RepositoryDistributionsTab repository={repository} />
            </PageSection>
          </Tab>
          <Tab eventKey="access" title={<TabTitleText>Access</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <ObjectAccessTab
                objectHref={repository.pulp_href}
                objectLabel={`"${repository.name}"`}
              />
            </PageSection>
          </Tab>
        </Tabs>
      </PageSection>

      {isEditOpen ? (
        <EditRepositoryModal
          repository={repository}
          onClose={() => setIsEditOpen(false)}
        />
      ) : null}
      {isConfirmingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="repository"
          itemLabel={repository.name}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: repository.pulp_href, name: repository.name },
              { onSuccess: () => navigate("/containers/repositories") },
            )
          }
        />
      ) : null}
    </>
  );
}
