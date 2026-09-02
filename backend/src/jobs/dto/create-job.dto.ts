import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Seniority } from '../../generated/prisma/enums.js';

export class CreateJobDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  description: string;

  @IsString()
  @MaxLength(100)
  area: string;

  @IsOptional()
  @IsEnum(Seniority)
  seniority?: Seniority;

  @IsOptional()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @Min(0)
  salaryMax?: number;

  @IsDateString()
  applicationDeadline: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  technologyWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  seniorityWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  salaryWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  differentialWeight?: number;
}
