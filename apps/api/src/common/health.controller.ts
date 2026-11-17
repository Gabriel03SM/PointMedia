import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Public } from '../auth/access';
import { PrismaService } from '../database/prisma.service';

@Public()
@Controller()
export class HealthController {
  constructor(private readonly db: PrismaService) {}
  @Get('health/live') live() {
    return { status: 'up' };
  }
  @Get('health/ready') async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch {
      throw new ServiceUnavailableException('Serviço temporariamente indisponível.');
    }
  }
  @Get('openapi.json') openapi(): unknown {
    return JSON.parse(readFileSync(resolve(__dirname, '../../../../docs/openapi.json'), 'utf8'));
  }
}
