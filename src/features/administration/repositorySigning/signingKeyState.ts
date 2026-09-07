import type { SigningKey } from "../../../api/client/pulpitCore/types";

// RETIRING and RETIRED are both "no longer active" from a user's point of view;
// collapsing both into one "Inactive" label avoids implying a difference that isn't there.
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
