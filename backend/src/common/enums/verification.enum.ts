export enum VerificationLevel {
  UNVERIFIED = 'unverified',
  ARBAD_MEMBER = 'arbad_member',
  ZUN_APPLICANT = 'zun_applicant',
  FULLY_VERIFIED = 'fully_verified',
}

export const EMISSION_LIMITS: Record<VerificationLevel, number> = {
  [VerificationLevel.UNVERIFIED]: 100,
  [VerificationLevel.ARBAD_MEMBER]: 1000,
  [VerificationLevel.ZUN_APPLICANT]: 1000,
  [VerificationLevel.FULLY_VERIFIED]: Number.MAX_SAFE_INTEGER,
};

export const VERIFICATION_LEVEL_LABELS: Record<VerificationLevel, string> = {
  [VerificationLevel.UNVERIFIED]: 'Unverified',
  [VerificationLevel.ARBAD_MEMBER]: 'Arbad Member',
  [VerificationLevel.ZUN_APPLICANT]: 'Zun Applicant',
  [VerificationLevel.FULLY_VERIFIED]: 'Fully Verified',
};

export const VERIFICATION_LEVEL_DESCRIPTIONS: Record<VerificationLevel, string> = {
  [VerificationLevel.UNVERIFIED]: 'New user with limited access - max 100 Altan emission',
  [VerificationLevel.ARBAD_MEMBER]: 'Peer-verified Arbad member - max 1000 Altan group emission',
  [VerificationLevel.ZUN_APPLICANT]: 'Applied for Zun verification - awaiting approval',
  [VerificationLevel.FULLY_VERIFIED]: 'Fully verified citizen - unlimited emission',
};
