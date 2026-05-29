export const NETWORK_IDS = ['mainnet', 'testnet'] as const;

export type NetworkId = (typeof NETWORK_IDS)[number];

export const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

const NAMED_ACCOUNT_PATTERN =
  /^(?=.{2,64}$)(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?))*$/;
const IMPLICIT_ACCOUNT_PATTERN = /^[0-9a-f]{64}$/;

export const NEAR_ACCOUNT_ID_PATTERN = new RegExp(
  `${NAMED_ACCOUNT_PATTERN.source}|${IMPLICIT_ACCOUNT_PATTERN.source}`,
);

export function isValidNetworkId(networkId: string): networkId is NetworkId {
  return NETWORK_IDS.includes(networkId as NetworkId);
}

export function isValidCommitSha(sha: string): boolean {
  return COMMIT_SHA_PATTERN.test(sha);
}

export function isValidNearAccountId(accountId: string): boolean {
  return NEAR_ACCOUNT_ID_PATTERN.test(accountId);
}
