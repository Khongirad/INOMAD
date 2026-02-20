import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsISO8601,
  IsArray,
  IsObject,
} from 'class-validator';

export class RequestNonceDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class VerifySignatureDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  nonce: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must be at most 30 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  email?: string;

  @IsISO8601({}, { message: 'Date of birth must be in ISO 8601 format (YYYY-MM-DD)' })
  @IsOptional()
  dateOfBirth?: string;

  // Census / demographic fields (optional — collected during registration or later via profile update)
  @IsString()
  @IsOptional()
  gender?: string;

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
}

export class LoginPasswordDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128, { message: 'New password must be at most 128 characters' })
  newPassword: string;
}

// ─── Recovery DTOs ────────────────────────────────────────────────────────────

export class SetSecretQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Answer must be at least 3 characters' })
  answer: string;
}

export class RecoveryViaGuarantorDto {
  @IsString()
  @IsNotEmpty()
  claimedUsername: string;

  @IsString()
  @IsNotEmpty()
  claimedFullName: string;

  @IsISO8601({}, { message: 'Birth date must be in YYYY-MM-DD format' })
  claimedBirthDate: string;

  @IsString()
  @IsOptional()
  claimedBirthCity?: string;

  @IsString()
  @IsNotEmpty()
  guarantorSeatId: string;

  @IsString()
  @IsOptional()
  claimedPassportNumber?: string;
}

export class RecoveryViaSecretQuestionDto {
  @IsString()
  @IsNotEmpty()
  claimedUsername: string;

  @IsString()
  @IsNotEmpty()
  claimedFullName: string;

  @IsISO8601({}, { message: 'Birth date must be in YYYY-MM-DD format' })
  claimedBirthDate: string;

  @IsString()
  @IsNotEmpty()
  secretAnswer: string;
}

export class RecoveryViaOfficialDto {
  @IsString()
  @IsNotEmpty()
  claimedUsername: string;

  @IsString()
  @IsNotEmpty()
  claimedFullName: string;

  @IsISO8601({}, { message: 'Birth date must be in YYYY-MM-DD format' })
  claimedBirthDate: string;

  @IsString()
  @IsOptional()
  claimedBirthCity?: string;

  @IsString()
  @IsNotEmpty()
  claimedPassportNumber: string;

  @IsString()
  @IsOptional()
  claimedPassportSeries?: string;

  @IsString()
  @IsOptional()
  claimedPassportIssuedBy?: string;

  @IsString()
  @IsNotEmpty()
  officialServiceType: 'MIGRATION_SERVICE' | 'COUNCIL';
}

export class ResetPasswordViaTokenDto {
  @IsString()
  @IsNotEmpty()
  recoveryToken: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  newPassword: string;
}

export class OfficialApproveDto {
  @IsString()
  @IsNotEmpty()
  approved: boolean;

  @IsString()
  @IsOptional()
  note?: string;
}

