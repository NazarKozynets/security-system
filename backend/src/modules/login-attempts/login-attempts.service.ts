import { Injectable } from '@nestjs/common';
import {LoginAttemptRepository, LoginAttemptRow} from '../../repositories/login-attempt.repository';

// Interface for LoginAttemptsService
interface ILoginAttemptsService {
  // Find all login attempts with pagination
  findAll(page?: number, limit?: number): Promise<LoginAttemptRow[]>;

  // Find a single login attempt by ID
  findOne(id: number): Promise<LoginAttemptRow | null>;
}

@Injectable()
export class LoginAttemptsService implements ILoginAttemptsService {
  constructor(
    private readonly loginAttemptRepository: LoginAttemptRepository,
  ) {}

  // Find all login attempts with pagination
  findAll(page = 1, limit = 20): Promise<LoginAttemptRow[]> {
    return this.loginAttemptRepository.findManyPaginated(page, limit);
  }

  // Find a single login attempt by ID
  findOne(id: number): Promise<LoginAttemptRow | null> {
    return this.loginAttemptRepository.findById(id);
  }
}
