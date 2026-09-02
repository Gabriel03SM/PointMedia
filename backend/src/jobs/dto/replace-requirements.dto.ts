import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { RequirementType } from '../../generated/prisma/enums.js';

class RequirementDto {
  @IsString()
  @MaxLength(500)
  description: string;

  @IsEnum(RequirementType)
  type: RequirementType;

  @IsInt()
  @Min(1)
  weight: number;
}

export class ReplaceRequirementsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RequirementDto)
  requirements: RequirementDto[];
}
