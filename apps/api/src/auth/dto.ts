import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export const normalizedEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
export const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  @Transform(normalizedEmail) @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Length(1, 128) password!: string;
}

export class RegisterDto {
  @Transform(trimmed) @IsString() @Length(2, 120) name!: string;
  @Transform(normalizedEmail) @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Length(12, 128) password!: string;
}

export class ChangePasswordDto {
  @IsString() @Length(1, 128) currentPassword!: string;
  @IsString() @Length(12, 128) newPassword!: string;
}
