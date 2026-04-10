import * as fs from 'fs/promises';
import { WinstonLoggerService } from '../../integrations/logger/winston-logger.service';
import { LogsService } from './logs.service';

jest.mock('fs/promises');

describe('LogsService', () => {
  const root = 'D:\\tmp\\testlogs';
  const winston = {
    rootDir: root,
  } as unknown as WinstonLoggerService;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects invalid file names', async () => {
    const svc = new LogsService(winston);
    await expect(svc.readLogFile('../etc/passwd')).rejects.toThrow(
      'Invalid log file name',
    );
  });

  it('lists log files', async () => {
    (fs.readdir as jest.Mock).mockResolvedValue([
      { name: 'combined.log', isFile: () => true, isDirectory: () => false },
      { name: 'other.txt', isFile: () => true, isDirectory: () => false },
    ]);
    (fs.stat as jest.Mock).mockResolvedValue({ size: 42 });
    const svc = new LogsService(winston);
    const files = await svc.listFiles();
    expect(files).toEqual([{ name: 'combined.log', size: 42 }]);
  });

  it('reads paginated lines', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('a\nb\nc\n');
    const svc = new LogsService(winston);
    const res = await svc.readLogFile('combined.log', 1, 1);
    expect(res.lines).toEqual(['b']);
    expect(res.totalLines).toBe(3);
  });
});
