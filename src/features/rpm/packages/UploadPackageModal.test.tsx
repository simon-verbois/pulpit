import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RPM_PACKAGE_FIXTURE, RPM_REPO_FIXTURE } from "../../../test/handlers";
import { UploadPackageModal } from "./UploadPackageModal";

const UPLOAD = "/pulp/api/v3/content/rpm/packages/upload/";
const MODIFY = `${RPM_REPO_FIXTURE.pulp_href}modify/`;

function openUpload() {
  const onClose = vi.fn();
  renderApp(
    <UploadPackageModal
      repositoryHref={RPM_REPO_FIXTURE.pulp_href}
      repositoryName={RPM_REPO_FIXTURE.name}
      invalidateKeys={[["pulp", "rpm"]]}
      onClose={onClose}
    />,
    { withTasksDrawer: true },
  );
  const input = screen.getByRole("dialog").querySelector('input[type="file"]')!;
  return { input, onClose };
}

const files = () =>
  ["one.rpm", "two.rpm", "three.rpm"].map(
    (name) => new File([name], name, { type: "application/x-rpm", lastModified: 1 }),
  );

async function select(input: Element, selected: File[]) {
  fireEvent.change(input, { target: { files: selected } });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Upload" })).toBeEnabled(),
  );
}

describe("multiple RPM upload", () => {
  it("adds accepted files together, reports a partial rejection and retries only failed files", async () => {
    let uploads = 0;
    const modifications: unknown[] = [];
    server.use(
      http.post(UPLOAD, () => {
        uploads++;
        if (uploads === 2)
          return HttpResponse.json({ file: ["Invalid RPM package"] }, { status: 400 });
        return HttpResponse.json(
          {
            ...RPM_PACKAGE_FIXTURE,
            pulp_href: `/pulp/api/v3/content/rpm/packages/upload-${uploads}/`,
          },
          { status: 201 },
        );
      }),
      http.post(MODIFY, async ({ request }) => {
        modifications.push(await request.json());
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/upload-task/" },
          { status: 202 },
        );
      }),
    );
    const { input, onClose } = openUpload();
    expect(input).toHaveAttribute("multiple");
    await select(input, files());
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    const retry = await screen.findByRole("button", { name: "Retry failed files" });
    await waitFor(() => expect(retry).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/Invalid RPM package/)).toBeInTheDocument();
    expect(modifications).toEqual([
      {
        add_content_units: [
          "/pulp/api/v3/content/rpm/packages/upload-1/",
          "/pulp/api/v3/content/rpm/packages/upload-3/",
        ],
      },
    ]);
    expect(
      screen.getByText(`Add 2 RPM packages to "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
    fireEvent.click(retry);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(uploads).toBe(4);
    expect(modifications[1]).toEqual({
      add_content_units: ["/pulp/api/v3/content/rpm/packages/upload-4/"],
    });
  });

  it("retries a rejected repository submission without uploading accepted bodies again", async () => {
    let uploads = 0;
    let modifications = 0;
    server.use(
      http.post(UPLOAD, () =>
        HttpResponse.json(
          {
            ...RPM_PACKAGE_FIXTURE,
            pulp_href: `/pulp/api/v3/content/rpm/packages/retry-${++uploads}/`,
          },
          { status: 201 },
        ),
      ),
      http.post(MODIFY, () => {
        modifications++;
        return modifications === 1
          ? HttpResponse.json({ detail: "Repository is busy" }, { status: 409 })
          : HttpResponse.json(
              { task: "/pulp/api/v3/tasks/retry-upload-task/" },
              { status: 202 },
            );
      }),
    );
    const { input, onClose } = openUpload();
    await select(input, files().slice(0, 2));
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    const retry = await screen.findByRole("button", { name: "Retry failed files" });
    await waitFor(() => expect(retry).toBeEnabled());
    expect(screen.getAllByText("Repository is busy")).toHaveLength(2);
    fireEvent.click(retry);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(uploads).toBe(2);
    expect(modifications).toBe(2);
  });

  it("keeps a deduplicated queue across selections and allows removing files before upload", async () => {
    const { input } = openUpload();
    const selected = files();
    await select(input, selected.slice(0, 2));
    await select(input, selected.slice(1));
    await screen.findByText("three.rpm");
    expect(screen.getAllByText("two.rpm")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove two.rpm" }));
    expect(screen.queryByText("two.rpm")).not.toBeInTheDocument();
    fireEvent.change(input, {
      target: { files: [new File(["text"], "wrong.txt", { type: "text/plain" })] },
    });
    await screen.findByText("Select .rpm files only");
    expect(screen.getByText("one.rpm")).toBeInTheDocument();
    expect(screen.getByText("three.rpm")).toBeInTheDocument();
  });
});
