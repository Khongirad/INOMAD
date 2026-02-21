import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HierarchyLevel, JudicialVerdictType } from '@prisma/client';

export class FileJudicialCaseDto {
  @ApiProperty({ description: 'Case title / dispute name' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Full description of the dispute and facts' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'defendantId (userId) — optional if suing an org' })
  @IsOptional()
  @IsUUID()
  defendantId?: string;

  @ApiPropertyOptional({ description: 'defendantOrgId — if suing an organization' })
  @IsOptional()
  @IsString()
  defendantOrgId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defendantOrgName?: string;

  @ApiPropertyOptional({ description: 'Evidence artifact URL or hash' })
  @IsOptional()
  @IsString()
  evidence?: string;

  @ApiProperty({ enum: HierarchyLevel, description: 'Which court level should handle this' })
  @IsEnum(HierarchyLevel)
  level: HierarchyLevel;

  @ApiPropertyOptional({ description: 'Geographic scope ID' })
  @IsOptional()
  @IsString()
  scopeId?: string;
}

export class AcceptCaseDto {
  @ApiProperty()
  @IsUUID()
  caseId: string;
}

export class AddHearingDto {
  @ApiProperty()
  @IsUUID()
  caseId: string;

  @ApiProperty({ description: 'Scheduled hearing date (ISO datetime)' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class IssueVerdictDto {
  @ApiProperty()
  @IsUUID()
  caseId: string;

  @ApiProperty({ enum: JudicialVerdictType })
  @IsEnum(JudicialVerdictType)
  verdict: JudicialVerdictType;

  @ApiProperty({ description: 'Full written reasoning' })
  @IsString()
  reasoning: string;

  @ApiPropertyOptional({ description: 'Penalty: fine, community service, etc.' })
  @IsOptional()
  @IsString()
  penalty?: string;
}
