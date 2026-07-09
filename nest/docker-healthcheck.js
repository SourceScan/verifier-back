'use strict';

const http = require('node:http');

function request(options, label) {
  return new Promise((resolve, reject) => {
    const req = http.get(options, (response) => {
      response.resume();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve();
        return;
      }

      reject(new Error(`${label} returned HTTP ${response.statusCode}`));
    });

    req.setTimeout(3000, () => req.destroy(new Error(`${label} timed out`)));
    req.on('error', reject);
  });
}

async function main() {
  await request(
    { socketPath: '/var/run/docker.sock', path: '/_ping' },
    'Docker daemon',
  );

  if (process.argv.includes('--docker-only')) {
    return;
  }

  const port = Number(process.env.NEST_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('NEST_PORT must be a valid TCP port');
  }

  await request({ host: '127.0.0.1', port, path: '/' }, 'Verifier API');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
