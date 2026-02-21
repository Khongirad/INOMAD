import { IsEnum, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export enum KhuralLevel {
  ARBAD = 'ARBAD',
  ZUUN = 'ZUUN',
  MYANGAD = 'MYANGAD',
  TUMED = 'TUMED',
}

export class CreateKhuralGroupDto {
  @IsEnum(KhuralLevel)
  level: KhuralLevel;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parentGroupId?: string;
}

export class ApplySeatDto {
  @IsInt()
  @Min(0)
  @Max(9)
  seatIndex: number;
}

export class AssignSeatDto {
  @IsInt()
  @Min(0)
  @Max(9)
  seatIndex: number;

  @IsString()
  userId: string;
}
