# SourceScan NestJS Back-end and API
## Installation

1. Create .env file
	 `cp .env.example .env`
2. Build and run containers
	 `docker compose up -d --build`
3. Add these lines to **./docker-data/ipfs/config** to open this node to global ipfs

 `"AppendAnnounce":  [  "/ip4/{hostname}/tcp/{swarm_port}", "/ip4/{hostname}/udp/{swarm_port}/quic", "/ip4/{hostname}/udp/{swarm_port}/quic-v1", "/ip4/{hostname}/udp/{swarm_port}/quic-v1/webtransport" ]`

After that you need to restart IPFS container
