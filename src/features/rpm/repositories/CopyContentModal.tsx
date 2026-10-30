import {
  CopyContentDialog,
  type CopyDialogProps,
} from "../../../components/CopyContentDialog";
import { listAllRpmRepositories } from "../../../api/client/rpm/repositories";
import { useCopyContentMutation } from "./useCopyContentMutation";

export function CopyContentModal(props: CopyDialogProps) {
  const mutation = useCopyContentMutation();
  return (
    <CopyContentDialog
      {...props}
      kind="rpm"
      loadRepositories={listAllRpmRepositories}
      copy={mutation.mutateAsync}
      isPending={mutation.isPending}
      error={mutation.isError ? mutation.error : undefined}
    />
  );
}
