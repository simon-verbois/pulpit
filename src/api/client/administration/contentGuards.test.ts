import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { HEADER_GUARD_FIXTURE, RBAC_GUARD_FIXTURE } from "../../../test/handlers";
import {
  contentGuardKindFromPrn,
  createContentGuardByKind,
  deleteContentGuard,
  getContentGuardByName,
  getContentGuardDetail,
  listAllContentGuards,
  listContentGuards,
  updateContentGuardByKind,
} from "./contentGuards";
import type { HeaderContentGuard } from "./types";

const GENERIC_BASE = "/pulp/api/v3/contentguards/";

describe("contentGuardKindFromPrn", () => {
  it("maps every VERIFIED live prn content-type to its flavor and label", () => {
    expect(contentGuardKindFromPrn("prn:core.headercontentguard:abc")).toEqual({
      kind: "header",
      label: "Header",
    });
    expect(contentGuardKindFromPrn("prn:core.rbaccontentguard:abc")).toEqual({
      kind: "rbac",
      label: "RBAC",
    });
    expect(contentGuardKindFromPrn("prn:core.contentredirectcontentguard:abc")).toEqual({
      kind: "content_redirect",
      label: "Content redirect",
    });
    expect(contentGuardKindFromPrn("prn:core.compositecontentguard:abc")).toEqual({
      kind: "composite",
      label: "Composite",
    });
    expect(contentGuardKindFromPrn("prn:certguard.x509certguard:abc")).toEqual({
      kind: "x509",
      label: "X.509 certificate",
    });
    expect(contentGuardKindFromPrn("prn:certguard.rhsmcertguard:abc")).toEqual({
      kind: "rhsm",
      label: "RHSM certificate",
    });
  });

  it("returns null for an unrecognized content type", () => {
    expect(contentGuardKindFromPrn("prn:rpm.rpmrepository:abc")).toBeNull();
  });
});

describe("content guards adapter", () => {
  it("lists guards generically (base fields only) with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(GENERIC_BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: HEADER_GUARD_FIXTURE.pulp_href,
              prn: HEADER_GUARD_FIXTURE.prn,
              name: HEADER_GUARD_FIXTURE.name,
              description: HEADER_GUARD_FIXTURE.description,
            },
            {
              pulp_href: RBAC_GUARD_FIXTURE.pulp_href,
              prn: RBAC_GUARD_FIXTURE.prn,
              name: RBAC_GUARD_FIXTURE.name,
              description: RBAC_GUARD_FIXTURE.description,
            },
          ],
        });
      }),
    );

    const page = await listContentGuards({ limit: 10, offset: 0 });

    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toHaveLength(2);
  });

  it("looks up a guard by exact name", async () => {
    const guard = await getContentGuardByName(HEADER_GUARD_FIXTURE.name);
    expect(guard?.pulp_href).toBe(HEADER_GUARD_FIXTURE.pulp_href);
  });

  it("fetches every page for listAllContentGuards", async () => {
    const guards = await listAllContentGuards();
    expect(guards).toHaveLength(2);
  });

  it("deletes a guard synchronously (VERIFIED live: 204) regardless of flavor", async () => {
    await expect(
      deleteContentGuard(HEADER_GUARD_FIXTURE.pulp_href),
    ).resolves.toBeUndefined();
    await expect(
      deleteContentGuard(RBAC_GUARD_FIXTURE.pulp_href),
    ).resolves.toBeUndefined();
  });

  it("fetches flavor-specific detail via the guard's own href", async () => {
    const detail = await getContentGuardDetail<HeaderContentGuard>(
      HEADER_GUARD_FIXTURE.pulp_href,
    );
    expect(detail.header_name).toBe(HEADER_GUARD_FIXTURE.header_name);
  });

  it("dispatches create/update by kind for the generic modal call sites", async () => {
    const created = (await createContentGuardByKind("header", {
      name: "dispatched-guard",
      header_name: "X-Dispatched",
      header_value: "v",
    })) as HeaderContentGuard;
    expect(created.header_name).toBe("X-Dispatched");

    const updated = (await updateContentGuardByKind(created.pulp_href, {
      header_value: "v2",
    })) as HeaderContentGuard;
    expect(updated.header_value).toBe("v2");
  });
});
