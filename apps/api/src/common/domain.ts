import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { trimmed } from '../auth/dto';

export const MONEY = /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/;
export const normalizeName = (value: string) => {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('pt-BR');
  if (normalized.length > 80 || normalized.includes('\0'))
    throw new BadRequestException('Use competências e requisitos de até 80 caracteres válidos.');
  return normalized;
};
export const trimmedList = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((item: unknown) => (typeof item === 'string' ? item.trim() : item))
    : value;

export function uniqueNames(values: string[]) {
  if (new Set(values.map(normalizeName)).size !== values.length)
    throw new BadRequestException('Não repita competências ou requisitos.');
}

export function valueOrNotApplicable(label: string, absent: boolean, hasValue: boolean) {
  if (absent === hasValue)
    throw new BadRequestException(
      `${label}: preencha o campo ou marque Não se aplica, sem combinar as opções.`,
    );
}

export class PageQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(120) q?: string;
}

export class VersionDto {
  @IsInt() @Min(1) version!: number;
}
