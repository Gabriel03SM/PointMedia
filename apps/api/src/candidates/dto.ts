import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { PROFILE_FIELDS, SENIORITIES, type ProfileField, type Seniority } from '@pointmedia/shared';
import { trimmed } from '../auth/dto';
import { MONEY, PageQuery, trimmedList } from '../common/domain';

export class CandidatesQuery extends PageQuery {
  @IsOptional() @IsIn(SENIORITIES) seniority?: Seniority;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(80) skill?: string;
  @IsIn(['recent', 'name']) sort: 'recent' | 'name' = 'recent';
}

export class ExperienceDto {
  @Transform(trimmed) @IsString() @Length(2, 160) company!: string;
  @Transform(trimmed) @IsString() @Length(2, 160) position!: string;
  @IsString() @Matches(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/) startedMonth!: string;
  @IsOptional() @IsString() @Matches(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/) endedMonth?: string | null;
  @Transform(trimmed) @IsString() @MaxLength(2000) description!: string;
}
export class EducationDto {
  @Transform(trimmed) @IsString() @Length(2, 160) institution!: string;
  @Transform(trimmed) @IsString() @Length(2, 160) course!: string;
  @IsInt() @Min(1900) @Max(2099) startedYear!: number;
  @IsOptional() @IsInt() @Min(1900) @Max(2099) finishedYear?: number | null;
}
export class ProfessionalDto {
  @IsInt() @Min(0) version!: number;
  @Transform(trimmed) @IsString() @Length(2, 120) name!: string;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(30) @Matches(/^[\d+()\s.-]*$/) phone?:
    string | null;
  @Transform(trimmed) @IsString() @Length(2, 120) headline!: string;
  @IsOptional() @Transform(trimmed) @IsString() @Length(2, 160) location?: string | null;
  @IsOptional() @IsIn(SENIORITIES) seniority?: Seniority | null;
  @IsOptional() @IsString() @Matches(MONEY) expectedSalary?: string | null;
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  linkedin?: string | null;
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  portfolio?: string | null;
  @Transform(trimmed) @IsString() @Length(150, 5000) about!: string;
  @Transform(trimmedList)
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  skills!: string[];
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience!: ExperienceDto[];
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education!: EducationDto[];
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(PROFILE_FIELDS.length)
  @IsIn(PROFILE_FIELDS, { each: true })
  notApplicable!: ProfileField[];
  @IsBoolean() shareWithRecruiters!: boolean;
}
