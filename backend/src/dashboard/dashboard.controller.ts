import { Controller, Get, Req } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../generated/prisma/enums.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@Roles(UserRole.RECRUITER, UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getSummary(request.user);
  }
}
