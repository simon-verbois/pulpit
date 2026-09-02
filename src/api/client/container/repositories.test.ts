import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  CONTAINER_REPO_FIXTURE,
  CONTAINER_VERSION_FIXTURES,
} from "../../../test/handlers";
import {
  copyContainerManifests,
  copyContainerTags,
  createContainerRepository,
  deleteContainerRepository,
  getContainerRepositoryByName,
  listAllContainerRepositories,
  listContainerRepositories,
  listRepositoryVersions,
  syncContainerRepository,
  tagContainerImage,
  untagContainerImage,
  updateContainerRepository,
} from "./repositories";

const BASE = "/pulp/api/v3/repositories/container/container/";
const CONTAINER_REPO_BASE_ID = CONTAINER_REPO_FIXTURE.pulp_href;

describe("container repositories adapter", () => {
  it("lists repositories with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [CONTAINER_REPO_FIXTURE],
        });
      }),
    );

    const page = await listContainerRepositories({ limit: 10, offset: 20 });

    expect(requestedUrl).toContain("limit=10");
    expect(requestedUrl).toContain("offset=20");
    expect(page.results).toEqual([CONTAINER_REPO_FIXTURE]);
  });

  it("looks up a repository by exact name and returns the first result", async () => {
    const repo = await getContainerRepositoryByName(CONTAINER_REPO_FIXTURE.name);
    expect(repo).toEqual(CONTAINER_REPO_FIXTURE);
  });

  it("returns null (not undefined) when no repository matches the name", async () => {
    const repo = await getContainerRepositoryByName("does-not-exist");
    expect(repo).toBeNull();
  });

  it("fetches every page for listAllContainerRepositories", async () => {
    const repos = await listAllContainerRepositories();
    expect(repos).toEqual([CONTAINER_REPO_FIXTURE]);
  });

  it("creates a repository synchronously (201, no task)", async () => {
    const repo = await createContainerRepository({ name: "new-repo" });
    expect(repo.name).toBe("new-repo");
  });

  it("deletes a repository asynchronously (202 + task)", async () => {
    const result = await deleteContainerRepository(CONTAINER_REPO_FIXTURE.pulp_href);
    expect(result.task).toBeDefined();
  });

  it("updates a repository asynchronously (VERIFIED: 202 + task, unlike create)", async () => {
    const result = await updateContainerRepository(CONTAINER_REPO_FIXTURE.pulp_href, {
      description: "updated",
    });
    expect(result.task).toBeDefined();
  });

  it("syncs a repository", async () => {
    const result = await syncContainerRepository(CONTAINER_REPO_FIXTURE.pulp_href);
    expect(result.task).toBeDefined();
  });

  it("lists repository versions filtered by the versions href", async () => {
    const page = await listRepositoryVersions(CONTAINER_REPO_FIXTURE.versions_href, {
      limit: 10,
      offset: 0,
    });
    expect(page.results).toEqual(CONTAINER_VERSION_FIXTURES);
  });

  it("tags an image with the given tag name and manifest digest", async () => {
    let requestBody: unknown;
    server.use(
      http.post(`${CONTAINER_REPO_BASE_ID}tag/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/tag-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await tagContainerImage(CONTAINER_REPO_FIXTURE.pulp_href, {
      tag: "latest",
      digest: "sha256:abc",
    });

    expect(requestBody).toEqual({ tag: "latest", digest: "sha256:abc" });
    expect(result.task).toBe("/pulp/api/v3/tasks/tag-task/");
  });

  it("untags a tag by name", async () => {
    let requestBody: unknown;
    server.use(
      http.post(`${CONTAINER_REPO_BASE_ID}untag/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/untag-task/" },
          { status: 202 },
        );
      }),
    );

    await untagContainerImage(CONTAINER_REPO_FIXTURE.pulp_href, "latest");

    expect(requestBody).toEqual({ tag: "latest" });
  });

  it("copies tags from a source repository version", async () => {
    let requestBody: unknown;
    server.use(
      http.post(`${CONTAINER_REPO_BASE_ID}copy_tags/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/copy-tags-task/" },
          { status: 202 },
        );
      }),
    );

    await copyContainerTags(CONTAINER_REPO_FIXTURE.pulp_href, "/some/version/1/");

    expect(requestBody).toEqual({ source_repository_version: "/some/version/1/" });
  });

  it("copies manifests from a source repository version", async () => {
    let requestBody: unknown;
    server.use(
      http.post(`${CONTAINER_REPO_BASE_ID}copy_manifests/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/copy-manifests-task/" },
          { status: 202 },
        );
      }),
    );

    await copyContainerManifests(CONTAINER_REPO_FIXTURE.pulp_href, "/some/version/1/");

    expect(requestBody).toEqual({ source_repository_version: "/some/version/1/" });
  });
});
