import { IsString, IsOptional } from 'class-validator';

export class CreateProfessionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
