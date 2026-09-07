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
import { useUrlTab } from "../../../hooks/useUrlTab";
import { useHuggingFaceRepositoryByNameQuery } from "./useHuggingFaceRepositoryByNameQuery";
import { useDeleteHuggingFaceRepositoryMutation } from "./useDeleteHuggingFaceRepositoryMutation";
import { RepositoryOverviewTab } from "./RepositoryOverviewTab";
import { RepositoryContentTab } from "./RepositoryContentTab";
import { RepositoryVersionsTab } from "./RepositoryVersionsTab";
import { RepositoryDistributionsTab } from "./RepositoryDistributionsTab";
import { ObjectAccessTab } from "../../access/ObjectAccessTab";
import { EditRepositoryModal } from "./EditRepositoryModal";

export function RepositoryDetailPage() {
  const { name = "" } = useParams<{ name: string }>();
  const [activeTab, setActiveTab] = useUrlTab("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  const repositoryQuery = useHuggingFaceRepositoryByNameQuery(name);
  const deleteMutation = useDeleteHuggingFaceRepositoryMutation();

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
            body={`No Hugging Face repository named "${name}" exists.`}
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
          <Flex spaceItems={{ default: "spaceItemsSm" }}>
            <FlexItem>
              <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
                Edit
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant="danger" onClick={() => setIsConfirmingDelete(true)}>
                Delete repository
              </Button>
            </FlexItem>
          </Flex>
        }
      />
      <PageSection hasBodyWrapper={false} type="tabs">
        <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(key)}>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <PageSection hasBodyWrapper={false}>
              <RepositoryOverviewTab repository={repository} />
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
      {isConfirmingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="repository"
          itemLabel={repository.name}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: repository.pulp_href, name: repository.name },
              { onSuccess: () => navigate("/hugging-face/repositories") },
            )
          }
        />
      ) : null}
    </>
  );
}
