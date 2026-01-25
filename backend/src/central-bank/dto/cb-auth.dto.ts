import { IsString, IsNotEmpty } from 'class-validator';

export class CBNonceDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CBTicketDto {
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
