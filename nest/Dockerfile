# Building layer
FROM node:20-alpine as development

# Optional NPM automation (auth) token build argument
# ARG NPM_TOKEN

# Optionally authenticate NPM registry
# RUN npm set //registry.npmjs.org/:_authToken ${NPM_TOKEN}

WORKDIR /app

RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*

# Copy configuration files
COPY tsconfig*.json ./
COPY package*.json ./

# Install dependencies from package-lock.json, see https://docs.npmjs.com/cli/v7/commands/npm-ci
RUN npm ci

# Copy application sources (.ts, .tsx, js)
COPY src/ src/

# Build application (produces dist/ folder)
RUN npm run build

# Runtime (production) layer
FROM amd64/node:20-slim as production

# Optional NPM automation (auth) token build argument
# ARG NPM_TOKEN

# Optionally authenticate NPM registry
# RUN npm set //registry.npmjs.org/:_authToken ${NPM_TOKEN}

# Install dependencies for Rust, build tools, and HIDAPI
RUN apt-get update && apt-get install -y \
    python3 \
    git \
    curl \
    build-essential \
    ca-certificates \
    pkg-config \
    libudev-dev \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Set up Docker's official GPG key and stable repository
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker CLI
RUN apt-get update && \
    apt-get install -y docker-ce-cli docker-ce fuse-overlayfs && \
    apt-get clean

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- --default-toolchain nightly -y
# Add Rust to the PATH environment variable for all subsequent commands
ENV PATH="/root/.cargo/bin:$PATH"

# Install cargo-near from source-scan-integration branch
RUN git clone https://github.com/SourceScan/cargo-near\
    && cd ./cargo-near \
    && git checkout source-scan-integration \
    && cd ./cargo-near \
    && cargo install --locked --path . \
    && cd ../.. \
    && rm -rf ./cargo-near

WORKDIR /app

# Copy dependencies files
COPY package*.json ./

# Install runtime dependencies (without dev/test dependencies)
RUN npm ci --omit=dev

# Copy production build
COPY --from=development /app/dist/ ./dist/

CMD ["sh", "-c", "dockerd & sleep 5 && node dist/main.js"]
