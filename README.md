# SourceScan NestJS Back-end and API

## Installation

1. Create .env file
   ```
   cp .env.example .env
   ```
2. Build and run containers
   ```
   docker compose up -d --build
   ```

## Firewall Configuration

**Open these ports (public access required):**
| Port | Protocol | Service | Description |
|------|----------|---------|-------------|
| 33 | TCP | Nginx | API proxy (NGINX_PORT) |
| 4001 | TCP+UDP | IPFS Swarm | P2P communication (SWARM_PORT) |

**Keep closed (internal only, bound to 127.0.0.1):**
| Port | Service | Description |
|------|---------|-------------|
| 3033 | NestJS | Backend API (NEST_PORT) |
| 5001 | IPFS API | Admin interface (IPFS_PORT) |
| 8080 | IPFS Gateway | Content gateway (GATE_PORT) |

## IPFS WebUI

- Local: http://localhost:5001/webui
- Via nginx: http://localhost:33/ipfs-admin/webui (requires IPFS_ADMIN_USER/PASS)
