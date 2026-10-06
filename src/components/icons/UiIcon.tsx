import type { ReactNode, SVGProps } from "react";

export type UiIconName =
  | "api"
  | "chevron-down"
  | "close"
  | "database"
  | "download"
  | "eye"
  | "eye-off"
  | "external"
  | "help"
  | "home"
  | "kebab"
  | "menu"
  | "moon"
  | "publish"
  | "search"
  | "settings"
  | "shield-check"
  | "storage"
  | "sun"
  | "tasks"
  | "upload"
  | "user"
  | "warning"
  | "workers";

interface UiIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: UiIconName;
  size?: number | string;
}

const paths: Record<UiIconName, ReactNode> = {
  api: <path d="M8.5 8 5 12l3.5 4M15.5 8 19 12l-3.5 4M13.5 5l-3 14" />,
  "chevron-down": <path d="m7 10 5 5 5-5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  database: (
    <>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
    </>
  ),
  download: <path d="M12 3v13m0 0 5-5m-5 5-5-5M5 14v6h14v-6" />,
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  "eye-off": (
    <>
      <path d="m4 4 16 16M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8M6.2 6.3C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c.8 0 1.5-.1 2.2-.3" />
    </>
  ),
  external: (
    <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-1 .6-1.4 1.1-1.4 2.1M12 17h.01" />
    </>
  ),
  home: <path d="m3 11 9-7 9 7M5 10v10h14V10M9 20v-6h6v6" />,
  kebab: <path d="M12 5h.01M12 12h.01M12 19h.01" />,
  menu: <path d="M5 7h14M5 12h14M5 17h14" />,
  moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />,
  publish: <path d="M12 16V3m0 0L7 8m5-5 5 5M5 14v6h14v-6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  "shield-check": (
    <path d="M12 3 4.5 6v5.2c0 4.7 3.2 8.1 7.5 9.8 4.3-1.7 7.5-5.1 7.5-9.8V6L12 3Zm-3 9 2 2 4-5" />
  ),
  storage: <path d="M5 5h14l2 5v9H3v-9l2-5Zm-2 6h18M16 15h2" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  tasks: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  upload: <path d="M12 16V3m0 0L7 8m5-5 5 5M5 14v6h14v-6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  workers: <path d="M4 6h16v10H4V6Zm4 14h8M12 16v4M7 10h.01M11 10h6M7 13h.01M11 13h6" />,
};

/** Original line icons for UI actions that are not brands. */
export function UiIcon({ name, size = "1em", ...props }: UiIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden={props["aria-label"] ? undefined : true}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ inlineSize: size, blockSize: size, flex: "0 0 auto", ...props.style }}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
