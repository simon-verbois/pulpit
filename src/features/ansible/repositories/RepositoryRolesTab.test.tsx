import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { ANSIBLE_REPO_FIXTURE, ANSIBLE_ROLE_FIXTURE } from "../../../test/handlers";
import { RepositoryRolesTab } from "./RepositoryRolesTab";

describe("RepositoryRolesTab", () => {
  it(
    "uploads a role - VERIFIED live: 201, synchronous (no task), two-step artifact-then-content " +
      "flow unlike collection upload",
    async () => {
      // The tab's query key is only invalidated by a repository_version
      // change (mirroring RPM's package-upload test), so assert the
      // request the upload actually sends rather than a table refresh the
      // mock doesn't simulate.
      let requestBody: unknown;
      server.use(
        http.post("/pulp/api/v3/content/ansible/roles/", async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(
            {
              ...ANSIBLE_ROLE_FIXTURE,
              pulp_href: "/pulp/api/v3/content/ansible/roles/role-2/",
            },
            { status: 201 },
          );
        }),
      );

      renderApp(<RepositoryRolesTab repository={ANSIBLE_REPO_FIXTURE} />);

      expect(await screen.findByText(ANSIBLE_ROLE_FIXTURE.name)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Upload role" }));

      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Namespace", { exact: false }), {
        target: { value: "pulpit_test" },
      });
      // "Name" is a substring of "Namespace" and PatternFly appends a
      // required-marker to the label text, so match the start of the label
      // instead of doing an exact or plain substring match.
      fireEvent.change(within(dialog).getByLabelText(/^Name\b/), {
        target: { value: "newrole" },
      });
      fireEvent.change(within(dialog).getByLabelText("Version", { exact: false }), {
        target: { value: "1.0.0" },
      });
      const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["role-bytes"], "newrole-1.0.0.tar.gz", {
        type: "application/gzip",
      });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole("button", { name: "Upload" });
      await waitFor(() => expect(uploadButton).not.toBeDisabled());
      fireEvent.click(uploadButton);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(requestBody).toMatchObject({
        name: "newrole",
        namespace: "pulpit_test",
        version: "1.0.0",
      });
    },
  );
});
