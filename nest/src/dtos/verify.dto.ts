import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsSafePath } from 'src/validators/safe-path.decorator';

export class VerifyRustDto {
  @ApiProperty({
    description: 'The entry point file for Rust compilation',
    example: 'Cargo.toml',
  })
  @IsNotEmpty()
  @IsString()
  @IsSafePath()
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
}

export class BuilderImageInfoResponse {
  builderImage: string;
}
