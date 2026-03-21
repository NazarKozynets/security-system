import { Module } from '@nestjs/common';
import { LoginAttemptsController } from './login-attempts.controller';
import { LoginAttemptsService } from './login-attempts.service';

@Module({
  controllers: [LoginAttemptsController],
  providers: [LoginAttemptsService],
})
export class LoginAttemptsModule {}
