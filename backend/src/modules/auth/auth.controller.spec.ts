import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  it('login forwards ip and user-agent', async () => {
    const login = jest.fn().mockResolvedValue({ accessToken: 'x' });
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login, register: jest.fn() } }],
    }).compile();
    const controller = moduleRef.get(AuthController);
    await controller.login(
      { email: 'a@b.c', password: 'password123' },
      '1.2.3.4',
      { headers: { 'user-agent': 'jest' } } as any,
    );
    expect(login).toHaveBeenCalledWith(
      { email: 'a@b.c', password: 'password123' },
      '1.2.3.4',
      'jest',
    );
  });

  it('register forwards body to service', async () => {
    const register = jest.fn().mockResolvedValue({ accessToken: 'x' });
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { register, login: jest.fn() } }],
    }).compile();
    const controller = moduleRef.get(AuthController);
    const dto = {
      email: 'new@test.local',
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
    };
    await controller.register(dto);
    expect(register).toHaveBeenCalledWith(dto);
  });
});
