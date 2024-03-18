import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { IsSafeCompilationAttributes } from 'src/validators/safe-attrs.decorator';
import { IsSafePath } from 'src/validators/safe-path.decorator';

export class CompileRustDto {
  @ApiProperty({
    description: 'The entry point file for Rust compilation',
    example: 'Cargo.toml',
  })
  @IsNotEmpty()
  @IsString()
  @IsSafePath()
  entryPoint: string;

  @ApiProperty({
    description: 'Compilation attributes',
    example: ['--no-abi', '--no-verify'],
  })
  @IsArray()
  @IsSafeCompilationAttributes()
  attributes: string[];
}
