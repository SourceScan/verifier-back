import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
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
}
