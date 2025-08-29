export interface Standard {
  standard: string;
  version: string;
}

export interface BuildInfo {
  build_environment: string;
  build_command: string[];
  contract_path: string;
  source_code_snapshot: string;
  variant?: string; // Optional variant name for cargo-near builds
}

export interface ContractMetadataDto {
  version: string;
  link: string;
  standards: Standard[];
  build_info: BuildInfo;
}
