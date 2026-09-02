import { IsOptional, IsString } from 'class-validator';

export class MoveApplicationStageDto {
  @IsString()
  stageId: string;

  @IsOptional()
  @IsString()
  note?: string;
}
