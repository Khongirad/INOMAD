import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class BankTransferDto {
  @IsString()
  @IsNotEmpty()
  recipientBankRef: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  memo?: string;
}
