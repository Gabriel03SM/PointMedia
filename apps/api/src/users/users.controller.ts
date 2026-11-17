import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/access';
import type { AuthRequest } from '../common/http';
import { CreateRecruiterDto, UpdateAccountDto } from './dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get('me') me(@Req() req: AuthRequest) {
    return req.currentUser;
  }
  @Patch('me') update(@Req() req: AuthRequest, @Body() dto: UpdateAccountDto) {
    return this.users.updateOwn(req.currentUser.id, dto);
  }
  @Roles('ADMIN') @Post('recruiters') createRecruiter(
    @Req() req: AuthRequest,
    @Body() dto: CreateRecruiterDto,
  ) {
    return this.users.createRecruiter(dto, req.currentUser.id);
  }
}
