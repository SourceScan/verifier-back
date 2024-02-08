import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CompileRustDto {
  @ApiProperty({
    description: 'The entry point file for Rust compilation',
    example: 'Cargo.toml',
  })
  @IsNotEmpty()
  @IsString()
  entryPoint: string;

  @ApiProperty({
    description: 'The attributes to pass to the cargo near compiler',
    example: ['--no-abi', '--no-verify'],
  })
  @IsArray()
  attributes: string[];
}
