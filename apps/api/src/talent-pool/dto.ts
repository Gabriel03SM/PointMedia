import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { TALENT_CONSENT_VERSION } from '@pointmedia/shared';
import { CandidatesQuery } from '../candidates/dto';
import { trimmed } from '../auth/dto';
import { MONEY } from '../common/domain';

export class TalentConsentDto {
  @IsBoolean() consent!: boolean;
  @IsIn([TALENT_CONSENT_VERSION]) consentVersion!: string;
}

export class TalentQuery extends CandidatesQuery {
  @IsOptional() @Transform(trimmed) @IsString() @Length(1, 160) location?: string;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(160) education?: string;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(160) experience?: string;
  @IsOptional() @IsString() @Matches(MONEY) salaryMin?: string;
  @IsOptional() @IsString() @Matches(MONEY) salaryMax?: string;
}
