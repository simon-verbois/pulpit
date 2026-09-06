import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  ExpandableSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import {
  listRpmPackageCategories,
  listRpmPackageEnvironments,
  listRpmPackageGroups,
  listRpmPackageLangpacks,
} from "../../../api/client/rpm/compsContent";
import {
  listRpmModulemdDefaults,
  listRpmModulemdObsoletes,
  listRpmModulemds,
} from "../../../api/client/rpm/modulemd";
import { listRpmDistributionTrees } from "../../../api/client/rpm/distributionTrees";
import { listRpmRepoMetadataFiles } from "../../../api/client/rpm/repoMetadataFiles";
import type { RpmRepository } from "../../../api/client/rpm/types";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { UploadCompsModal } from "./UploadCompsModal";
import { rpmRepositoryByNameKey, rpmRepositoryVersionsKey } from "./queryKeys";

/** One collapsible section of the Content tab - a small read-only table (or
 * a "none yet" note) for a single sync-derived content type. Kept
 * expanded/collapsed state per-section rather than unmounting empty ones,
 * so the tab's shape doesn't shift around as different repos are viewed. */
function ContentSection({
  title,
  isPending,
  isError,
  error,
  count,
  children,
}: {
  title: string;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  count: number;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <ExpandableSection
      toggleText={`${title} (${isPending ? "…" : count})`}
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
    >
      {isPending ? <LoadingState label={`Loading ${title.toLowerCase()}`} /> : null}
      {isError ? <ErrorState error={error} /> : null}
      {!isPending && !isError && count === 0 ? (
        <EmptyState variant="xs" title="None in this repository." />
      ) : null}
      {!isPending && !isError && count > 0 ? children : null}
    </ExpandableSection>
  );
}

export function RepositoryContentTab({ repository }: { repository: RpmRepository }) {
  const [isUploadCompsOpen, setIsUploadCompsOpen] = useState(false);
  const repositoryVersion = repository.latest_version_href;
  const params = { limit: 100, offset: 0, repository_version: repositoryVersion };

  const groupsQuery = useQuery({
    queryKey: ["pulp", "rpm", "packagegroups", params],
    queryFn: () => listRpmPackageGroups(params),
  });
  const categoriesQuery = useQuery({
    queryKey: ["pulp", "rpm", "packagecategories", params],
    queryFn: () => listRpmPackageCategories(params),
  });
  const environmentsQuery = useQuery({
    queryKey: ["pulp", "rpm", "packageenvironments", params],
    queryFn: () => listRpmPackageEnvironments(params),
  });
  const langpacksQuery = useQuery({
    queryKey: ["pulp", "rpm", "packagelangpacks", params],
    queryFn: () => listRpmPackageLangpacks(params),
  });
  const modulemdsQuery = useQuery({
    queryKey: ["pulp", "rpm", "modulemds", params],
    queryFn: () => listRpmModulemds(params),
  });
  const modulemdDefaultsQuery = useQuery({
    queryKey: ["pulp", "rpm", "modulemd_defaults", params],
    queryFn: () => listRpmModulemdDefaults(params),
  });
  const modulemdObsoletesQuery = useQuery({
    queryKey: ["pulp", "rpm", "modulemd_obsoletes", params],
    queryFn: () => listRpmModulemdObsoletes(params),
  });
  const distributionTreesQuery = useQuery({
    queryKey: ["pulp", "rpm", "distribution_trees", params],
    queryFn: () => listRpmDistributionTrees(params),
  });
  const repoMetadataFilesQuery = useQuery({
    queryKey: ["pulp", "rpm", "repo_metadata_files", params],
    queryFn: () => listRpmRepoMetadataFiles(params),
  });

  const langpackMatches = Object.entries(langpacksQuery.data?.results[0]?.matches ?? {});

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Button onClick={() => setIsUploadCompsOpen(true)}>Upload comps.xml</Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <ContentSection
        title="Package groups"
        isPending={groupsQuery.isPending}
        isError={groupsQuery.isError}
        error={groupsQuery.error}
        count={groupsQuery.data?.count ?? 0}
      >
        <Table aria-label="Package groups" variant="compact">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Packages</Th>
              <Th>Default</Th>
            </Tr>
          </Thead>
          <Tbody>
            {groupsQuery.data?.results.map((group) => (
              <Tr key={group.pulp_href}>
                <Td dataLabel="ID">{group.id}</Td>
                <Td dataLabel="Name">{group.name}</Td>
                <Td dataLabel="Packages">{group.packages.length}</Td>
                <Td dataLabel="Default">{group.default ? "Yes" : "No"}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      <ContentSection
        title="Package categories"
        isPending={categoriesQuery.isPending}
        isError={categoriesQuery.isError}
        error={categoriesQuery.error}
        count={categoriesQuery.data?.count ?? 0}
      >
        <Table aria-label="Package categories" variant="compact">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Groups</Th>
            </Tr>
          </Thead>
          <Tbody>
            {categoriesQuery.data?.results.map((category) => (
              <Tr key={category.pulp_href}>
                <Td dataLabel="ID">{category.id}</Td>
                <Td dataLabel="Name">{category.name}</Td>
                <Td dataLabel="Groups">{category.group_ids.length}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      <ContentSection
        title="Package environments"
        isPending={environmentsQuery.isPending}
        isError={environmentsQuery.isError}
        error={environmentsQuery.error}
        count={environmentsQuery.data?.count ?? 0}
      >
        <Table aria-label="Package environments" variant="compact">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Groups</Th>
              <Th>Options</Th>
            </Tr>
          </Thead>
          <Tbody>
            {environmentsQuery.data?.results.map((env) => (
              <Tr key={env.pulp_href}>
                <Td dataLabel="ID">{env.id}</Td>
                <Td dataLabel="Name">{env.name}</Td>
                <Td dataLabel="Groups">{env.group_ids.length}</Td>
                <Td dataLabel="Options">{env.option_ids.length}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      <ContentSection
        title="Package langpacks"
        isPending={langpacksQuery.isPending}
        isError={langpacksQuery.isError}
        error={langpacksQuery.error}
        count={langpackMatches.length}
      >
        <Table aria-label="Package langpacks" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Pattern</Th>
            </Tr>
          </Thead>
          <Tbody>
            {langpackMatches.map(([name, pattern]) => (
              <Tr key={name}>
                <Td dataLabel="Name">{name}</Td>
                <Td dataLabel="Pattern">{pattern}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      <ContentSection
        title="Modulemd"
        isPending={modulemdsQuery.isPending}
        isError={modulemdsQuery.isError}
        error={modulemdsQuery.error}
        count={modulemdsQuery.data?.count ?? 0}
      >
        <Table aria-label="Modulemd" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Stream</Th>
              <Th>Version</Th>
              <Th>Arch</Th>
              <Th>Context</Th>
            </Tr>
          </Thead>
          <Tbody>
            {modulemdsQuery.data?.results.map((m) => (
              <Tr key={m.pulp_href}>
                <Td dataLabel="Name">{m.name}</Td>
                <Td dataLabel="Stream">{m.stream}</Td>
                <Td dataLabel="Version">{m.version}</Td>
                <Td dataLabel="Arch">{m.arch}</Td>
                <Td dataLabel="Context">{m.context}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      <ContentSection
        title="Modulemd defaults"
        isPending={modulemdDefaultsQuery.isPending}
        isError={modulemdDefaultsQuery.isError}
        error={modulemdDefaultsQuery.error}
        count={modulemdDefaultsQuery.data?.count ?? 0}
      >
        <Table aria-label="Modulemd defaults" variant="compact">
          <Thead>
            <Tr>
              <Th>Module</Th>
              <Th>Default stream</Th>
            </Tr>
          </Thead>
          <Tbody>
            {modulemdDefaultsQuery.data?.results.map((d) => (
              <Tr key={d.pulp_href}>
                <Td dataLabel="Module">{d.module}</Td>
                <Td dataLabel="Default stream">{d.stream}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      <ContentSection
        title="Modulemd obsoletes"
        isPending={modulemdObsoletesQuery.isPending}
        isError={modulemdObsoletesQuery.isError}
        error={modulemdObsoletesQuery.error}
        count={modulemdObsoletesQuery.data?.count ?? 0}
      >
        <Table aria-label="Modulemd obsoletes" variant="compact">
          <Thead>
            <Tr>
              <Th>Module</Th>
              <Th>Stream</Th>
              <Th>Message</Th>
              <Th>Obsoleted by</Th>
            </Tr>
          </Thead>
          <Tbody>
            {modulemdObsoletesQuery.data?.results.map((o) => (
              <Tr key={o.pulp_href}>
                <Td dataLabel="Module">{o.module_name}</Td>
                <Td dataLabel="Stream">{o.module_stream}</Td>
                <Td dataLabel="Message">{o.message}</Td>
                <Td dataLabel="Obsoleted by">
                  {o.obsoleted_by_module_name
                    ? `${o.obsoleted_by_module_name}:${o.obsoleted_by_module_stream}`
                    : "—"}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      <ContentSection
        title="Distribution trees"
        isPending={distributionTreesQuery.isPending}
        isError={distributionTreesQuery.isError}
        error={distributionTreesQuery.error}
        count={distributionTreesQuery.data?.count ?? 0}
      >
        <Table aria-label="Distribution trees" variant="compact">
          <Thead>
            <Tr>
              <Th>Release</Th>
              <Th>Version</Th>
              <Th>Arch</Th>
            </Tr>
          </Thead>
          <Tbody>
            {distributionTreesQuery.data?.results.map((tree) => (
              <Tr key={tree.pulp_href}>
                <Td dataLabel="Release">{tree.release_name}</Td>
                <Td dataLabel="Version">{tree.release_version}</Td>
                <Td dataLabel="Arch">{tree.arch}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      <ContentSection
        title="Repo metadata files"
        isPending={repoMetadataFilesQuery.isPending}
        isError={repoMetadataFilesQuery.isError}
        error={repoMetadataFilesQuery.error}
        count={repoMetadataFilesQuery.data?.count ?? 0}
      >
        <Table aria-label="Repo metadata files" variant="compact">
          <Thead>
            <Tr>
              <Th>Data type</Th>
              <Th>Relative path</Th>
            </Tr>
          </Thead>
          <Tbody>
            {repoMetadataFilesQuery.data?.results.map((file) => (
              <Tr key={file.pulp_href}>
                <Td dataLabel="Data type">{file.data_type}</Td>
                <Td dataLabel="Relative path">{file.relative_path}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ContentSection>

      {isUploadCompsOpen ? (
        <UploadCompsModal
          repositoryHref={repository.pulp_href}
          repositoryName={repository.name}
          invalidateKeys={[
            rpmRepositoryByNameKey(repository.name),
            rpmRepositoryVersionsKey(repository.versions_href),
          ]}
          onClose={() => setIsUploadCompsOpen(false)}
        />
      ) : null}
    </>
  );
}
