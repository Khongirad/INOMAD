import { IsString, IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdatePolicyDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  officialRate?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  reserveRequirement?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  dailyEmissionLimit?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
