import { describe, expect, it } from "vitest";
import { explainTaskFailure } from "./taskFailure";

describe("explainTaskFailure", () => {
  it("explains worker failures that only contain reason", () => {
    expect(explainTaskFailure({ reason: "Worker has gone missing." })).toMatchObject({
      title: "Pulp worker stopped responding",
      nextStep: expect.stringContaining("restarted"),
    });
  });

  it("does not claim signal 9 proves an out-of-memory failure", () => {
    const failure = explainTaskFailure({ reason: "Killed by signal 9." });
    expect(failure.title).toBe("Pulp worker was forcibly stopped");
    expect(failure.explanation).toContain("does not confirm the cause");
  });

  it("identifies timeout errors and names the affected RPM without its URL", () => {
    const failure = explainTaskFailure({
      error_code: "PLP0005",
      description:
        "Request timed out for uln://channel/getPackage/linux-firmware-1.el9.noarch.rpm. Increasing the total_timeout value on the remote might help.",
    });
    expect(failure.file).toBe("linux-firmware-1.el9.noarch.rpm");
    expect(failure.nextStep).toContain("download timeout");
    expect(failure.explanation).not.toContain("uln://");
  });

  it("handles errors with no message and unexpected field values", () => {
    for (const error of [null, undefined, {}, { reason: 42, description: {} }]) {
      expect(explainTaskFailure(error).explanation).toContain(
        "without providing an error message",
      );
    }
  });

  it("preserves an unfamiliar upstream explanation", () => {
    expect(
      explainTaskFailure({ description: "Repository version was deleted." }).explanation,
    ).toBe("Repository version was deleted.");
  });

  it.each([
    [{ reason: "MemoryError" }, "Not enough memory to finish the task"],
    [{ description: "ULN login failed after 4 attempts." }, "ULN login failed"],
    [{ description: "407 Proxy Authentication Required" }, "Proxy authentication failed"],
    [
      { description: "CERTIFICATE_VERIFY_FAILED" },
      "Secure connection could not be verified",
    ],
    [{ description: "HTTP 403 Forbidden" }, "Access was refused"],
  ])("explains known upstream failures", (error, title) => {
    expect(explainTaskFailure(error).title).toBe(title);
  });

  it("explains a refused ULN source package without leaking the URL", () => {
    const failure = explainTaskFailure({
      description:
        "403, message='Forbidden', url='https://linux-update.oracle.com/XMLRPC/GET-REQ/ol9_x86_64_baseos_latest/getPackageSource/libarchive-3.5.3-1.el9.src.rpm'",
    });
    expect(failure.title).toBe("Source package download was refused");
    expect(failure.file).toBe("libarchive-3.5.3-1.el9.src.rpm");
    expect(failure.nextStep).toContain("exclude them");
  });

  it("distinguishes a generic ULN refusal from other 403s", () => {
    expect(
      explainTaskFailure({
        description:
          "403, message='Forbidden', url='https://linux-update.oracle.com/XMLRPC/GET-REQ/ol9/getPackage/a-1.rpm'",
      }).title,
    ).toBe("Oracle ULN refused access");
  });

  it.each([
    [
      { description: "404, message='Not Found', url='https://x.test/a-1.rpm'" },
      "Remote resource not found",
    ],
    [{ description: "502, message='Bad Gateway'" }, "Remote server error"],
    [
      { description: "Cannot connect to host mirror.test:443" },
      "Remote server unreachable",
    ],
    [{ description: "[Errno 28] No space left on device" }, "Storage is full"],
    [{ description: "Checksum mismatch for /a-1.rpm" }, "Downloaded file is corrupt"],
  ])("explains common transport and storage failures", (error, title) => {
    expect(explainTaskFailure(error).title).toBe(title);
  });
});
