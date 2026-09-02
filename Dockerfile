# syntax=docker/dockerfile:1

# Stage 1: build static assets. Node only exists at build time (ADR 0001,
# now scoped to the frontend only - see ADR 0006) - it is never part of the
# runtime image.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve static assets + reverse-proxy Pulp/pulpit-core, via nginx
# only. This container itself still has no application logic, database, or
# GPG/signing key access of its own (ADR 0006) - it only ever proxies to
# pulp and pulpit-core, same as it already did for pulp alone.
FROM nginx:stable-alpine AS runtime
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/pulpit.conf.template /etc/nginx/templates/pulpit.conf.template

# Overridable at `docker run`/Compose time; see compose.yml.
ENV PULP_UPSTREAM=pulp
ENV PULPIT_CORE_UPSTREAM=pulpit-core

EXPOSE 8080
