import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EvaluationDecision } from '../../generated/prisma/enums.js';

export class CreateEvaluationDto {
  @IsOptional()
  @IsEnum(EvaluationDecision)
  decision?: EvaluationDecision;

  @IsOptional()
  @IsString()
  note?: string;
}
