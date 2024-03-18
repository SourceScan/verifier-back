import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsSafeString } from 'src/validators/safe-string.decorator';
import { IsSafeUrl } from 'src/validators/safe-url.decorator';

export class GithubDto {
  @ApiProperty({
    description: 'GitHub repository url',
    example: 'https://github.com/SourceScan/verifier-contract',
  })
  @IsNotEmpty()
  @IsString()
  @IsSafeUrl()
  repo: string;

  @ApiProperty({
    description: 'Commit SHA to checkout',
    example: 'a24feb56fdc581b18fd39eb781a6d34a6673879f',
  })
  @IsNotEmpty()
  @IsString()
  @IsSafeString()
  sha: string;
}

export class GithubImportResponse {
  accessToken: string;
  files: string[];
}

export class DeleteFolderResponse {
  message: string;
}
