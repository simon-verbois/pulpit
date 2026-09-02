import type { SigningKey } from "../../../api/client/pulpitCore/types";

// RETIRING and RETIRED are both simply "no longer active" from a user's point of
// view - the old key stops being served the instant a new one is published, and
// RETIRING -> RETIRED after key_retention_days is a record-keeping-only distinction
// (docs/signing.md "Publishing: what actually happens"). Collapsing both into one
// "Inactive" label avoids implying a real difference that isn't there.
export const SIGNING_KEY_STATE_LABEL: Record<SigningKey["state"], string> = {
  active: "ACTIVE",
  next: "NEXT",
  retiring: "INACTIVE",
  retired: "INACTIVE",
};

export const SIGNING_KEY_STATE_COLOR: Record<
  SigningKey["state"],
  "green" | "blue" | "grey"
> = {
  active: "green",
  next: "blue",
  retiring: "grey",
  retired: "grey",
};
