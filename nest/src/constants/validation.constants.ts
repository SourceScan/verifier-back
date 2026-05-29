export const NETWORK_IDS = ['mainnet', 'testnet'] as const;

export type NetworkId = (typeof NETWORK_IDS)[number];

export const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
export const GIT_REF_PATTERN =
  /^(?!-)(?!.*(?:\.\.|@\{|\/\/|\\))[A-Za-z0-9._/@+-]{1,256}$/;

const NAMED_ACCOUNT_PATTERN =
  /^(?=.{2,64}$)(?:(?:[a-z0-9]+[-_])*[a-z0-9]+\.)*(?:[a-z0-9]+[-_])*[a-z0-9]+$/;

export const NEAR_ACCOUNT_ID_PATTERN = NAMED_ACCOUNT_PATTERN;

export function isValidNetworkId(networkId: string): networkId is NetworkId {
  return NETWORK_IDS.includes(networkId as NetworkId);
}

export function isValidCommitSha(sha: string): boolean {
  return COMMIT_SHA_PATTERN.test(sha);
}

export function isValidGitRef(ref: string): boolean {
  return GIT_REF_PATTERN.test(ref);
}

export function isValidNearAccountId(accountId: string): boolean {
  return NEAR_ACCOUNT_ID_PATTERN.test(accountId);
}
