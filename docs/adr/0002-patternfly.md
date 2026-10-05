# ADR 0002: PatternFly is the UI framework

## Status

Accepted

## Context

Pulpit's target look-and-feel is a modern Red Hat-style enterprise console (Ansible Automation
Platform, Private Automation Hub, Satellite, Hybrid Cloud Console) — information-dense,
accessible, desktop-first admin tooling, not a marketing site. Those products are built on
PatternFly, an open design system with mature React components (tables, toolbars, forms, wizards,
masthead/nav shell, empty/loading states) that already solve most of what an admin console needs.

## Decision

Use PatternFly (`@patternfly/react-core`, `@patternfly/react-table`) as the near-exclusive
component library. Compose the application shell from PatternFly's
Masthead + Sidebar + PageSection primitives per the navigation structure in `docs/UX.md`.

Iconography is deliberately separate from the component framework: official technology logos come
from `simple-icons`, while generic actions and concepts use PulpIT's compact internal SVG set. This
keeps brand artwork accurate and gives the application one visually consistent functional icon
language without introducing another component or CSS framework.

Do not build a custom design system or pull in Tailwind/Bootstrap/MUI/Chakra. Custom CSS is
limited to small layout glue, not component reimplementation.

Because PatternFly's API shifts across major versions, and because a model's training data can
be stale relative to "current," always check current PatternFly docs (via Context7 or
patternfly.org) before using a component or prop pattern not already established in this repo —
see the `patternfly-ui` skill.

### Dependency-version note (verified at bootstrap, 2026-08-28)

At bootstrap time, the latest PatternFly packages (`@patternfly/react-core` et al., 6.6.1) target
React 17–19, and the latest TypeScript (7.0.2) was **not yet supported** by `typescript-eslint`
8.68.x (peer range `>=4.8.4 <6.1.0`) _or_ by `openapi-typescript` 7.13.0 (peer range `^5.x`, ADR
0004). `npm install`'s own resolver errors (not assumption) pinned this down: TypeScript is set to
the latest version inside both ranges, `5.9.3`, not the newest TypeScript major. Separately, the
initially-chosen latest ESLint (10.9.1) failed to resolve too:
`eslint-plugin-jsx-a11y` 6.10.2 (latest at bootstrap time) only supports ESLint `^3–^9`, not 10 yet.
ESLint was pinned to the latest 9.x (9.39.5) instead, which every other lint plugin in use
(`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) also supports.
These are concrete instances of the project's general rule: verify the actual compatible version
at implementation time — including by actually running `npm install` and reading the resolver's
error — don't assume "latest" across every package is mutually compatible. Re-check all three
pairings (TypeScript/typescript-eslint, TypeScript/openapi-typescript, ESLint/eslint-plugin-jsx-a11y)
when deliberately upgrading any of them. Note `npm install` also warns that ESLint 9.x itself is
past its own support window (ESLint 10 is current) — we accepted that tradeoff deliberately
(working accessibility linting now over chasing ESLint's latest major) but it means the
ESLint 9 -> 10 upgrade should be revisited as soon as `eslint-plugin-jsx-a11y` supports it.

## Alternatives considered

- **Tailwind/Bootstrap/MUI/Chakra + custom admin components**: more flexible visually, but would
  mean rebuilding tables, wizards, masthead/nav, and accessibility behavior that PatternFly
  already provides, and would drift further from the target Red Hat-console feel. Rejected.
- **No design system, hand-rolled CSS**: too slow to reach enterprise polish and accessibility
  bars. Rejected.

## Consequences

- UI velocity depends on PatternFly's component coverage; gaps are filled with small, genuinely
  reusable components in `src/components/`, not a parallel styling system.
- The team must stay current with PatternFly's release notes when upgrading.
- Visual identity is "PatternFly + PulpIT's product mark and icon layer," not a separate custom
  component system — see `docs/UX.md` "Product mark and iconography" and "Theming".
