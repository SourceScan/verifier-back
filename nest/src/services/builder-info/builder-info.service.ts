import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BuilderInfoService {
  private builderImage: string;
  private readonly logger = new Logger(BuilderInfoService.name);

  setBuilderImage(builderImage: string): void {
    this.builderImage = builderImage;
    this.logger.log(`Builder image: ${builderImage}`);
  }

  getBuilderImage(): string {
    return this.builderImage;
  }
}
