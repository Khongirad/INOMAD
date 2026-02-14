import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

class BirthPlaceDto {
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  country?: string;
}

export class RegisterIdentityDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsDateString({}, { message: 'birthDate must be a valid ISO date string' })
  @IsOptional()
  birthDate?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => BirthPlaceDto)
  @IsOptional()
  birthPlace?: BirthPlaceDto;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  nationality?: string;
}

export class VerifyIdentityDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class SuperVerifyDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @IsString()
  @IsNotEmpty()
  justification: string;
}

export class ApproveActivationDto {
  @IsString()
  @IsNotEmpty()
  seatId: string;

  @IsString()
  @IsOptional()
  privateKey?: string;
}

export class RequestActivationDto {
  @IsString()
  @IsOptional()
  privateKey?: string;
}
