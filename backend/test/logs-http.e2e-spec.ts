import { CanActivate, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { LoggerIntegrationModule } from '../src/integrations/logger/logger.module';
import { LogsModule } from '../src/modules/logs/logs.module';

class AllowAllGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe('Logs file API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerIntegrationModule,
        LogsModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: AllowAllGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /logs/files returns array', async () => {
    const res = await request(app.getHttpServer())
      .get('/logs/files')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
