import { IsString, IsNotEmpty } from 'class-validator';

export class IssueLicenseDto {
  @IsString()
  @IsNotEmpty()
  bankAddress: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;
}

export class RevokeLicenseDto {
  @IsString()
  @IsNotEmpty()
  licenseId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
