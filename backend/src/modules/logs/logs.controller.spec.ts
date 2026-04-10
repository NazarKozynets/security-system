import { Test } from '@nestjs/testing';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';

describe('LogsController', () => {
  it('delegates listFiles', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LogsController],
      providers: [
        {
          provide: LogsService,
          useValue: {
            listFiles: jest
              .fn()
              .mockResolvedValue([{ name: 'combined.log', size: 1 }]),
          },
        },
      ],
    }).compile();
    const controller = moduleRef.get(LogsController);
    await expect(controller.listFiles()).resolves.toEqual([
      { name: 'combined.log', size: 1 },
    ]);
  });
});
