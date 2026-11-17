import { IsBoolean, IsIn, IsOptional, IsUUID, IsString, Length, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  APPLICATION_STATUSES,
  PROCESS_CONSENT_VERSION,
  TALENT_CONSENT_VERSION,
  type ApplicationStatus,
} from '@pointmedia/shared';
import { PageQuery, VersionDto } from '../common/domain';
import { trimmed } from '../auth/dto';

export class ApplicationDto {
  @IsUUID() jobId!: string;
  @IsBoolean() processConsent!: boolean;
  @IsIn([PROCESS_CONSENT_VERSION]) processConsentVersion!: string;
  @IsBoolean() talentPoolConsent!: boolean;
  @IsOptional() @IsIn([TALENT_CONSENT_VERSION]) talentConsentVersion?: string;
}

export class ApplicationsQuery extends PageQuery {
  @IsOptional() @IsUUID() jobId?: string;
  @IsOptional() @IsIn(APPLICATION_STATUSES) status?: ApplicationStatus;
}

export class ApplicationTransitionDto extends VersionDto {
  @IsIn(APPLICATION_STATUSES) status!: ApplicationStatus;
  @Transform(trimmed) @IsString() @Length(1, 2000) internalReason!: string;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(2000) publicMessage?: string;
}

export class RecruiterNoteDto {
  @Transform(trimmed) @IsString() @Length(1, 2000) body!: string;
}
