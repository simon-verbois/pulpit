import type { TlsCertSource } from "../../../api/client/pulpitCore/types";

export const TLS_CERT_SOURCE_LABEL: Record<TlsCertSource, string> = {
  self_signed: "Self-signed",
  manual: "Manual",
};

export const TLS_CERT_SOURCE_COLOR: Record<TlsCertSource, "orange" | "blue"> = {
  self_signed: "orange",
  manual: "blue",
};
