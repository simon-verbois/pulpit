import { Content } from "@patternfly/react-core";

export function AdministrationRepositorySigningTopic() {
  return (
    <Content>
      <Content component="p">
        This page manages the GPG key PulpIT uses to sign RPM packages and/or repository
        metadata on your behalf, and its automatic rotation over time. Unlike{" "}
        <strong>Pulp Signing Services</strong> (a raw, read-only view of Pulp's own
        state), this is a real PulpIT feature with its own configuration, key lifecycle,
        and background jobs — see
        <code> docs/signing.md</code> for the full technical design if you need it.
      </Content>

      <Content component="h3">Page layout</Content>
      <Content component="p">
        The page has two cards. <strong>Signing</strong> holds the master on/off
        checkboxes; <strong>Public key</strong> holds the filename and the resulting full
        public key URL. <strong>Signing keys</strong> (its own card below both) is the
        full key history — current status, one row per key ever generated, and a{" "}
        <strong>Generate key</strong> button next to its heading. There's no separate
        "current key" section: the active (and next, if any) key's row in that same table
        is where you check status, and the <strong>inspect</strong> icon on any row opens
        its full detail — every field, including ones the table doesn't have room for.
        Identity/algorithm defaults live only in the <strong>Generate key</strong> dialog
        — see below.
      </Content>

      <Content component="h3">Signing configuration</Content>
      <Content component="p">
        <strong>Signing enabled</strong> is the master switch;{" "}
        <strong>Package signing enabled</strong> and{" "}
        <strong>Metadata signing enabled</strong> control the two independently (a
        repository can use either, both, or neither).
      </Content>
      <Content component="p">
        <strong>Filename</strong> (in <strong>General</strong>) sets the name served at
        the public key URL shown right below it (e.g.{" "}
        <code>https://your-pulpit-host/keys/RPM-GPG-KEY-pulp</code>) - a full, absolute
        address you can paste straight into a repository's <code>gpgkey=</code> setting.
        Both are plain, read/write text - not editable-looking clipboard widgets - with a
        small copy button next to the URL. The rest of the new-key defaults (
        <strong>Key name</strong>, <strong>Identity</strong>, <strong>Email</strong>,{" "}
        <strong>Algorithm</strong>, and the two signing service names) live inside the{" "}
        <strong>Generate key</strong> dialog instead, since they only matter at the moment
        you're about to generate a key. Every one of these is still a plain global default
        under the hood (none hardcoded to any organization), saved immediately as you
        change it wherever it's shown, and only affecting the next key generated, never
        existing keys. <strong>Key name</strong> is a label shown in PulpIT only;{" "}
        <strong>Identity</strong> is what actually gets embedded in the GPG key's UID and
        is visible to anyone who imports the public key — they default to the same value
        but don't have to match.
      </Content>

      <Content component="h3">One active key, always fully published</Content>
      <Content component="p">
        There is always exactly one active signing key, and the public key URL always
        serves that one key only — never an old-and-new mix. <strong>Publishing</strong> a
        key (automatically by the rotation schedule, or manually with{" "}
        <strong>Publish now</strong>) is more than flipping a flag: it re-signs every
        already-existing package in every repository that has package signing enabled with
        the new key, and republishes metadata for every repository with metadata signing
        enabled. This is mandatory, not a toggle — there's no setting to turn it off.
        Re-signing runs as a background job per repository (visible the same way any other
        job is), never inline, and can take a while for a repository with many packages
        since each one has to be downloaded, re-signed, and re-uploaded (Pulp has no way
        to re-sign a package already in a repository in place).
      </Content>

      <Content component="h3">Automatic rotation</Content>
      <Content component="p">
        Configured from the <strong>Generate key</strong> dialog, under its own{" "}
        <strong>Automatic rotation</strong> heading — these are still global defaults
        (they apply to every future key, not just the one you're about to generate), the
        dialog is just where you review and change them. Off by default. When{" "}
        <strong>Automatic key rotation enabled</strong> is on, PulpIT generates a
        replacement key <strong>Generate replacement</strong> days before the active key
        expires, and publishes it <strong>Publish replacement</strong> days before that
        (triggering the resign/republish described above automatically). This all runs as
        a background check, never something that blocks a page load. A superseded key
        stops being served the instant a new one is published, regardless of{" "}
        <strong>Old public key retention</strong> — that setting only controls how long it
        takes to flip from "just superseded" to "fully retired" internally for
        record-keeping. Both look identical in the <strong>Signing keys</strong> table (
        <strong>INACTIVE</strong>), and neither is ever removed from that history.
      </Content>
      <Content component="p">
        <strong>Create keys without expiration</strong> must be turned on before a
        non-expiring key can be generated. Since a non-expiring key can never be
        auto-rotated on a schedule (there's no expiry to count down from), turning this on
        greys out <strong>Automatic key rotation enabled</strong> and the expiry-driven
        fields below it — <strong>Old public key retention</strong> stays active since it
        still applies to any key you replace by hand.
      </Content>

      <Content component="h3">Generating and managing keys</Content>
      <Content component="p">
        <strong>Generate key</strong> (next to the <strong>Signing keys</strong> heading)
        opens a dialog where you pick a validity for this key — 6 months, 1 year, 2 years
        (the default), 3 years, 5 years, a custom number of days, or no expiration if
        policy allows it — and can also review the remaining identity/algorithm defaults
        and the automatic rotation policy before generating. The new key is generated in
        the background; if nothing is active yet, it publishes automatically once ready.
        If a key is already active, the new one stays <strong>NEXT</strong> until the
        automatic rotation threshold is reached — or until you use{" "}
        <strong>Publish now</strong> on it to publish it immediately.
      </Content>
      <Content component="p">
        A key's status is one of <strong>NEXT</strong> (generated, not yet in use),{" "}
        <strong>ACTIVE</strong> (the one currently published and used for new signing), or{" "}
        <strong>INACTIVE</strong> (superseded — stops being served the moment a new key
        publishes; kept in the table as a historical record for{" "}
        <strong>Old public key retention</strong> days). Use{" "}
        <strong>Extend expiration</strong> on the active or next key to push its expiry
        back without generating a new one, <strong>Export public key</strong> to open its
        public key directly, and the <strong>inspect</strong> icon to see every field for
        that key (fingerprint, key ID, identity, algorithm, every timestamp) in one place
        — the private key is never shown anywhere, in this UI or any API response.
      </Content>

      <Content component="h3">The one manual step (usually automatic)</Content>
      <Content component="p">
        Pulp only allows creating a signing service through a command run on the Pulp
        server itself — there is no way to do it through Pulp's API. The first time a key
        needs package and/or metadata signing (and again for metadata every time the key
        publishes — package signing reuses one generic service forever), PulpIT tries to
        run that command automatically. If that succeeds (the usual case in this project's
        reference deployment), you won't see anything about it at all — a fully working
        key shows no Pulp-services status of any kind. If automation isn't available in
        your deployment, the <strong>Signing keys</strong> section shows a{" "}
        <strong>Waiting on a one-time manual step</strong> banner with the exact command
        to run inside the <code>pulp</code> container instead; run it once and PulpIT
        picks up the change automatically within a few minutes.
      </Content>

      <Content component="h3">Public key URL and DNF configuration</Content>
      <Content component="p">
        The public key URL in <strong>General</strong> is a stable, absolute address (e.g.{" "}
        <code>https://your-pulpit-host/keys/RPM-GPG-KEY-pulp</code>) a repository's{" "}
        <code>gpgkey=</code> setting can point at permanently — the URL never changes
        across a key publish, only the key behind it does. It always serves the current
        active key only; a key's own detail popup shows this same note instead of a
        copyable URL for any key that isn't currently active.
      </Content>
      <Content component="p">
        Publishing the key here does not make DNF clients trust it automatically — the
        first time a client encounters it, <code>dnf</code>/<code>rpm</code> still prompts
        for approval (or needs an out-of-band-verified fingerprint in unattended setups).
        Because this URL always serves only the current key (no old+new overlap), a client
        that hasn't refreshed its trust since the last publish will fail verification
        until it re-imports the key.
      </Content>

      <Content component="h3">Using this on a repository</Content>
      <Content component="p">
        Signing is fully automatic, not a per-repository choice — there is no checkbox on
        an RPM repository's create/edit form at all. Whatever's enabled above applies to
        every repository created from that point on, using the current active key, no
        fingerprint typing required.
      </Content>

      <Content component="h3">Existing repositories</Content>
      <Content component="p">
        A repository created <em>before</em> signing was turned on (or before this policy
        existed) doesn't otherwise catch up on its own.{" "}
        <strong>Sign all repositories…</strong>, in its own card here, brings every
        existing RPM repository into line with the current policy on demand: repositories
        missing package signing have their already-synced packages actually{" "}
        <strong>re-signed</strong> in the background (re-downloaded, re-signed,
        re-uploaded as a new repository version — not cheap for a repository with many
        packages); repositories missing metadata signing are just republished. A
        repository already correctly signed is left untouched. This cannot be undone.
      </Content>
    </Content>
  );
}
