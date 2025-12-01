#!/bin/sh
set -e

# Generate htpasswd from environment variables
if [ -n "$IPFS_ADMIN_USER" ] && [ -n "$IPFS_ADMIN_PASS" ]; then
  echo "Generating htpasswd for user: $IPFS_ADMIN_USER"
  echo "$IPFS_ADMIN_USER:$(openssl passwd -apr1 $IPFS_ADMIN_PASS)" > /etc/nginx/.htpasswd
else
  echo "Warning: IPFS_ADMIN_USER or IPFS_ADMIN_PASS not set, creating empty htpasswd"
  touch /etc/nginx/.htpasswd
fi

# Start nginx
exec /docker-entrypoint.sh "$@"
