import { IsEnum, IsString, IsOptional } from 'class-validator';

export enum GuildType {
  CLAN = 'CLAN',
  PROFESSION = 'PROFESSION',
  ORGANIZATION = 'ORGANIZATION',
  GOVERNMENT = 'GOVERNMENT',
}

export class CreateGuildDto {
  @IsEnum(GuildType)
  type: GuildType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  professionId?: string;
}

export class JoinGuildDto {
  @IsString()
  guildId: string;
}
