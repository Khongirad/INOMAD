import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateElectionDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  @IsNotEmpty()
  startDate: string;

  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  @IsNotEmpty()
  endDate: string;
}

export class AddCandidateDto {
  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @IsString()
  @IsOptional()
  platform?: string;
}

export class CastVoteDto {
  @IsString()
  @IsNotEmpty()
  candidateId: string;
}
