import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  professionId?: string;

  @IsNumber()
  @Min(0)
  rewardAltan: number;

  @IsOptional()
  @IsString()
  postedByGuildId?: string;
}
