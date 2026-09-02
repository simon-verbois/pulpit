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
  return new PulpApiError(kind, defaultMessageFor(kind), {
    status: response.status,
    detail,
  });
}

export function fromNetworkFailure(cause: unknown): PulpApiError {
  return new PulpApiError("network", defaultMessageFor("network"), { cause });
}
