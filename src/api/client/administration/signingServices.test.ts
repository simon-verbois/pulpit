import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { listSigningServices } from "./signingServices";

const BASE = "/pulp/api/v3/signing-services/";

describe("administration signing services adapter", () => {
  it("is empty by default (VERIFIED live: this dev instance has none configured)", async () => {
    const page = await listSigningServices({ limit: 10, offset: 0 });
    expect(page.results).toEqual([]);
  });

  it("lists signing services with limit/offset in the query string", async () => {
    let requestedUrl = "";
    const fixture = {
      pulp_href: `${BASE}sig-1/`,
      name: "test-signing-service",
      public_key: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
      pubkey_fingerprint: "ABCD1234",
      script: "/var/lib/pulp/scripts/sign.sh",
    };
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [fixture],
        });
      }),
    );

    const page = await listSigningServices({ limit: 10, offset: 0 });

    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([fixture]);
  });
});
