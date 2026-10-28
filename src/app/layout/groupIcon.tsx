import { BrandIcon, type BrandIconName } from "../../components/icons/BrandIcon";

const GROUP_ICONS: Record<string, BrandIconName> = {
  rpm: "rpm",
  deb: "deb",
  container: "container",
  ansible: "ansible",
  file: "file",
  hugging_face: "hugging_face",
  gem: "gem",
  maven: "maven",
  npm: "npm",
  python: "python",
};

/** The brand icon of a nav group (sidebar entry, module-visibility tile). */
export function groupIcon(id: string) {
  return GROUP_ICONS[id] ? <BrandIcon name={GROUP_ICONS[id]} branded /> : undefined;
}
