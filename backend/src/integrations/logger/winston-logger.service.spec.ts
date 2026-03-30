import { ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from './winston-logger.service';

describe('WinstonLoggerService', () => {
  it('exposes rootDir and logger', () => {
    const config = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'LOG_DIR') return def ?? 'logs';
        if (key === 'LOG_LEVEL') return 'info';
        if (key === 'NODE_ENV') return 'test';
        return def;
      }),
    } as unknown as ConfigService;
    const svc = new WinstonLoggerService(config);
    expect(svc.rootDir).toBeDefined();
    expect(svc.logger).toBeDefined();
  });
});
