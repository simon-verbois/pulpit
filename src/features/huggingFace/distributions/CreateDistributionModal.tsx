import { DistributionEditor } from "../../../components/DistributionEditor";

interface CreateDistributionModalProps {
  repositoryHref: string;
  repositoryName: string;
  onClose: () => void;
}

export function CreateDistributionModal(props: CreateDistributionModalProps) {
  return <DistributionEditor kind="huggingFace" {...props} />;
}
