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
});
