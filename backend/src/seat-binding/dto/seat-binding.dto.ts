import { IsString, IsEthereumAddress } from 'class-validator';

export class BindSeatDto {
  @IsString()
  seatId: string;

  @IsEthereumAddress()
  walletAddress: string;
}

export class SyncSeatsDto {
  @IsEthereumAddress()
  walletAddress: string;
}
