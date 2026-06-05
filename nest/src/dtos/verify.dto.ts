import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import {
  NEAR_ACCOUNT_ID_PATTERN,
  NETWORK_IDS,
  NetworkId,
} from '../constants/validation.constants';

export class VerifyRustDto {
  @ApiProperty({
    description: 'Network ID',
    example: 'mainnet',
    enum: NETWORK_IDS,
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(NETWORK_IDS)
  networkId: NetworkId;

  @ApiProperty({
    description: 'Account ID',
    example: 'sourcescan.near',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(NEAR_ACCOUNT_ID_PATTERN, {
    message: 'accountId must be a valid NEAR account ID',
  })
  accountId: string;

  @ApiProperty({
    description: 'Number of block',
    example: 165753012,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  blockId: number;
}

export class BuilderImageInfoResponse {
  builderImage: string;
}
