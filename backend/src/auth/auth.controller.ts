import { Body, Controller, Get, Ip, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request & { headers: Record<string, string> },
  ) {
    return this.authService.login(dto, ip, req.headers['user-agent']);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: { id: number }) {
    return this.authService.me(user.id);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto, @CurrentUser() user: { id: number }) {
    return this.authService.logout(user.id, dto.refreshToken);
  }
}
