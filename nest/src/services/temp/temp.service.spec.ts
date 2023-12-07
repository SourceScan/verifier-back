import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs/promises';
import { RandomService } from '../random/random.service';
import { TempService } from './temp.service';

jest.mock('fs/promises');
jest.mock('rimraf', () => {
  return jest.fn((path, callback) => {
    process.nextTick(callback); // Simulate async deletion with a callback
  });
});

describe('TempService', () => {
  let tempService: TempService;
  let randomService: RandomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TempService, RandomService],
    }).compile();

    tempService = module.get<TempService>(TempService);
    randomService = module.get<RandomService>(RandomService);

    jest
      .spyOn(randomService, 'genHexStr')
      .mockImplementation(() => 'randomString');
  });

  it('should be defined', () => {
    expect(tempService).toBeDefined();
  });

  it('should create a folder', async () => {
    const folderPath = await tempService.createFolder();
    expect(fs.mkdir).toHaveBeenCalledWith('/tmp/randomString');
    expect(folderPath).toBe('/tmp/randomString');
  });

  it('should append a folder', async () => {
    const baseFolder = '/base/folder';
    const folderPath = await tempService.appendFolder(baseFolder);
    expect(fs.mkdir).toHaveBeenCalledWith(`${baseFolder}/randomString`);
    expect(folderPath).toBe(`${baseFolder}/randomString`);
  });

  it('should check if a folder exists', async () => {
    jest.spyOn(fs, 'access').mockResolvedValue(undefined);
    const folderPath = '/tmp/existingFolder';
    const exists = await tempService.checkFolder(folderPath);
    expect(fs.access).toHaveBeenCalledWith(folderPath, fs.constants.F_OK);
    expect(exists).toBeTruthy();
  });
});
