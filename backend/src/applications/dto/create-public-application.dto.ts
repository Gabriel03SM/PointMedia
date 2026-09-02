import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { Seniority } from '../../generated/prisma/enums.js';

export class CreatePublicApplicationDto {
  @IsString()
  jobId: string;

  @IsString() @MaxLength(150)
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @IsOptional() @IsString() @MaxLength(100)
  state?: string;

  @IsOptional() @IsUrl() @MaxLength(500)
  linkedinUrl?: string;

  @IsOptional() @IsUrl() @MaxLength(500)
  portfolioUrl?: string;

  @IsOptional() @IsString()
  professionalBio?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  salaryExpectation?: number;

  @IsOptional() @IsEnum(Seniority)
  seniority?: Seniority;

  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(100, { each: true })
  skills?: string[];
}
