/**
 * Mirrors Django's stock `AUTH_PASSWORD_VALIDATORS` (VERIFIED live: Pulp's
 * own rejection messages for a create/edit-user password match these
 * exactly, e.g. "This password is too short. It must contain at least 8
 * characters." - nothing in this deployment overrides Django's defaults).
 * This is client-side, best-effort UX only - Pulp's own validation remains
 * the real, final authority; a password that passes every rule here can
 * still be rejected server-side (e.g. the common-password list below is a
 * small curated subset of Django's ~20,000-entry one, not a full mirror).
 */

export interface PasswordPolicyContext {
  username?: string;
  email?: string;
}

export interface PasswordPolicyRule {
  id: string;
  label: string;
  check: (password: string, context: PasswordPolicyContext) => boolean;
}

// A small sample of Django's own common-password list (CommonPasswordValidator) -
// not exhaustive (that list has ~20,000 entries), just enough to catch the
// most obvious cases before a round trip to the server.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein",
  "welcome1",
  "admin123",
  "iloveyou",
  "monkey123",
  "dragon123",
  "football",
  "baseball",
  "trustno1",
  "sunshine",
  "princess",
  "abc12345",
  "changeme",
  "whatever",
  "superman",
  "starwars",
]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Best-effort approximation of Django's UserAttributeSimilarityValidator
 * (which uses difflib.SequenceMatcher at a 0.7 similarity threshold against
 * username/email/first/last name) - a full port isn't worth the
 * complexity for a client-side hint, so this checks the cheaper, most
 * common failure: the password containing (or being contained by) the
 * username/email's local part outright. */
function isTooSimilar(password: string, context: PasswordPolicyContext): boolean {
  const lowerPassword = normalize(password);
  if (!lowerPassword) {
    return false;
  }
  const candidates = [context.username, context.email?.split("@")[0]]
    .filter((value): value is string => Boolean(value))
    .map(normalize)
    .filter((value) => value.length >= 3);

  return candidates.some(
    (candidate) => lowerPassword.includes(candidate) || candidate.includes(lowerPassword),
  );
}

export const PASSWORD_POLICY_RULES: PasswordPolicyRule[] = [
  {
    id: "min-length",
    label: "At least 8 characters",
    check: (password) => password.length >= 8,
  },
  {
    id: "not-numeric",
    label: "Not entirely numeric",
    check: (password) => password.length === 0 || !/^\d+$/.test(password),
  },
  {
    id: "not-similar",
    label: "Not too similar to the username or email",
    check: (password, context) => !isTooSimilar(password, context),
  },
  {
    id: "not-common",
    label: "Not a commonly used password",
    check: (password) => !COMMON_PASSWORDS.has(normalize(password)),
  },
];

export interface PasswordPolicyRuleResult {
  rule: PasswordPolicyRule;
  passed: boolean;
}

export function evaluatePasswordPolicy(
  password: string,
  context: PasswordPolicyContext = {},
): { results: PasswordPolicyRuleResult[]; isValid: boolean } {
  const results = PASSWORD_POLICY_RULES.map((rule) => ({
    rule,
    passed: rule.check(password, context),
  }));
  return { results, isValid: results.every((r) => r.passed) };
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O - avoids visual ambiguity
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function randomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function randomChar(pool: string): string {
  return pool[randomInt(pool.length)];
}

/** A 16-character password drawn from mixed-case letters, digits, and
 * symbols - long and varied enough to satisfy every rule above by
 * construction (length, non-numeric, and virtually certain not to collide
 * with a real username or a common password). */
export function generateStrongPassword(length = 16): string {
  const chars = [
    randomChar(UPPER),
    randomChar(LOWER),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];
  for (let i = chars.length; i < length; i += 1) {
    chars.push(randomChar(ALL));
  }
  // Fisher-Yates, so the guaranteed one-per-category picks above aren't
  // always in the same leading positions.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
