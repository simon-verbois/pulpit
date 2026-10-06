import { fireEvent, screen } from "@testing-library/react";

/** Opens a repository detail page's header "Actions" dropdown. */
export async function openRepositoryActions() {
  fireEvent.click(await screen.findByRole("button", { name: "Actions" }));
}

/** Matches a dropdown item by its label (its accessible name also carries
 * the item's description, if any). */
export function repositoryActionName(label: string): RegExp {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
}

/** Opens the header "Actions" dropdown and clicks the item labelled `label`. */
export async function clickRepositoryAction(label: string) {
  await openRepositoryActions();
  fireEvent.click(
    await screen.findByRole("menuitem", { name: repositoryActionName(label) }),
  );
}
