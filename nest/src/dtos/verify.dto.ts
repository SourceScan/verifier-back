import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

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
  @IsBoolean()
  uploadToIpfs: boolean;

  @ApiProperty({
    description: 'Whether to upload to IPFS',
    example: false,
  })
  @IsOptional()
  @IsNumber()
  blockId: number;
}

export class BuilderImageInfoResponse {
  builderImage: string;
}
