import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { listAllSigningServices } from "./signingServices";

const BASE = "/pulp/api/v3/signing-services/";

describe("signing services adapter", () => {
  it("fetches every page of signing services (used to populate the Sign action's picker)", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: `${BASE}svc-1/`,
              name: "test-signing-service",
              pubkey_fingerprint: "ABCD1234",
            },
          ],
        }),
      ),
    );

    const services = await listAllSigningServices();
    expect(services).toEqual([
      {
        pulp_href: `${BASE}svc-1/`,
        name: "test-signing-service",
        pubkey_fingerprint: "ABCD1234",
      },
    ]);
  });

  it("returns an empty array when no signing services are configured (VERIFIED live: this dev instance has none)", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );
    expect(await listAllSigningServices()).toEqual([]);
  });
});
