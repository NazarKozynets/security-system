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

  it('findOne returns event', async () => {
    const prisma: any = {
      securityEvent: {
        findUnique: jest.fn().mockResolvedValue({ id: 3, description: 'x' }),
      },
    };
    const svc = new SecurityEventsService(prisma);
    const ev = await svc.findOne(3);
    expect(ev?.id).toBe(3);
    expect(prisma.securityEvent.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
    });
  });
});
