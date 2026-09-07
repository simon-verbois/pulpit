/** A single warning surfaced on the Overview page's warnings card
 * (src/components/OverviewWarnings.tsx) - the shared shape every source
 * (Pulp version compatibility, an expiring TLS certificate, ...) builds so
 * the card itself never needs to know where a warning came from. */
export interface Warning {
  id: string;
  variant: "warning" | "info";
  message: string;
}
