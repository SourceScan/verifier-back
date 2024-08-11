import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
    description: 'Number of block',
    example: 165753012,
  })
  @IsOptional()
  @IsNumber()
  blockId: number;
}

export class BuilderImageInfoResponse {
  builderImage: string;
}
