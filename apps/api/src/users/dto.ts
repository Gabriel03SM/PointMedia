import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { RegisterDto, normalizedEmail, trimmed } from '../auth/dto';

export class UpdateAccountDto {
  @Transform(trimmed) @IsString() @Length(2, 120) name!: string;
  @Transform(normalizedEmail) @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(30) @Matches(/^[\d+()\s.-]*$/) phone?:
    string | null;
}

export class CreateRecruiterDto extends RegisterDto {
  @Transform(trimmed) @IsString() @Length(2, 120) jobTitle!: string;
}
