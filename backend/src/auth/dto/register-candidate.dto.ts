import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterCandidateDto {
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
