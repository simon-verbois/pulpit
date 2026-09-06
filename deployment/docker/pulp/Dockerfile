# Derived from Pulp's own official all-in-one image - already multi-process,
# using s6-overlay as its init system (/init) to run API/content/workers/
# nginx/PostgreSQL/Redis in one container - to add one more longrun service:
# the colocated signing-service reconciler
# (docs/signing.md "Automating the manual Pulp step",
# docs/adr/0008-colocated-signing-reconciler.md). This replaces the previous
# docker-socket-proxy / Kubernetes pods/exec approach entirely - nothing
# reaches into this container from the outside anymore.
FROM docker.io/pulp/pulp:stable

COPY pulpit-signing-reconciler /usr/local/bin/pulpit-signing-reconciler
COPY s6/pulpit-signing-reconciler /etc/s6-overlay/s6-rc.d/pulpit-signing-reconciler

RUN chmod 0755 /usr/local/bin/pulpit-signing-reconciler \
      /etc/s6-overlay/s6-rc.d/pulpit-signing-reconciler/run \
 && touch /etc/s6-overlay/s6-rc.d/user/contents.d/pulpit-signing-reconciler
