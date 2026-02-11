// ============ Auth Types ============

export interface AuthUser {
  userId: string;
  seatId: string;
  username: string;
  address?: string;
  role: string;
  roles?: string[];
  status: string;
  walletStatus: string;
  hasAcceptedTOS: boolean;
  hasAcceptedConstitution: boolean;
  isLegalSubject: boolean;
  hasBankLink?: boolean;
  bankCode?: string | null;
}

export interface AuthResponse {
  ok: boolean;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}
