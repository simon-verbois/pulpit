import type { BrandIconName } from "../../components/icons/BrandIcon";

interface ServiceMetadata {
  label: string;
  icon: BrandIconName;
}

export const SERVICE_METADATA: Record<string, ServiceMetadata> = {
  ansible: { label: "Ansible", icon: "ansible" },
  container: { label: "Container", icon: "container" },
  deb: { label: "Debian", icon: "deb" },
  file: { label: "File", icon: "file" },
  gem: { label: "RubyGems", icon: "gem" },
  hugging_face: { label: "Hugging Face", icon: "hugging_face" },
  maven: { label: "Maven", icon: "maven" },
  npm: { label: "npm", icon: "npm" },
  python: { label: "Python", icon: "python" },
  rpm: { label: "RPM", icon: "rpm" },
};
