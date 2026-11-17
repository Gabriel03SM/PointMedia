import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class MetricPeriodQuery {
  @Type(() => Number) @IsIn([7, 30, 90, 365]) days = 30;
}
export class RecruitmentMetricsQuery extends MetricPeriodQuery {
  @IsOptional() @IsUUID() jobId?: string;
}
