// Normalized Pulp API error shape (see docs/PULP_API.md "Error model").
// Every API-layer failure in the app should surface as one of these kinds so
// the UI can react consistently instead of branching on raw status codes.
export type PulpApiErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "validation"
  | "conflict"
  | "backend-unavailable"
  | "network"
  | "unknown";

export interface PulpValidationDetail {
  [field: string]: string[] | string | undefined;
}

export class PulpApiError extends Error {
  readonly kind: PulpApiErrorKind;
  readonly status: number | undefined;
  /** Raw response body, kept only for the "technical details" expansion in the UI. */
  readonly detail: unknown;

  constructor(
    kind: PulpApiErrorKind,
    message: string,
    options: { status?: number; detail?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "PulpApiError";
    this.kind = kind;
    this.status = options.status;
    this.detail = options.detail;
  }
}

export function classifyStatus(status: number): PulpApiErrorKind {
  switch (status) {
    case 401:
      return "unauthenticated";
    case 403:
      return "forbidden";
    case 404:
      return "not-found";
    case 400:
      return "validation";
    case 409:
      return "conflict";
    default:
      if (status >= 500) {
        return "backend-unavailable";
      }
      return "unknown";
  }
}

function defaultMessageFor(kind: PulpApiErrorKind): string {
  switch (kind) {
    case "unauthenticated":
      return "You need to sign in to Pulp to do this.";
    case "forbidden":
      return "You don't have permission to do this in Pulp.";
    case "not-found":
      return "That Pulp object could not be found.";
    case "validation":
      return "Pulp rejected the request as invalid.";
    case "conflict":
      return "That conflicts with the current state in Pulp.";
    case "backend-unavailable":
      return "Pulp is currently unavailable.";
    case "network":
      return "Could not reach Pulp.";
    case "unknown":
    default:
      return "Something went wrong talking to Pulp.";
  }
}

function humanizeField(field: string): string {
  return field.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Turns a parsed DRF-style error body into a real, specific message -
 * VERIFIED live against Pulp: a 400 on user creation with a weak password
 * returns `{"non_field_errors": ["This password is too short. It must
 * contain at least 8 characters.", "This password is too common."]}`, which
 * `defaultMessageFor("validation")`'s generic "Pulp rejected the request as
 * invalid." was silently swallowing - every Create/Edit modal in this app
 * renders `PulpApiError.message` directly, so fixing it here fixes all of
 * them at once, no per-modal changes needed.
 *
 * Handles the three DRF error shapes: a plain `{"detail": "..."}` string
 * (common for 404s/some 409s), `{"non_field_errors": [...]}` (no field to
 * prefix), and `{"field_name": ["msg", ...], ...}` (prefixed with a
 * humanized field name, since which field is wrong is exactly the
 * information a generic message was hiding).
 */
function messageFromDetail(detail: unknown): string | undefined {
  if (typeof detail === "string") {
    return detail.trim() || undefined;
  }
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    return undefined;
  }

  const body = detail as Record<string, unknown>;
  if (typeof body.detail === "string" && body.detail.trim()) {
    return body.detail.trim();
  }

  const messages: string[] = [];
  for (const [field, value] of Object.entries(body)) {
    const fieldMessages = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : typeof value === "string"
        ? [value]
        : [];
    const prefix = field === "non_field_errors" ? "" : `${humanizeField(field)}: `;
    for (const fieldMessage of fieldMessages) {
      messages.push(`${prefix}${fieldMessage}`);
    }
  }
  return messages.length > 0 ? messages.join(" ") : undefined;
}

export async function toPulpApiError(response: Response): Promise<PulpApiError> {
  const kind = classifyStatus(response.status);
  let detail: unknown;
  try {
    detail = await response.clone().json();
  } catch {
    try {
      detail = await response.clone().text();
    } catch {
      detail = undefined;
    }
  }
  // Only for validation/conflict - every other kind's hardcoded message is
  // already a deliberate, friendly rewrite of whatever Pulp's own wording
  // is (see defaultMessageFor), and a 401/403/404 body rarely carries
  // anything more specific worth surfacing anyway.
  const message =
    (kind === "validation" || kind === "conflict"
      ? messageFromDetail(detail)
      : undefined) ?? defaultMessageFor(kind);
  return new PulpApiError(kind, message, {
    status: response.status,
    detail,
  });
}

export function fromNetworkFailure(cause: unknown): PulpApiError {
  return new PulpApiError("network", defaultMessageFor("network"), { cause });
}
