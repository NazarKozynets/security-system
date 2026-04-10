import { EventType, Severity } from '@prisma/client';
import { SecurityEventsService } from './security-events.service';

describe('SecurityEventsService', () => {
  it('findAll passes filters', async () => {
    const securityEventRepository = {
      findManyPaginated: jest.fn().mockResolvedValue([]),
    };
    const svc = new SecurityEventsService(securityEventRepository as any);
    await svc.findAll({
      page: 1,
      limit: 10,
      eventType: EventType.LOGIN_SUCCESS,
      severity: Severity.LOW,
    });
    expect(securityEventRepository.findManyPaginated).toHaveBeenCalled();
  });

  it('findOne returns event', async () => {
    const securityEventRepository = {
      findById: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const svc = new SecurityEventsService(securityEventRepository as any);
    const row = await svc.findOne(1);
    expect(row?.id).toBe(1);
  });
});
