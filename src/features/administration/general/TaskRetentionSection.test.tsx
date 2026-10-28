import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { TaskRetentionSection } from "./TaskRetentionSection";

const SETTINGS_URL = "/pulpit-core/api/v1/task_retention/settings";

describe("TaskRetentionSection", () => {
  it.each(["success", "failed"] as const)(
    "refreshes purge diagnostics on %s after the modal is closed",
    async (outcome) => {
      const id = "44444444-4444-4444-4444-444444444444";
      let status = "running";
      let settingsReads = 0;
      server.use(
        http.get(SETTINGS_URL, () => {
          settingsReads++;
          return HttpResponse.json({
            enabled: true,
            retention_days: 90,
            last_run_at: status === "running" ? null : "2026-10-28T00:00:00Z",
            last_run_error: status === "failed" ? "upstream purge failure" : null,
          });
        }),
        http.post("/pulpit-core/api/v1/task_retention/purge", () =>
          HttpResponse.json({ id, status: "queued" }, { status: 202 }),
        ),
        http.get(`/pulpit-core/api/v1/jobs/${id}`, () =>
          HttpResponse.json({
            id,
            job_type: "task_retention.purge",
            status,
            error: null,
          }),
        ),
      );
      const { client } = renderApp(<TaskRetentionSection />, { withTasksDrawer: true });
      fireEvent.click(await screen.findByRole("button", { name: "Purge now" }));
      fireEvent.click(screen.getByRole("button", { name: "Purge" }));
      await waitFor(() =>
        expect(client.getQueryData(["pulpit-core", "job", id])).toMatchObject({
          status: "running",
        }),
      );
      expect(settingsReads).toBe(1);
      expect(screen.getByRole("button", { name: /Purge$/ })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      status = outcome;
      await client.invalidateQueries({ queryKey: ["pulpit-core", "job", id] });

      if (outcome === "failed") {
        expect(await screen.findByText("upstream purge failure")).toBeInTheDocument();
      } else {
        await waitFor(() =>
          expect(screen.getByText(/Last purge ran/)).toBeInTheDocument(),
        );
      }
      expect(settingsReads).toBeGreaterThanOrEqual(2);
    },
  );
  it("defaults to automatic deletion after 90 days", async () => {
    renderApp(<TaskRetentionSection />);

    expect(await screen.findByRole("switch", { name: /Delete old tasks/ })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Keep tasks for (days)" })).toHaveValue(
      90,
    );
    expect(screen.getByText("The purge has not run yet.")).toBeInTheDocument();
  });

  it("saves a changed retention period", async () => {
    let body: unknown;
    server.use(
      http.patch(SETTINGS_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          enabled: true,
          retention_days: 30,
          last_run_at: null,
          last_run_error: null,
        });
      }),
    );
    renderApp(<TaskRetentionSection />);

    const input = await screen.findByRole("spinbutton", {
      name: "Keep tasks for (days)",
    });
    fireEvent.change(input, { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save retention" }));

    await waitFor(() => expect(body).toEqual({ enabled: true, retention_days: 30 }));
  });

  it("surfaces a failed last purge", async () => {
    server.use(
      http.get(SETTINGS_URL, () =>
        HttpResponse.json({
          enabled: true,
          retention_days: 90,
          last_run_at: "2026-10-27T00:00:00Z",
          last_run_error: "Pulp returned 403",
        }),
      ),
    );
    renderApp(<TaskRetentionSection />);

    expect(await screen.findByText("The last purge failed")).toBeInTheDocument();
    expect(screen.getByText("Pulp returned 403")).toBeInTheDocument();
  });

  it("asks for confirmation before purging, then queues the job", async () => {
    let purged = false;
    server.use(
      http.post("/pulpit-core/api/v1/task_retention/purge", () => {
        purged = true;
        return HttpResponse.json(
          {
            id: "44444444-4444-4444-4444-444444444444",
            job_type: "task_retention.purge",
            status: "queued",
            payload: {},
            result: null,
            error: null,
            created_at: "2026-10-28T00:00:00Z",
          },
          { status: 202 },
        );
      }),
      http.get("/pulpit-core/api/v1/jobs/44444444-4444-4444-4444-444444444444", () =>
        HttpResponse.json({
          id: "44444444-4444-4444-4444-444444444444",
          job_type: "task_retention.purge",
          status: "success",
          payload: {},
          result: {},
          error: null,
          created_at: "2026-10-28T00:00:00Z",
        }),
      ),
    );
    renderApp(<TaskRetentionSection />);

    fireEvent.click(await screen.findByRole("button", { name: "Purge now" }));
    expect(screen.getByText(/permanently deleted from/)).toBeInTheDocument();
    expect(purged).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Purge" }));
    expect(await screen.findByText("Purge completed")).toBeInTheDocument();
    expect(purged).toBe(true);
  });
});
