import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyRustDto {
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
