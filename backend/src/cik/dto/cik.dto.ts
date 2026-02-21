import { IsEnum, IsInt, IsOptional, IsString, IsUUID, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HierarchyLevel, PowerBranchType } from '@prisma/client';

/**
 * Constitutional election ladder:
 *
 *   fromLevel  → toLevel       Electorate
 *   LEVEL_1    → LEVEL_10      Семья → Арбан (family members elect Arbad leader)
 *   LEVEL_10   → LEVEL_100     Арбан-лидеры → Зун (Arbad leaders elect Zun leader)
 *   LEVEL_100  → LEVEL_1000    Зун-лидеры → Мьянган
 *   LEVEL_1000 → LEVEL_10000   Мьянган-лидеры → Тумэн
 *   LEVEL_10000→ REPUBLIC      Тумэн-лидеры → Республика
 *   REPUBLIC   → CONFEDERATION Республика-лидеры → Хурал (Конфедерация)
 *
 *   Each rung is run per-branch: EXECUTIVE / LEGISLATIVE / JUDICIAL / BANKING
 */
export class CreateKhuralElectionDto {
  @ApiProperty({ enum: HierarchyLevel, description: 'Candidates come from leaders at this level' })
  @IsEnum(HierarchyLevel)
  fromLevel: HierarchyLevel;

  @ApiProperty({ enum: HierarchyLevel, description: 'Winners govern/represent at this level' })
  @IsEnum(HierarchyLevel)
  toLevel: HierarchyLevel;

  @ApiProperty({ enum: PowerBranchType, description: 'Branch of government this election fills' })
  @IsEnum(PowerBranchType)
  branch: PowerBranchType;

  @ApiProperty({ description: 'Geographic scope ID (Arbad/Zun/Myangad/Tumed/Republic/Confederation)' })
  @IsString()
  scopeId: string;

  @ApiProperty({ description: 'Human-readable scope name, e.g. "Зун №7"' })
  @IsString()
  scopeName: string;

  @ApiPropertyOptional({ description: 'Optional title override (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Nomination deadline (ISO datetime)' })
  @IsDateString()
  nominationDeadline: string;

  @ApiProperty({ description: 'Voting start (ISO datetime)' })
  @IsDateString()
  votingStart: string;

  @ApiProperty({ description: 'Voting end (ISO datetime)' })
  @IsDateString()
  votingEnd: string;

  @ApiPropertyOptional({ description: 'Seats to fill (default 1 per branch per level)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seatsCount?: number;
}

export class RegisterCandidateDto {
  @ApiProperty()
  @IsUUID()
  electionId: string;

  @ApiPropertyOptional({ description: 'Candidate manifesto — visible to all voters' })
  @IsOptional()
  @IsString()
  platform?: string;
}

export class CastBallotDto {
  @ApiProperty()
  @IsUUID()
  electionId: string;

  @ApiProperty({ description: 'userId of the candidate being voted for' })
  @IsUUID()
  candidateId: string;
}

export class AppointProvisionalCIKDto {
  @ApiProperty({ description: 'userIds of CIK members (3–7 verified citizens)' })
  memberIds: string[];

  @ApiPropertyOptional({ description: 'Public mandate statement' })
  @IsOptional()
  @IsString()
  mandate?: string;
}
