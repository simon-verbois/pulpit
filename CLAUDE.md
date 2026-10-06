# Working agreements for this project

- **Stay 100% local.** Everything needed to develop, test, and verify this project runs on this
  machine - no cloud services, no external deployment targets, no remote infra. `docker compose -f
deployment/docker/compose-dev.yml --env-file .env ...` (see `docs/DEVELOPMENT.md`) is the whole
  dev stack.
- **Rebuild the local Compose stack after finishing a change.** Once code changes are done (tests
  passing), rebuild and restart the affected service(s) so the running dev stack actually reflects
  the change - don't leave it running stale code:
  ```
  docker compose -f deployment/docker/compose-dev.yml --env-file .env build pulpit
  docker compose -f deployment/docker/compose-dev.yml --env-file .env up -d pulpit
  ```
  (swap `pulpit` for `pulp` if the change touched `deployment/docker/pulp/`.)

## UI design guidelines

This app is built on PatternFly (v6) - when in doubt about layout, action placement, or
component choice, follow PatternFly's own design guidelines
(https://www.patternfly.org/patterns/actions/, https://www.patternfly.org/components/*/design-guidelines/)
rather than improvising. Key rules that have caused real bugs in this project when skipped:

- **One primary action per view.** Limit primary buttons to one per page/tab. Use secondary
  buttons for other on-page actions, tertiary for per-row actions, danger/destructive variant
  for anything irreversible.
- **Page-wide actions live in the page header (top right), not in a toolbar.** Toolbars are for
  actions/filters scoped to the component below them (a table, a list).
- **Never show a toolbar action button next to an empty state's own action button.** A full-page
  empty state should not be preceded by a toolbar at all (no filters, no search, no duplicate
  action button) - PatternFly's empty-state guidance explicitly says not to show
  toolbars/filters there, since there's nothing to search or paginate yet. Render the
  toolbar/table together, gated on the list being non-empty; render the empty state as the sole
  call to action otherwise.
- **Group many page-wide actions into a dropdown** rather than spreading several buttons across
  the header.
- **Modal footer buttons are right-aligned, confirm/destructive action on the right, Cancel to
  its left.** `ModalFooter` has no alignment of its own (PatternFly v6 ships it as a plain
  left-packed flex row, not right-aligned) - always wrap its contents in a
  `Flex justifyContent={{ default: "justifyContentFlexEnd" }}` (each button in its own
  `FlexItem`), with the Cancel/Close button first in the JSX and the primary/danger action
  last, so the confirm button sits closest to the modal's edge. More generally, the rightmost
  button is always the one that finishes the modal (Save/Create/Delete, or Close when there's
  nothing left to confirm): a non-terminal action like "Test again" goes to the *left* of Close,
  and once a background job has succeeded, hide its (now pointless) action button so Close is
  rightmost.
