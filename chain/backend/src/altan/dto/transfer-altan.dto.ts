import { IsString, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';

export class TransferAltanDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string; // Seat ID or Wallet Address

  @IsNumber()
  @IsPositive()
  amount: number;
}
