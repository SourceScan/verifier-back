import { ApiProperty } from '@nestjs/swagger';

export class ExecException extends Error {
  @ApiProperty({ description: 'Executed command that caused the exception' })
  public command: string;

  @ApiProperty({ description: 'Error message' })
  public message: string;

  @ApiProperty({
    description: 'Standard output of the command',
    required: false,
  })
  public stdout?: string[];

  @ApiProperty({
    description: 'Standard error output of the command',
    required: false,
  })
  public stderr?: string[];

  constructor(
    command: string,
    message: string,
    stdout?: string[],
    stderr?: string[],
  ) {
    super(message);
    this.name = 'ExecException';
    this.command = command;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}
