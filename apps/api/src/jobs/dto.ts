import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import {
  SENIORITIES,
  WORK_MODES,
  JOB_STATUSES,
  type Seniority,
  type WorkMode,
  type JobStatus,
} from '@pointmedia/shared';
import { trimmed } from '../auth/dto';
import { MONEY, PageQuery, trimmedList, VersionDto } from '../common/domain';

export class JobDto {
  @Transform(trimmed) @IsString() @Length(3, 160) title!: string;
  @Transform(trimmed) @IsString() @Length(20, 12000) description!: string;
  @IsOptional() @Transform(trimmed) @IsString() @Length(2, 120) department?: string;
  @IsIn(WORK_MODES) workMode!: WorkMode;
  @IsOptional() @IsIn(SENIORITIES) seniority?: Seniority | null;
  @IsBoolean() seniorityNotApplicable!: boolean;
  @IsOptional() @Transform(trimmed) @IsString() @Length(2, 160) location?: string | null;
  @IsBoolean() locationNotApplicable!: boolean;
  @IsOptional() @IsString() @Matches(MONEY) salaryMin?: string | null;
  @IsOptional() @IsString() @Matches(MONEY) salaryMax?: string | null;
  @IsBoolean() salaryNotApplicable!: boolean;
  @IsISO8601({ strict: true }) @Matches(/T.+(Z|[+-]\d{2}:\d{2})$/) closesAt!: string;
  @Transform(trimmedList)
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  requiredSkills!: string[];
  @Transform(trimmedList)
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  desiredSkills!: string[];
}
export class UpdateJobDto extends JobDto {
  @IsInt() @Min(1) version!: number;
}
export class JobStatusDto extends VersionDto {
  @IsIn(['PUBLISHED', 'CLOSED', 'CANCELLED']) status!: Exclude<JobStatus, 'DRAFT'>;
}
export class PublicJobsQuery extends PageQuery {
  @IsOptional() @IsIn(SENIORITIES) seniority?: Seniority;
  @IsOptional() @IsIn(WORK_MODES) workMode?: WorkMode;
}
export class ManagementJobsQuery extends PageQuery {
  @IsOptional() @IsIn(JOB_STATUSES) status?: JobStatus;
  @IsOptional() @IsString() @MaxLength(120) department?: string;
}
