#!/bin/sh
set -e

# Generate htpasswd from environment variables
if [ -n "$IPFS_ADMIN_USER" ] && [ -n "$IPFS_ADMIN_PASS" ]; then
  echo "Generating htpasswd for user: $IPFS_ADMIN_USER"
  password_hash=$(printf '%s\n' "$IPFS_ADMIN_PASS" | mkpasswd -P 0 -m sha512)
  printf '%s:%s\n' "$IPFS_ADMIN_USER" "$password_hash" > /etc/nginx/.htpasswd
else
  echo "Warning: IPFS_ADMIN_USER or IPFS_ADMIN_PASS not set, creating empty htpasswd"
  touch /etc/nginx/.htpasswd
fi

chown root:nginx /etc/nginx/.htpasswd
chmod 640 /etc/nginx/.htpasswd

# Start nginx
exec /docker-entrypoint.sh "$@"
