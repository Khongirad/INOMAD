import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PowerBranchType } from '@prisma/client';

export class AssumeRoleDto {
  @ApiProperty({ enum: PowerBranchType })
  @IsEnum(PowerBranchType)
  branch: PowerBranchType;

  @ApiProperty({ example: 'PRESIDENT', description: 'Internal role identifier' })
  @IsString()
  roleName: string;

  @ApiPropertyOptional({ example: 'Президент Сибирской Конфедерации' })
  @IsOptional()
  @IsString()
  roleDisplayName?: string;

  @ApiPropertyOptional({ description: 'Specific organization ID (null = entire branch)' })
  @IsOptional()
  @IsUUID()
  orgId?: string;
}

export class InitiateTransferDto {
  @ApiProperty({ description: 'ID of the provisional role to transfer' })
  @IsUUID()
  provisionalRoleId: string;

  @ApiProperty({ description: 'userId of the citizen receiving power' })
  @IsString()
  transferredToId: string;

  @ApiPropertyOptional({ description: 'Public statement from Creator on vacating' })
  @IsOptional()
  @IsString()
  transferNote?: string;
}

export class LogActionDto {
  @ApiProperty()
  @IsUUID()
  provisionalRoleId: string;

  @ApiProperty({ example: 'APPROVED_MARRIAGE' })
  @IsString()
  action: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
