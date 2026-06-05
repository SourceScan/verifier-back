import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { IpfsService } from './ipfs.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('IpfsService', () => {
  let service: IpfsService;
  const tempDirs: string[] = [];

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

  afterAll(async () => {
    await Promise.all(
      tempDirs.map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
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

  describe('addFolder safety', () => {
    async function createTempRepo(): Promise<{
      tempDir: string;
      repoDir: string;
      outsideDir: string;
    }> {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ipfs-service-'));
      tempDirs.push(tempDir);

      const repoDir = path.join(tempDir, 'repo');
      const outsideDir = path.join(tempDir, 'outside');
      await fs.mkdir(path.join(repoDir, 'src'), { recursive: true });
      await fs.mkdir(outsideDir, { recursive: true });
      await fs.writeFile(path.join(repoDir, 'src', 'lib.rs'), 'pub fn ok() {}');

      return { tempDir, repoDir, outsideDir };
    }

    async function collectFiles(repoDir: string) {
      return (service as any).getFilesRecursively(await fs.realpath(repoDir));
    }

    function relativeFiles(files: Array<{ relativePath: string }>): string[] {
      return files.map((file) => file.relativePath).sort();
    }

    it('should skip symlinked files while collecting IPFS files', async () => {
      const { repoDir, outsideDir } = await createTempRepo();
      const outsideFile = path.join(outsideDir, 'env');
      await fs.writeFile(outsideFile, 'NEAR_MAINNET_PRIVATE_KEY=secret');
      await fs.symlink(outsideFile, path.join(repoDir, 'src', 'leak.env'));

      const files = await collectFiles(repoDir);

      expect(relativeFiles(files)).toEqual(['src/lib.rs']);
    });

    it('should skip symlinked directories while collecting IPFS files', async () => {
      const { repoDir, outsideDir } = await createTempRepo();
      await fs.writeFile(
        path.join(outsideDir, 'secret.txt'),
        'NEAR_TESTNET_PRIVATE_KEY=secret',
      );
      await fs.symlink(outsideDir, path.join(repoDir, 'linked-outside-dir'));

      const files = await collectFiles(repoDir);

      expect(relativeFiles(files)).toEqual(['src/lib.rs']);
    });

    it('should preserve symlinked files inside the IPFS root', async () => {
      const { repoDir } = await createTempRepo();
      const targetFile = path.join(repoDir, 'src', 'lib.rs');
      await fs.symlink(targetFile, path.join(repoDir, 'src', 'lib-link.rs'));

      const files = await collectFiles(repoDir);
      const linkedFile = files.find(
        (file: { relativePath: string }) =>
          file.relativePath === 'src/lib-link.rs',
      );

      expect(relativeFiles(files)).toEqual(['src/lib-link.rs', 'src/lib.rs']);
      expect(linkedFile?.sourcePath).toBe(await fs.realpath(targetFile));
    });

    it('should preserve symlinked directories inside the IPFS root', async () => {
      const { repoDir } = await createTempRepo();
      await fs.mkdir(path.join(repoDir, 'shared'), { recursive: true });
      await fs.writeFile(path.join(repoDir, 'shared', 'mod.rs'), 'mod shared;');
      await fs.symlink(
        path.join(repoDir, 'shared'),
        path.join(repoDir, 'src', 'shared-link'),
      );

      const files = await collectFiles(repoDir);

      expect(relativeFiles(files)).toEqual([
        'shared/mod.rs',
        'src/lib.rs',
        'src/shared-link/mod.rs',
      ]);
    });

    it('should skip recursive symlinks inside the IPFS root', async () => {
      const { repoDir } = await createTempRepo();
      await fs.symlink(repoDir, path.join(repoDir, 'src', 'loop'));

      const files = await collectFiles(repoDir);

      expect(relativeFiles(files)).toEqual(['src/lib.rs']);
    });

    it('should reject resolved paths outside the IPFS root', () => {
      const rootPath = path.resolve('/tmp/sourcescan-ipfs-root');

      expect(
        (service as any).isPathInsideRoot(
          rootPath,
          path.join(rootPath, 'a.rs'),
        ),
      ).toBe(true);
      expect(
        (service as any).isPathInsideRoot(
          rootPath,
          path.resolve('/tmp/not-in-root/a.rs'),
        ),
      ).toBe(false);
    });
  });
});
