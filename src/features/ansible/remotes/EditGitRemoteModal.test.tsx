import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import { renderApp } from "../../../test/renderApp";
import { server } from "../../../test/mswServer";
import { EditGitRemoteModal } from "./EditGitRemoteModal";

const remote = {
  pulp_href: "/pulp/api/v3/remotes/ansible/git/fixture/",
  name: "fixture",
  url: "https://example.invalid/collection.git",
  pulp_created: "2026-10-30",
  proxy_url: null,
  ca_cert: null,
  tls_validation: false,
  hidden_fields: [],
  git_ref: "",
  metadata_only: false,
};

for (const [original, clear, expected] of [
  ["", false, undefined],
  ["main", false, "main"],
  ["main", true, "HEAD"],
] as const) {
  it(`saves a TLS change with ref ${original || "unset"}${clear ? " cleared" : ""}`, async () => {
    let payload: Record<string, unknown> | undefined;
    server.use(
      http.patch(remote.pulp_href, async ({ request }) => {
        payload = (await request.json()) as Record<string, unknown>;
        if (payload.git_ref === null || payload.git_ref === "")
          return HttpResponse.json({ git_ref: ["Invalid ref"] }, { status: 400 });
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/fixture/" },
          { status: 202 },
        );
      }),
    );
    const onClose = vi.fn();
    renderApp(
      <EditGitRemoteModal remote={{ ...remote, git_ref: original }} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Advanced connection settings" }));
    expect(screen.getByLabelText("Ignore SSL certificate errors")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Ignore SSL certificate errors"));
    if (clear)
      fireEvent.change(screen.getByLabelText("Git ref"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(payload?.tls_validation).toBe(true);
    if (expected) expect(payload?.git_ref).toBe(expected);
    else expect(payload).not.toHaveProperty("git_ref");
  });
}
