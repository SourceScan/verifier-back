import GithubData from './github-data.interface';

export default interface ContractData {
  cid: string;
  lang: string;
  entry_point: string;
  code_hash: string;
  github?: GithubData;
}
