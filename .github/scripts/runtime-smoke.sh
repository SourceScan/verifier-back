#!/bin/sh

set -eu

image=${1:?Usage: runtime-smoke.sh IMAGE}
container="sourcescan-verifier-smoke-$$"

cleanup() {
  docker rm --force --volumes "$container" >/dev/null 2>&1 || true
}

trap cleanup EXIT HUP INT TERM

private_key=$(docker run --rm --entrypoint node "$image" -e \
  "const { utils } = require('near-api-js'); console.log(utils.KeyPair.fromRandom('ed25519').toString())")

docker run \
  --detach \
  --env IPFS_HOST=127.0.0.1 \
  --env IPFS_PORT=5001 \
  --env JWT_EXPIRATION=1 \
  --env NEAR_MAINNET_ACCOUNT_ID=v2-verifier.sourcescan.near \
  --env "NEAR_MAINNET_PRIVATE_KEY=$private_key" \
  --env NEAR_TESTNET_ACCOUNT_ID=v2-verifier.sourcescan.testnet \
  --env "NEAR_TESTNET_PRIVATE_KEY=$private_key" \
  --env NEST_PORT=3033 \
  --env NEST_PREFIX=/api \
  --name "$container" \
  --privileged \
  "$image" >/dev/null

attempt=0
while [ "$attempt" -lt 75 ]; do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$container")

  case "$health" in
    healthy)
      docker exec "$container" node -e \
        "if (process.env.DOCKER_HOST !== 'unix:///var/run/docker.sock') process.exit(1)"
      docker exec "$container" docker info >/dev/null 2>&1
      docker exec "$container" docker builder prune --force >/dev/null 2>&1
      exit 0
      ;;
    unhealthy)
      break
      ;;
  esac

  attempt=$((attempt + 1))
  sleep 1
done

docker inspect --format '{{json .State.Health}}' "$container" >&2
docker logs "$container" >&2
exit 1
