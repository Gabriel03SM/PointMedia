import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

class SelectionStageDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  position: number;

  @IsBoolean()
  isFinal: boolean;
}

export class ReplaceStagesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SelectionStageDto)
  stages: SelectionStageDto[];
}
