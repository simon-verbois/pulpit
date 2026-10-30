import {
  CopyContentDialog,
  type CopyDialogProps,
} from "../../../components/CopyContentDialog";
import { listAllContainerRepositories } from "../../../api/client/container/repositories";
import { useCopyContentMutation } from "./useCopyContentMutation";

export function CopyContentModal(props: CopyDialogProps) {
  const mutation = useCopyContentMutation();
  return (
    <CopyContentDialog
      {...props}
      kind="container"
      loadRepositories={listAllContainerRepositories}
      copy={mutation.mutateAsync}
      isPending={mutation.isPending}
      error={mutation.isError ? mutation.error : undefined}
    />
  );
}
