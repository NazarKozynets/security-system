import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  it('exportLoginAttemptsCsv sets csv headers', async () => {
    const reportsService = {
      loginAttemptsCsv: jest.fn().mockResolvedValue('a,b'),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: reportsService }],
    }).compile();
    const controller = moduleRef.get(ReportsController);
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;
    await controller.exportLoginAttemptsCsv(res, { id: 1 } as any);
    expect(reportsService.loginAttemptsCsv).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
  });
});
