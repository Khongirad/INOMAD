import { IsEnum, IsInt, IsOptional, IsString, IsUUID, IsDateString, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum KhuralElectionType {
  CONFEDERATION = 'CONFEDERATION',    // Top-level: elect Confederative Khural seats
  REPUBLICAN    = 'REPUBLICAN',       // Republic-level
  TUMEN         = 'TUMEN',
}

export class CreateKhuralElectionDto {
  @ApiProperty({ enum: KhuralElectionType })
  @IsEnum(KhuralElectionType)
  electionType: KhuralElectionType;

  @ApiProperty({ description: 'Scope: confederationId / republicId / tumenId' })
  @IsString()
  scopeId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  nominationDeadline: string;

  @ApiProperty()
  @IsDateString()
  votingStart: string;

  @ApiProperty()
  @IsDateString()
  votingEnd: string;

  @ApiPropertyOptional({ description: 'Number of seats to fill', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seatsCount?: number;
}

export class RegisterCandidateDto {
  @ApiProperty()
  @IsUUID()
  electionId: string;

  @ApiPropertyOptional({ description: 'Candidate manifesto/platform' })
  @IsOptional()
  @IsString()
  platform?: string;
}

export class CastBallotDto {
  @ApiProperty()
  @IsUUID()
  electionId: string;

  @ApiProperty()
  @IsUUID()
  candidateId: string; // userId of chosen candidate
}

export class AppointProvisionalCIKDto {
  @ApiProperty({ description: 'userIds of CIK members (3–7 people)' })
  memberIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mandate?: string; // Public mandate statement
}
