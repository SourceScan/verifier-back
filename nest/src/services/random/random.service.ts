import { Injectable } from '@nestjs/common';

@Injectable()
export class RandomService {
  public genHexStr(size: number): string {
    return [...Array(size)]
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');
  }
}
