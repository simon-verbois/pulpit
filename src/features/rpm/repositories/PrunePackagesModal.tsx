import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import { listAllRpmRepositories } from "../../../api/client/rpm/repositories";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { usePrunePackagesMutation } from "./usePrunePackagesMutation";

export function PrunePackagesModal({ onClose }: { onClose: () => void }) {
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [keepDays, setKeepDays] = useState("14");
  // On by default - a first run should never be destructive by accident.
  const [dryRun, setDryRun] = useState(true);
  const pruneMutation = usePrunePackagesMutation();

  const repositoriesQuery = useQuery({
    queryKey: ["pulp", "rpm", "repositories", "all"],
    queryFn: listAllRpmRepositories,
  });

  const toggleRepo = (href: string) => {
    setSelectedRepos((current) => {
      const next = new Set(current);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const keepDaysNumber = Number(keepDays);
  const isValid =
    selectedRepos.size > 0 && Number.isFinite(keepDaysNumber) && keepDaysNumber >= 0;

  const handleSubmit = () => {
    if (!isValid) {
      return;
    }
    pruneMutation.mutate(
      { repo_hrefs: [...selectedRepos], keep_days: keepDaysNumber, dry_run: dryRun },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="prune-packages-title"
      variant="medium"
    >
      <ModalHeader title="Prune packages" labelId="prune-packages-title" />
      <ModalBody>
        <Form>
          {pruneMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                pruneMutation.error instanceof PulpApiError
                  ? pruneMutation.error.message
                  : "Could not start pruning."
              }
            />
          ) : null}
          <FormGroup label="Repositories" isRequired fieldId="prune-repositories">
            <div style={{ maxHeight: "12rem", overflowY: "auto" }}>
              {(repositoriesQuery.data ?? []).map((repo) => (
                <Checkbox
                  key={repo.pulp_href}
                  id={`prune-repo-${repo.pulp_href}`}
                  label={repo.name}
                  isChecked={selectedRepos.has(repo.pulp_href)}
                  onChange={() => toggleRepo(repo.pulp_href)}
                />
              ))}
            </div>
          </FormGroup>
          <FormGroup
            label="Keep packages synced/added within the last N days"
            isRequired
            fieldId="prune-keep-days"
          >
            <TextInput
              id="prune-keep-days"
              type="number"
              min={0}
              value={keepDays}
              onChange={(_event, value) => setKeepDays(value)}
            />
          </FormGroup>
          <FormGroup fieldId="prune-dry-run">
            <Checkbox
              id="prune-dry-run"
              label="Dry run (report what would be pruned, without actually removing anything)"
              isChecked={dryRun}
              onChange={(_event, checked) => setDryRun(checked)}
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
              isDisabled={!isValid || pruneMutation.isPending}
              isLoading={pruneMutation.isPending}
              onClick={handleSubmit}
            >
              {dryRun ? "Run dry run" : "Prune"}
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
