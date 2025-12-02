import NearConfig from '../interfaces/near-config.interface';

const mainnetConfig: NearConfig = {
  accountId: process.env.NEAR_MAINNET_ACCOUNT_ID,
  privateKey: process.env.NEAR_MAINNET_PRIVATE_KEY,
  networkId: 'mainnet',
  nodeUrl: process.env.NEAR_MAINNET_RPC || 'https://rpc.mainnet.near.org',
  walletUrl: 'https://app.mynearwallet.com',
  helperUrl: 'https://helper.mainnet.near.org',
};

const testnetConfig: NearConfig = {
  networkId: 'testnet',
  accountId: process.env.NEAR_TESTNET_ACCOUNT_ID,
  privateKey: process.env.NEAR_TESTNET_PRIVATE_KEY,
  nodeUrl: process.env.NEAR_TESTNET_RPC || 'https://rpc.testnet.near.org',
  walletUrl: 'https://testnet.mynearwallet.com',
  helperUrl: 'https://helper.testnet.near.org',
};

export { mainnetConfig, testnetConfig };
