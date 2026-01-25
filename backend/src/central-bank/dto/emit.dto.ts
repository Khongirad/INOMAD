import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class EmitDto {
  @IsString()
  @IsNotEmpty()
  corrAccountId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  memo?: string;
}

export class BurnDto {
  @IsString()
  @IsNotEmpty()
  corrAccountId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
