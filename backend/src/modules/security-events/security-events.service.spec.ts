import { SecurityEventsService } from './security-events.service';

describe('SecurityEventsService', () => {
  it('findAll passes filters', async () => {
    const prisma: any = {
      securityEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const svc = new SecurityEventsService(prisma);
    await svc.findAll({
      page: 1,
      limit: 5,
      eventType: undefined,
      severity: undefined,
    });
    expect(prisma.securityEvent.findMany).toHaveBeenCalled();
  });
});
