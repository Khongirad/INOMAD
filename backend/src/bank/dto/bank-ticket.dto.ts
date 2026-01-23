import { IsString, IsNotEmpty } from 'class-validator';

export class BankNonceDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class BankTicketDto {
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
