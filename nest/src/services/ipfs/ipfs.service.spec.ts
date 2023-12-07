import { Test, TestingModule } from '@nestjs/testing';
import { create } from 'ipfs-http-client';
import { IpfsService } from './ipfs.service';

jest.mock('ipfs-http-client', () => {
  return {
    create: jest.fn().mockReturnValue({
      add: jest.fn(),
      addAll: jest.fn(),
      cat: jest.fn(),
    }),
    globSource: jest.fn(),
  };
});

describe('IpfsService', () => {
  let service: IpfsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpfsService],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    it('should add data to IPFS and return result', async () => {
      const mockAddResult = { cid: { toString: () => 'mockCid' } };
      const mockCreate = create();
      mockCreate.add.mockResolvedValue(mockAddResult);

      const result = await service.add(Buffer.from('test data'));
      expect(mockCreate.add).toHaveBeenCalledWith(Buffer.from('test data'));
      expect(result).toEqual(mockAddResult);
    });
  });

  describe('addFolder', () => {
    it('should add a folder to IPFS and return the last file CID', async () => {
      create().addAll.mockImplementation(async function* () {
        yield* [{ cid: { toString: () => 'mockFileCid' } }];
      });

      const result = await service.addFolder('path/to/folder');
      expect(create().addAll).toHaveBeenCalled();
      expect(result).toEqual('mockFileCid');
    });
  });

  describe('retrieve', () => {
    it('should retrieve data from IPFS', async () => {
      create().cat.mockImplementation(async function* () {
        yield Buffer.from('retrieved data');
      });

      const result = await service.retrieve('mockCid');
      expect(create().cat).toHaveBeenCalledWith('mockCid');
      expect(result).toEqual(Buffer.from('retrieved data'));
    });
  });
});
