import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, ModalBody, ModalHeader } from "@patternfly/react-core";
import {
  distributionKindFromHref,
  getDistribution,
} from "../api/client/distributionManagement";
import { DistributionEditor } from "./DistributionEditor";
import { TaskActionButton } from "./TaskActionButton";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";

export function EditDistributionButton({
  distributionHref,
  repositoryHref,
  repositoryName,
}: {
  distributionHref: string;
  repositoryHref: string;
  repositoryName: string;
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["pulp", "distribution-detail", distributionHref],
    queryFn: () => getDistribution(distributionHref),
    enabled: open,
  });
  return (
    <>
      <TaskActionButton
        resourceHref={distributionHref}
        taskAction="edit-distribution"
        variant="link"
        onClick={() => setOpen(true)}
      >
        Edit
      </TaskActionButton>
      {open && query.isSuccess ? (
        <DistributionEditor
          kind={distributionKindFromHref(distributionHref)}
          repositoryHref={repositoryHref}
          repositoryName={repositoryName}
          initial={query.data}
          onClose={() => setOpen(false)}
        />
      ) : null}
      {open && !query.isSuccess ? (
        <Modal
          isOpen
          onClose={() => setOpen(false)}
          aria-labelledby="edit-distribution-loading-title"
          variant="medium"
        >
          <ModalHeader
            title="Edit distribution"
            labelId="edit-distribution-loading-title"
          />
          <ModalBody>
            {query.isPending ? (
              <LoadingState label="Loading distribution" />
            ) : (
              <ErrorState error={query.error} onRetry={() => query.refetch()} />
            )}
          </ModalBody>
        </Modal>
      ) : null}
    </>
  );
}
