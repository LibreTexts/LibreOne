# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Builder: install the full dependency tree and produce the client/SSR bundle.
# The bundle is built here, at image build time, rather than at container start
# so that every task from a given image serves byte-identical assets and the
# server can bind its port immediately.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /usr/src/libreone

# VITE_* values are inlined into the bundle at build time. Staging and production
# use identical values, so a single image is valid for every environment. Override
# with --build-arg only if that stops being true.
ARG VITE_NODE_ENV=production
ARG VITE_COMMONS_STORE_URL=https://commons.libretexts.org/store
ENV VITE_NODE_ENV=$VITE_NODE_ENV \
    VITE_COMMONS_STORE_URL=$VITE_COMMONS_STORE_URL

# Skip the husky git-hook install; there is no git repository in the image.
ENV HUSKY=0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run client:build

# ---------------------------------------------------------------------------
# Deps: the runtime dependency tree only. vite, vike and tsx live in
# `dependencies` (not devDependencies) and are required by the server at
# runtime, so they survive --omit=dev; mocha, eslint, semantic-release and
# @swc/core do not.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /usr/src/libreone

COPY package.json package-lock.json ./
# `prepare` runs husky, which is a devDependency and therefore absent here.
RUN npm pkg delete scripts.prepare \
    && npm ci --omit=dev \
    && npm cache clean --force

# ---------------------------------------------------------------------------
# Runtime.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.source="https://github.com/LibreTexts/LibreOne"

WORKDIR /usr/src/libreone

ENV NODE_ENV=production

COPY --from=deps /usr/src/libreone/node_modules ./node_modules
COPY --from=builder /usr/src/libreone/dist ./dist

# tsx runs the TypeScript sources directly, and server code reaches out to
# root-level modules (server/validators/apiusers.ts imports ../../passwordstrength).
# Copying the whole tree (~2.4 MB, minus .dockerignore) rather than cherry-picking
# directories keeps a newly-added file from turning into a container crash loop.
# node_modules and dist are excluded by .dockerignore, so the layers above stand.
COPY . .

# The server reads PORT and falls back to 3000 (server/index.ts). ECS supplies
# PORT via the api.env environment file.
EXPOSE 3000

HEALTHCHECK --timeout=5s --start-period=15s \
  CMD wget -nv -t1 --spider "http://localhost:${PORT:-3000}/health" || exit 1

# exec form with no shell or npm wrapper, so the Node process is PID 1 and
# receives SIGTERM directly from ECS on task drain.
ENTRYPOINT ["node", "--import", "tsx", "./server/index.ts"]
