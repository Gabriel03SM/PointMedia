import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config';
import { PrismaService } from './prisma.service';

@Global()
@Module({})
export class DatabaseModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: APP_CONFIG, useValue: config }, PrismaService],
      exports: [APP_CONFIG, PrismaService],
    };
  }
}
