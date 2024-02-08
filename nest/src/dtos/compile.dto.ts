import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CompileRustDto {
  @ApiProperty({
    description: 'The entry point file for Rust compilation',
    example: 'Cargo.toml',
  })
  @IsNotEmpty()
  @IsString()
  entryPoint: string;
}
