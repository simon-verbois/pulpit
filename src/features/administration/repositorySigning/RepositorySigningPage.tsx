import { useState } from "react";
import { Divider, PageSection, Stack, StackItem } from "@patternfly/react-core";

import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { useSigningSettingsQuery } from "./useSigningSettingsQuery";
import { GenerateKeyModal } from "./GenerateKeyModal";
import { RepositorySigningGeneralSection } from "./RepositorySigningGeneralSection";
import { RepositorySigningKeysSection } from "./RepositorySigningKeysSection";

export function RepositorySigningPage() {
  const settingsQuery = useSigningSettingsQuery();
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  return (
    <>
      <PageHeader
        title="Repository Signing"
        description="Manage the GPG key used to sign RPM packages and repository metadata, including automatic key rotation."
      />

      {settingsQuery.isPending ? (
        <PageSection hasBodyWrapper={false}>
          <LoadingState label="Loading signing configuration" />
        </PageSection>
      ) : null}

      {settingsQuery.isError ? (
        <PageSection hasBodyWrapper={false}>
          <ErrorState
            error={settingsQuery.error}
            onRetry={() => settingsQuery.refetch()}
          />
        </PageSection>
      ) : null}

      {settingsQuery.data ? (
        <PageSection hasBodyWrapper={false}>
          <Stack hasGutter>
            <StackItem>
              <RepositorySigningGeneralSection />
            </StackItem>
            <StackItem>
              <Divider />
            </StackItem>
            <StackItem>
              <RepositorySigningKeysSection
                onGenerateKey={() => setShowGenerateModal(true)}
              />
            </StackItem>
          </Stack>
        </PageSection>
      ) : null}

      {showGenerateModal ? (
        <GenerateKeyModal onClose={() => setShowGenerateModal(false)} />
      ) : null}
    </>
  );
}
