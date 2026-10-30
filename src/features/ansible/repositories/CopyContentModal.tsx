import {
  CopyContentDialog,
  type CopyDialogProps,
} from "../../../components/CopyContentDialog";
import { listAllAnsibleRepositories } from "../../../api/client/ansible/repositories";
import { useCopyContentMutation } from "./useCopyContentMutation";

export function CopyContentModal(props: CopyDialogProps) {
  const mutation = useCopyContentMutation();
  return (
    <CopyContentDialog
      {...props}
      kind="ansible"
      loadRepositories={listAllAnsibleRepositories}
      copy={mutation.mutateAsync}
      isPending={mutation.isPending}
      error={mutation.isError ? mutation.error : undefined}
    />
  );
}
