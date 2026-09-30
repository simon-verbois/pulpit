import { apiPath, pulpFetch } from "../httpClient";

export interface RemoteTestResult {
  ok: boolean;
  detail: string;
  /** The URL actually probed (`<remote url>/repodata/repomd.xml`). */
  url: string;
}

/** Pulpit's own endpoint, served by the derived Pulp image's
 * `pulp_remote_check` plugin (deployment/docker/pulp/remote-check/) - Pulp
 * itself has no "test remote" API. It fetches the remote's repomd.xml with
 * the remote's *saved* settings (including write-only secrets like the ULN
 * password), synchronously, without syncing or storing anything. A failed
 * probe is still a 200 with `ok: false`; only access errors are non-2xx. */
export function testRpmRemote(remoteHref: string): Promise<RemoteTestResult> {
  const id = remoteHref.replace(/\/+$/, "").split("/").pop();
  return pulpFetch<RemoteTestResult>(apiPath(`/pulpit/remotes/${id}/test/`), {
    method: "POST",
  });
}
