# Build stage
FROM node@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS build

WORKDIR /app

RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*

# Copy configuration files
COPY tsconfig*.json ./
COPY package*.json ./

# Install dependencies from package-lock.json
RUN npm ci

# Copy application sources (.ts, .tsx, js)
COPY src/ src/

# Build application (produces dist/ folder)
RUN npm run build

# Runtime (production) layer
FROM docker@sha256:7d85d0eda291f1a7ab6df4a9d1802b5ad4cf9145a088bd11188c78dcb5c7392b AS production

# Install dependencies for Rust, build tools, and HIDAPI
RUN apk add --no-cache \
    python3 \
    git \
    curl \
    perl \
    protobuf \
    eudev-dev \
    build-base \
    pkgconfig \
    linux-headers \
    bash

# Install Rust
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo

RUN mkdir -p $RUSTUP_HOME $CARGO_HOME \
    && curl https://sh.rustup.rs -sSf | sh -s -- --default-toolchain stable -y \
    && ln -s $RUSTUP_HOME /root/.rustup \
    && ln -s $CARGO_HOME /root/.cargo
# Add Rust to the PATH environment variable for all subsequent commands
ENV PATH="/usr/local/cargo/bin:$PATH"

# Install near-cli-rs for contract verification
RUN cargo install near-cli-rs --locked

# Set environment variable for near-cli-rs to run in non-interactive mode
ENV NEAR_CI=1

WORKDIR /app

# Copy node and npm from build stage
COPY --from=build /usr/local /usr/local

# Copy dependencies files
COPY package*.json ./

# Install runtime dependencies (without dev/test dependencies)
RUN npm ci --omit=dev

# Copy production build
COPY --from=build /app/dist/ ./dist/

# Start the application when dockerd is ready
CMD ["sh", "-ec", "rm -f /var/run/docker.pid /var/run/docker.sock /var/run/docker/containerd/containerd.pid /var/run/docker/containerd/containerd.sock /var/run/docker/containerd/containerd.sock.ttrpc /var/run/docker/containerd/containerd-debug.sock; dockerd & until docker info >/dev/null 2>&1; do sleep 1; done; exec node dist/main.js"]
