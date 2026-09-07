import { describe, expect, it } from "vitest";

import { classifyStatus, toPulpApiError } from "./PulpApiError";

describe("classifyStatus", () => {
  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not-found"],
    [400, "validation"],
    [409, "conflict"],
    [500, "backend-unavailable"],
    [502, "backend-unavailable"],
    [418, "unknown"],
  ] as const)("maps %i to %s", (status, expected) => {
    expect(classifyStatus(status)).toBe(expected);
  });
});

describe("toPulpApiError", () => {
  it("surfaces non_field_errors verbatim - VERIFIED live shape for a weak-password 400", async () => {
    const response = new Response(
      JSON.stringify({
        non_field_errors: [
          "This password is too short. It must contain at least 8 characters.",
          "This password is too common.",
        ],
      }),
      { status: 400 },
    );

    const error = await toPulpApiError(response);

    expect(error.kind).toBe("validation");
    expect(error.message).toBe(
      "This password is too short. It must contain at least 8 characters. " +
        "This password is too common.",
    );
  });

  it("prefixes a field-specific error with the humanized field name", async () => {
    const response = new Response(
      JSON.stringify({ username: ["A user with that username already exists."] }),
      { status: 400 },
    );

    const error = await toPulpApiError(response);

    expect(error.message).toBe("Username: A user with that username already exists.");
  });

  it("joins errors across multiple fields", async () => {
    const response = new Response(
      JSON.stringify({
        username: ["This field is required."],
        base_path: ["This field may not be blank."],
      }),
      { status: 400 },
    );

    const error = await toPulpApiError(response);

    expect(error.message).toBe(
      "Username: This field is required. Base path: This field may not be blank.",
    );
  });

  it("uses a plain {detail} string body as-is", async () => {
    const response = new Response(JSON.stringify({ detail: "Resource is in use." }), {
      status: 409,
    });

    const error = await toPulpApiError(response);

    expect(error.message).toBe("Resource is in use.");
  });

  it("falls back to the generic validation message when the body has nothing usable", async () => {
    const response = new Response(JSON.stringify({}), { status: 400 });

    const error = await toPulpApiError(response);

    expect(error.message).toBe("Pulp rejected the request as invalid.");
  });

  it("keeps the friendly hardcoded message for 403, even with a Pulp detail body", async () => {
    const response = new Response(
      JSON.stringify({ detail: "You do not have permission to perform this action." }),
      { status: 403 },
    );

    const error = await toPulpApiError(response);

    expect(error.message).toBe("You don't have permission to do this in Pulp.");
  });

  it("keeps the friendly hardcoded message for 404", async () => {
    const response = new Response(JSON.stringify({ detail: "Not found." }), {
      status: 404,
    });

    const error = await toPulpApiError(response);

    expect(error.message).toBe("That Pulp object could not be found.");
  });

  it("still stashes the raw body as .detail for the technical-details expansion", async () => {
    const body = { non_field_errors: ["This password is too common."] };
    const response = new Response(JSON.stringify(body), { status: 400 });

    const error = await toPulpApiError(response);

    expect(error.detail).toEqual(body);
  });
});
