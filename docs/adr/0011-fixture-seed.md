# ADR 0011: Seed one sample Repository+Remote per plugin on first startup

## Status

Accepted

## Context

A fresh install has zero content of any kind - every plugin's page is an empty shell until an
admin manually creates a Remote, a Repository, and syncs them. The request was to seed one
on-demand sample repository per plugin automatically, so a new instance has something to look at
immediately, without any manual action.

This is new ground for `pulpit-core`: every other module either reads Pulp (`content_size`,
`nav_visibility`) or mutates *existing* objects a user already created (`default_settings`'s
apply-to-all-remotes, `signing`'s resigning) - `PulpClient` had no repository/remote/distribution
*creation* methods at all before this, since the frontend has always owned that CRUD directly
against Pulp (ADR 0005's same-origin proxy is what makes that possible from the browser). A
startup-time seed has to run from the backend - there is no browser session at container boot.

Every URL/field below was VERIFIED live (create-and-delete round trips against a real Pulp
instance, and finally a real end-to-end run) before being hardcoded - same discipline as every
other `PulpClient` method's own header comments.

## Decision

- **New `PulpClient` methods** (`app/adapters/pulp/client.py`): `create_remote`, `create_repository`,
  `sync_repository`, `create_distribution` - one call per plugin-typed endpoint (e.g. `rpm/rpm`,
  `deb/apt`, `ansible/collection` for remotes vs `ansible/ansible` for repositories), since unlike
  the generic listing endpoints (`list_content_page` etc.) there is no cross-plugin *create*
  endpoint. VERIFIED live: remote/repository creation is synchronous for every plugin used here;
  distribution creation and repository sync are both asynchronous (`{"task": <href>}`).
- **New `fixture_seed` module** (`app/modules/fixture_seed/`), following the exact shape of
  `content_size`/`default_settings`:
  - `fixtures.py` - one `PluginFixture` per plugin (URL, extra fields, real example values), never
    invented from a doc example alone.
  - `jobs.py` - `seed_sample_fixtures_job`: for each fixture, create the Remote, and (if it has a
    repository type) the Repository, then sync and create a Distribution; one plugin's failure
    never aborts the rest (same convention as `default_settings.apply_proxy_to_all_remotes_job`).
  - `models.py`/`service.py` - `FixtureSeedState`, a marker row whose mere existence means seeding
    was already *attempted* - checked at the top of the job, so every later invocation (see below)
    is a cheap no-op, successful or not.
  - `module.py` - `scheduled_jobs = [("fixture_seed.seed_sample_fixtures", 300)]`, the *same*
    periodic-heartbeat mechanism `content_size.refresh` already uses (`worker/main.py`), reused here
    for a one-shot startup action rather than adding a second scheduling mechanism. No routes: this
    module has no user-facing API surface at all.
  - Runs entirely in `pulpit-worker`, never inline on a request or blocking app startup, because it
    makes real outbound calls to public fixture servers that could be slow or briefly unreachable.
- **Ten plugins considered, three outcomes**:
  - **Seven get the full treatment** (Remote + Repository + sync + Distribution): rpm
    (`fixtures.pulpproject.org/rpm-unsigned/`), file (`fixtures.pulpproject.org/file/PULP_MANIFEST`),
    deb (`nginx.org/packages/debian/`, `bookworm`/`nginx`/`amd64`), container
    (`registry-1.docker.io`, `pulp/test-fixture-1` - Pulp's own dedicated test image), ansible
    (`galaxy.ansible.com/`, `ansible.posix`), python (`pypi.org/`, `includes=["shelf-reader"]`).
    ~~gem~~ was meant to be the seventh but is demoted below.
  - **Three are remote-only** (a ready-to-use Remote, no Repository/Distribution):
    - maven and hugging_face are architecturally pull-through-cache-only (VERIFIED against their own
      docs - neither exposes a "sync everything now" mechanism), and this project didn't verify the
      exact repository/distribution wiring their pull-through mode needs - safer to leave a
      ready-to-use Remote for an admin to attach by hand than guess at that wiring.
    - gem was going to get the full treatment (`index.rubygems.org/`, `includes={"panda": null}`,
      matching pulp_gem's own official sync-guide example) until a live end-to-end run hit a real
      upstream bug: `pulp_gem/specs.py`'s `key, value = stmt.split(":")` raises "too many values to
      unpack" parsing the synced gem's metadata. Not a fixture-choice problem to route around by
      picking a different gem - nothing rules out another gem hitting the same parser bug - so gem
      stays remote-only too.
  - **One is skipped entirely**: npm. VERIFIED against `NpmRemoteSerializer`'s own source that it has
    no `includes`/`excludes` field at all - an unfiltered sync would attempt to mirror the entire
    public npm registry. Skipped outright rather than ship something that could do that by accident.

## Alternatives considered

- **Prefill the "Create Remote" form with real values instead of creating anything**: the least
  risky option, but doesn't satisfy "by default, no manual action" - the whole point was zero
  clicks needed.
- **A dedicated "Create sample" button an admin clicks**: same objection - still a manual step, and
  the user explicitly chose the fully-automatic option when asked.
- **Run the seed inline at FastAPI startup (`app/main.py`'s `_lifespan`) instead of as a worker
  job**: rejected - it makes real outbound HTTP calls to public servers that could be slow or briefly
  unreachable, which must never block the API process from becoming ready. Reusing the existing
  scheduled-job mechanism (already proven by `content_size.refresh`) needed no new plumbing at all.
- **A brand new "run once at startup" scheduling primitive**: unnecessary - a periodic job that
  checks its own "already done" marker and no-ops is simpler than a second scheduler mechanism
  alongside the one `content_size` already established.

## Consequences

- `PulpClient` gains its first *creation* methods; every one of them is plugin-typed (no generic
  cross-plugin create endpoint exists, unlike listing), so `fixtures.py` is the one place that
  supplies the type path per plugin.
- A fresh instance now has six plugins with real, browsable, synced sample content within minutes of
  first boot, three more with a Remote ready to attach, and npm untouched - all with no admin action
  required.
- The one-shot marker means a transient failure (e.g. no network reachability to a public fixture
  server on a genuinely offline first boot) is never automatically retried beyond the periodic
  reschedule window before the marker is set - same "best effort once" tradeoff already accepted by
  this project's other bulk background jobs, not a new risk class.
