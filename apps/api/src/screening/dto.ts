import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class ScreeningConfigurationDto {
  @IsInt() @Min(0) version!: number;
  @IsInt() @Min(0) @Max(100) skillsWeight!: number;
  @IsInt() @Min(0) @Max(100) seniorityWeight!: number;
  @IsInt() @Min(0) @Max(100) salaryWeight!: number;
  @IsInt() @Min(0) @Max(100) mandatorySkillsShare!: number;
  @IsBoolean() requireCompleteData!: boolean;
}
export class ScreeningRunDto {
  @IsInt() @Min(1) configurationVersion!: number;
  @IsInt() @Min(1) jobVersion!: number;
}
