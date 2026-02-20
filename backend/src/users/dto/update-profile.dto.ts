import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsObject,
  IsEnum,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  gender?: string;

  @IsDateString({}, { message: 'dateOfBirth must be a valid ISO date string' })
  @IsOptional()
  dateOfBirth?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ethnicity?: string[];

  @IsObject()
  @IsOptional()
  birthPlace?: Record<string, any>;

  @IsString()
  @IsOptional()
  clan?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsObject()
  @IsOptional()
  currentAddress?: Record<string, any>;

  @IsString()
  @IsOptional()
  language?: string;
}
