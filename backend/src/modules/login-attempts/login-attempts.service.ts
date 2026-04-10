import { Injectable } from '@nestjs/common';
import { LoginAttemptRepository } from '../../repositories/login-attempt.repository';

@Injectable()
export class LoginAttemptsService {
  constructor(
    private readonly loginAttemptRepository: LoginAttemptRepository,
  ) {}
  findAll(page = 1, limit = 20) {
    return this.loginAttemptRepository.findManyPaginated(page, limit);
  }
  findOne(id: number) {
    return this.loginAttemptRepository.findById(id);
  }
}
