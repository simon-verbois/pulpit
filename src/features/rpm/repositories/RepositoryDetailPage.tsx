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
import { useRpmRepositoryByNameQuery } from "./useRpmRepositoryByNameQuery";
import { useDeleteRpmRepositoryMutation } from "./useDeleteRpmRepositoryMutation";
import { RepositoryOverviewTab } from "./RepositoryOverviewTab";
import { RepositoryVersionsTab } from "./RepositoryVersionsTab";
import { RepositoryPackagesTab } from "./RepositoryPackagesTab";
import { RepositoryAdvisoriesTab } from "./RepositoryAdvisoriesTab";
import { RepositoryContentTab } from "./RepositoryContentTab";
import { RepositoryDistributionsTab } from "./RepositoryDistributionsTab";
import { ObjectAccessTab } from "../../access/ObjectAccessTab";
import { EditRepositoryModal } from "./EditRepositoryModal";
import { ResignRepositoryModal } from "./ResignRepositoryModal";
import {
  rpmRepositoriesListRootKey,
  rpmRepositoryByNameKey,
  rpmRepositoryVersionsKey,
} from "./queryKeys";
import { useSyncRpmRepositoryMutation } from "./useSyncRpmRepositoryMutation";
import { usePublishRpmRepositoryMutation } from "./usePublishRpmRepositoryMutation";
import { useRepositorySigningPolicyQuery } from "./useRepositorySigningPolicyQuery";

export function RepositoryDetailPage() {
  const { name = "" } = useParams<{ name: string }>();
  const [activeTab, setActiveTab] = useUrlTab("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isResignOpen, setIsResignOpen] = useState(false);
  const navigate = useNavigate();

  const repositoryQuery = useRpmRepositoryByNameQuery(name);
  const deleteMutation = useDeleteRpmRepositoryMutation();
  const syncMutation = useSyncRpmRepositoryMutation();
  const publishMutation = usePublishRpmRepositoryMutation();
  const policyQuery = useRepositorySigningPolicyQuery();
  // Hidden when signing is off globally (or pulpit-core unreachable) -
  // there is no key to re-sign with.
  const signingAvailable = Boolean(
    policyQuery.data?.package_signing_enabled ||
    policyQuery.data?.metadata_signing_enabled,
  );

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
            body={`No RPM repository named "${name}" exists.`}
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
                    rpmRepositoryByNameKey(repository.name),
                    rpmRepositoriesListRootKey,
                    rpmRepositoryVersionsKey(repository.versions_href),
                  ],
                }),
            }}
            actions={[
              {
                key: "publish",
                label: "Publish now",
                isLoading: publishMutation.isPending,
                description: repository.autopublish
                  ? "Autopublish is on - only needed to force a republish"
                  : undefined,
                onClick: () =>
                  publishMutation.mutate({
                    href: repository.pulp_href,
                    name: repository.name,
                  }),
              },
              ...(signingAvailable
                ? [
                    {
                      key: "resign",
                      label: "Re-sign now",
                      description: "Re-sign every package not signed with the active key",
                      onClick: () => setIsResignOpen(true),
                    },
                  ]
                : []),
            ]}
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
          <Tab eventKey="packages" title={<TabTitleText>Packages</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <RepositoryPackagesTab repository={repository} />
            </PageSection>
          </Tab>
          <Tab eventKey="advisories" title={<TabTitleText>Advisories</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <RepositoryAdvisoriesTab repository={repository} />
            </PageSection>
          </Tab>
          <Tab eventKey="content" title={<TabTitleText>Content</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <RepositoryContentTab repository={repository} />
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
      {isResignOpen ? (
        <ResignRepositoryModal
          repository={repository}
          onClose={() => setIsResignOpen(false)}
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
              { onSuccess: () => navigate("/rpm/repositories") },
            )
          }
        />
      ) : null}
    </>
  );
}
