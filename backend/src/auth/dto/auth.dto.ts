import { IsString, IsNotEmpty, IsEthereumAddress } from 'class-validator';

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
