import { CanActivate, Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

@Controller('reports')
class FakeReportsController {
  @Get('dashboard')
  dashboard() {
    return { totalUsers: 3 };
  }
}

class DenyGuard implements CanActivate {
  canActivate(): boolean {
    return false;
  }
}

class AllowGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

describe('Reports auth guard (e2e)', () => {
  let app: INestApplication;

  it('returns 403 when auth guard denies', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FakeReportsController],
      providers: [{ provide: APP_GUARD, useClass: DenyGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/reports/dashboard').expect(403);
    await app.close();
  });

  it('returns 200 when auth guard allows', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FakeReportsController],
      providers: [{ provide: APP_GUARD, useClass: AllowGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .get('/reports/dashboard')
      .expect(200)
      .expect({ totalUsers: 3 });
    await app.close();
  });
});
