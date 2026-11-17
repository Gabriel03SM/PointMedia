import { BadRequestException } from '@nestjs/common';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsDefined, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { TALENT_CONSENT_VERSION } from '@pointmedia/shared';
import { ProfessionalDto } from '../candidates/dto';
import { ApplicationDto } from '../applications/dto';
import { RegisterDto } from './dto';

export class RegistrationDto extends RegisterDto {
  @IsDefined() @ValidateNested() @Type(() => ProfessionalDto) profile!: ProfessionalDto;
  @IsOptional() @ValidateNested() @Type(() => ApplicationDto) application?: ApplicationDto;
  @IsOptional() @IsIn([TALENT_CONSENT_VERSION]) talentConsentVersion?: string;
}

export class RegistrationBodyDto {
  @IsDefined()
  @ValidateNested()
  @Transform(({ value }: { value: unknown }) => {
    let data = value;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data) as unknown;
      } catch {
        throw new BadRequestException('Dados de inscrição inválidos.');
      }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new BadRequestException('Preencha os dados completos da inscrição.');
    return plainToInstance(RegistrationDto, data);
  })
  data!: RegistrationDto;
}
