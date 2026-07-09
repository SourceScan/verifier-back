# syntax=docker/dockerfile:1.7

ARG NEAR_CLI_RS_VERSION=0.27.0

# Keep exact tags for reviewability and digests for reproducibility.
FROM node:24.17.0-alpine3.24@sha256:156b55f92e98ccd5ef49578a8cea0df4679826564bad1c9d4ef04462b9f0ded6 AS node-build

WORKDIR /app

# Copy configuration files
COPY eslint.config.mjs ./
COPY tsconfig*.json ./
COPY package*.json ./

# Install dependencies from package-lock.json.
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci

# Copy application sources (.ts, .tsx, js)
COPY src/ src/

# Build application (produces dist/ folder)
RUN npm run build

# Keep only dependencies needed by the production application.
FROM node-build AS node-production

RUN npm prune --omit=dev

# Build near-cli-rs separately so Rust and compiler tooling never reach runtime.
FROM rust:1.96.0-alpine3.24@sha256:f87aa870663e2b57ec8c69de82c7eedf7383bee987eef7612c0359635eaadb41 AS near-cli-build

ARG NEAR_CLI_RS_VERSION

RUN apk add --no-cache \
    build-base \
    eudev-dev \
    linux-headers \
    perl \
    pkgconf \
    protobuf

RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=/tmp/cargo-target,sharing=locked \
    CARGO_TARGET_DIR=/tmp/cargo-target \
    cargo install near-cli-rs --version "${NEAR_CLI_RS_VERSION}" --locked

RUN test "$(near --version)" = "near-cli-rs ${NEAR_CLI_RS_VERSION}"

# Runtime (production) layer
FROM docker:29.6.1-dind@sha256:66d292e5c26bd33a6f6f61cacb880de2186339a524ecba1ce098dbbaceed6515 AS production

ARG NEAR_CLI_RS_VERSION

LABEL dev.sourcescan.near-cli-rs.version="${NEAR_CLI_RS_VERSION}"

# Git requires libcurl, while Compose and Buildx are host-side tools here.
RUN apk upgrade --no-cache libcurl \
    && rm -f \
        /usr/local/libexec/docker/cli-plugins/docker-buildx \
        /usr/local/libexec/docker/cli-plugins/docker-compose

# Set environment variable for near-cli-rs to run in non-interactive mode
ENV NEAR_CI=1

WORKDIR /app

# Copy Node and the pinned near CLI into the runtime image.
COPY --from=node-build /usr/lib/libgcc_s.so.1 /usr/lib/
COPY --from=node-build /usr/lib/libstdc++.so.6* /usr/lib/
COPY --from=node-build /usr/local/bin/node /usr/local/bin/node
COPY --from=near-cli-build /usr/local/cargo/bin/near /usr/local/bin/near

# Copy package metadata and production dependencies.
COPY package*.json ./
COPY --from=node-production /app/node_modules/ ./node_modules/
COPY docker-healthcheck.js ./

# Copy production build
COPY --from=node-build /app/dist/ ./dist/

# Fail the image build if any required runtime binary is unusable.
RUN node --version \
    && near --version \
    && docker --version

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "docker-healthcheck.js"]

# Start the application when dockerd is ready
CMD ["sh", "-ec", "rm -f /var/run/docker.pid /var/run/docker.sock /var/run/docker/containerd/containerd.pid /var/run/docker/containerd/containerd.sock /var/run/docker/containerd/containerd.sock.ttrpc /var/run/docker/containerd/containerd-debug.sock; dockerd & until node docker-healthcheck.js --docker-only >/dev/null 2>&1; do sleep 1; done; exec node dist/main.js"]
