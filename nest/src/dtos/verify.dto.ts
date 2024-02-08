import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class VerifyRustDto {
  @ApiProperty({
    description: 'The entry point file for Rust compilation',
    example: 'Cargo.toml',
  })
  @IsNotEmpty()
  @IsString()
  entryPoint: string;

  @ApiProperty({
    description: 'Network ID',
    example: 'mainnet',
  })
  @IsNotEmpty()
  @IsString()
  networkId: string;

  @ApiProperty({
    description: 'Account ID',
    example: 'sourcescan.near',
  })
  @IsNotEmpty()
  @IsString()
  accountId: string;

  @ApiProperty({
    description: 'Whether to upload to IPFS',
    example: false,
  })
  @IsNotEmpty()
  uploadToIpfs: boolean;

  @ApiProperty({
    description: 'The attributes to pass to the cargo near compiler',
    example: ['--no-abi', '--no-verify'],
  })
  @IsArray()
  attributes: string[];
}

export class BuilderImageInfoResponse {
  builderImage: string;
}
