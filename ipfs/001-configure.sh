#!/bin/sh
set -ex

# Configure IPFS API for WebUI access through nginx proxy
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization", "Content-Type"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'

# Listen on all interfaces (secured by nginx)
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

# Get external IP (from env or auto-detect)
EXTERNAL_IP="${IPFS_EXTERNAL_IP:-$(curl -4 -s --max-time 5 ifconfig.me || echo "")}"

if [ -n "$EXTERNAL_IP" ] && [ -n "$SWARM_PORT" ]; then
  echo "Configuring announce addresses for: $EXTERNAL_IP:$SWARM_PORT"
  ipfs config --json Addresses.Announce "[
    \"/ip4/${EXTERNAL_IP}/tcp/${SWARM_PORT}\",
    \"/ip4/${EXTERNAL_IP}/udp/${SWARM_PORT}/quic-v1\"
  ]"
else
  echo "Skipping announce config (no external IP detected)"
fi

echo "IPFS configured successfully"
