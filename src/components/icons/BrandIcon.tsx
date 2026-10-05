import type { CSSProperties } from "react";
import {
  siAnsible,
  siApachemaven,
  siDebian,
  siDocker,
  siFiles,
  siHuggingface,
  siLinuxcontainers,
  siLinuxserver,
  siNpm,
  siPostgresql,
  siPython,
  siRedis,
  siRedhat,
  siRubygems,
  type SimpleIcon,
} from "simple-icons";

export type BrandIconName =
  | "ansible"
  | "container"
  | "database"
  | "deb"
  | "file"
  | "gem"
  | "hugging_face"
  | "maven"
  | "npm"
  | "python"
  | "redis"
  | "rpm"
  | "server"
  | "storage";

const BRAND_ICONS: Record<BrandIconName, SimpleIcon> = {
  ansible: siAnsible,
  container: siDocker,
  database: siPostgresql,
  deb: siDebian,
  file: siFiles,
  gem: siRubygems,
  hugging_face: siHuggingface,
  maven: siApachemaven,
  npm: siNpm,
  python: siPython,
  redis: siRedis,
  rpm: siRedhat,
  server: siLinuxserver,
  storage: siLinuxcontainers,
};

interface BrandIconProps {
  name: BrandIconName;
  size?: number | string;
  /** Use the official brand color; otherwise the icon inherits currentColor. */
  branded?: boolean;
  className?: string;
  title?: string;
}

/** Locally bundled logos sourced exclusively from the official Simple Icons package. */
export function BrandIcon({
  name,
  size = "1em",
  branded = false,
  className,
  title,
}: BrandIconProps) {
  const icon = BRAND_ICONS[name];
  const style: CSSProperties = {
    inlineSize: size,
    blockSize: size,
    color: branded ? `#${icon.hex}` : undefined,
    flex: "0 0 auto",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      style={style}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={icon.path} />
    </svg>
  );
}
