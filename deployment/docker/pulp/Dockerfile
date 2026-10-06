# Derived from Pulp's own official all-in-one image - already multi-process,
# using s6-overlay as its init system (/init) to run API/content/workers/
# nginx/PostgreSQL/Redis in one container - to add two colocated reconciler
# longrun services: signing-service registration
# (docs/signing.md "Automating the manual Pulp step",
# docs/adr/0008-colocated-signing-reconciler.md) and LDAP authentication
# config (same manifest-in/act-locally architecture, applied to Django's own
# AUTHENTICATION_BACKENDS/AUTH_LDAP_* settings instead). Nothing reaches
# into this container from the outside for either one - no docker-socket-
# proxy, no Kubernetes pods/exec.
FROM docker.io/pulp/pulp:stable

COPY download-timeouts/apply.py /tmp/apply-download-timeouts.py
RUN python3 /tmp/apply-download-timeouts.py && rm /tmp/apply-download-timeouts.py

COPY global-network /tmp/pulpit-egress
COPY distribution-path-policy /tmp/pulp-distribution-path-policy
COPY remote-check /tmp/pulp-remote-check
COPY pulpit-signing-reconciler /usr/local/bin/pulpit-signing-reconciler
COPY s6/pulpit-signing-reconciler /etc/s6-overlay/s6-rc.d/pulpit-signing-reconciler
COPY pulpit-ldap-reconciler /usr/local/bin/pulpit-ldap-reconciler
COPY s6/pulpit-egress-trust /etc/s6-overlay/s6-rc.d/pulpit-egress-trust
COPY s6/pulpit-ldap-reconciler /etc/s6-overlay/s6-rc.d/pulpit-ldap-reconciler

RUN pip install --no-cache-dir /tmp/pulpit-egress /tmp/pulp-distribution-path-policy /tmp/pulp-remote-check \
 && rm -rf /tmp/pulpit-egress /tmp/pulp-distribution-path-policy /tmp/pulp-remote-check \
 && chmod 0755 /etc/s6-overlay/s6-rc.d/pulpit-egress-trust/run /usr/local/bin/pulpit-signing-reconciler \
      /etc/s6-overlay/s6-rc.d/pulpit-signing-reconciler/run \
      /usr/local/bin/pulpit-ldap-reconciler \
      /etc/s6-overlay/s6-rc.d/pulpit-ldap-reconciler/run \
 && touch /etc/s6-overlay/s6-rc.d/user/contents.d/pulpit-egress-trust \
 && touch /etc/s6-overlay/s6-rc.d/user/contents.d/pulpit-signing-reconciler \
 && touch /etc/s6-overlay/s6-rc.d/user/contents.d/pulpit-ldap-reconciler
