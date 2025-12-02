# Build stage
FROM node:24-alpine AS build

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
FROM docker:dind AS production

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
CMD sh -c "dockerd & while (! docker stats --no-stream ); do sleep 1; done && node dist/main.js"
