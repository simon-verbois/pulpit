import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { TrustedCaCertificatesSection } from "./TrustedCaCertificatesSection";

const CERTIFICATES_URL = "/pulpit-core/api/v1/trusted_ca/certificates";
const JOBS_URL = "/pulpit-core/api/v1/jobs";

const TEST_PEM = "-----BEGIN CERTIFICATE-----\nMIIC...==\n-----END CERTIFICATE-----";

const CERT_FIXTURE = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "corp-proxy",
  pem: TEST_PEM,
  status: "applied",
  last_error: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function mockJob(overrides: Record<string, unknown> = {}) {
  const job = {
    id: "22222222-2222-2222-2222-222222222222",
    job_type: "trusted_ca.sync",
    status: "success",
    result: {},
    error: null,
    attempts: 1,
    scheduled_at: "2026-01-01T00:00:00Z",
    started_at: "2026-01-01T00:00:00Z",
    finished_at: "2026-01-01T00:00:00Z",
    requested_by: "admin",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
  server.use(http.get(`${JOBS_URL}/${job.id}`, () => HttpResponse.json(job)));
  return job;
}

describe("TrustedCaCertificatesSection", () => {
  it("shows an empty state when no certificates are configured", async () => {
    renderApp(<TrustedCaCertificatesSection />);

    expect(await screen.findByText("No CA certificates added yet")).toBeInTheDocument();
  });

  it("lists an existing certificate with its status", async () => {
    server.use(http.get(CERTIFICATES_URL, () => HttpResponse.json([CERT_FIXTURE])));

    renderApp(<TrustedCaCertificatesSection />);

    expect(await screen.findByText("corp-proxy")).toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
  });

  it("adds a certificate via the modal and shows the queued job's outcome", async () => {
    server.use(http.get(CERTIFICATES_URL, () => HttpResponse.json([])));
    const job = mockJob();
    server.use(
      http.post(CERTIFICATES_URL, () =>
        HttpResponse.json(
          { ...job, status: "queued", finished_at: null, started_at: null },
          { status: 202 },
        ),
      ),
    );

    renderApp(<TrustedCaCertificatesSection />);

    fireEvent.click(await screen.findByRole("button", { name: "Add CA certificate" }));

    const dialog = await screen.findByRole("dialog", { name: "Add CA certificate" });
    fireEvent.change(within(dialog).getByLabelText(/^Name\b/), {
      target: { value: "corp-proxy" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Certificate \(PEM\)/), {
      target: { value: TEST_PEM },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(
      await within(dialog).findByText("Applied to Pulp's trust store"),
    ).toBeInTheDocument();
  });

  it("shows the job's error when applying a certificate fails", async () => {
    server.use(http.get(CERTIFICATES_URL, () => HttpResponse.json([])));
    const job = mockJob({
      status: "failed",
      error: "update-ca-trust: command not found",
    });
    server.use(
      http.post(CERTIFICATES_URL, () =>
        HttpResponse.json(
          { ...job, status: "queued", finished_at: null, error: null },
          { status: 202 },
        ),
      ),
    );

    renderApp(<TrustedCaCertificatesSection />);

    fireEvent.click(await screen.findByRole("button", { name: "Add CA certificate" }));
    const dialog = await screen.findByRole("dialog", { name: "Add CA certificate" });
    fireEvent.change(within(dialog).getByLabelText(/^Name\b/), {
      target: { value: "corp-proxy" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Certificate \(PEM\)/), {
      target: { value: TEST_PEM },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(
      await within(dialog).findByText("update-ca-trust: command not found"),
    ).toBeInTheDocument();
  });

  it("deletes a certificate after confirming", async () => {
    server.use(http.get(CERTIFICATES_URL, () => HttpResponse.json([CERT_FIXTURE])));
    server.use(
      http.delete(
        `${CERTIFICATES_URL}/${CERT_FIXTURE.id}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    renderApp(<TrustedCaCertificatesSection />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete CA certificate?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
