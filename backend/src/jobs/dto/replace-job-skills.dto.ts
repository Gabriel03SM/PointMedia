import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

class JobSkillDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsBoolean()
  isRequired: boolean;

  @IsInt()
  @Min(1)
  weight: number;
}

export class ReplaceJobSkillsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => JobSkillDto)
  skills: JobSkillDto[];
}
