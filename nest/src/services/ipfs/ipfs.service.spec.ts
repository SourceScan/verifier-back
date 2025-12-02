import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { IpfsService } from './ipfs.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('IpfsService', () => {
  let service: IpfsService;

  beforeEach(async () => {
    process.env.IPFS_HOST = 'localhost';
    process.env.IPFS_PORT = '5001';

    const module: TestingModule = await Test.createTestingModule({
      providers: [IpfsService],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listFilesAtPath', () => {
    it('should list files at IPFS path', async () => {
      const mockResponse = {
        data: {
          Objects: [
            {
              Links: [
                { Name: 'file1.txt', Hash: 'Qm123', Size: 100, Type: 2 },
                { Name: 'folder', Hash: 'Qm456', Size: 0, Type: 1 },
              ],
            },
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.listFilesAtPath('QmRootCid', 'subpath');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:5001/api/v0/ls?arg=QmRootCid%2Fsubpath',
      );
      expect(result).toHaveLength(2);
      expect(result[0].Name).toBe('file1.txt');
      expect(result[1].Type).toBe(1);
    });

    it('should return empty array when no files found', async () => {
      mockedAxios.post.mockResolvedValue({ data: { Objects: [] } });

      const result = await service.listFilesAtPath('QmEmptyCid', '');

      expect(result).toEqual([]);
    });
  });
});
