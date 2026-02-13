import { api } from './client';

// ─── Citizenship API ───

/** Grant initial exclusive land right */
export const grantExclusiveRight = (data: { userId: string; grantedBy: string }) =>
  api.post('/citizenship/exclusive-right/grant', data);

/** Inherit exclusive right from father to son */
export const inheritExclusiveRight = (data: { fatherId: string; sonId: string }) =>
  api.post('/citizenship/exclusive-right/inherit', data);

/** Revert exclusive right to State Land Fund */
export const revertExclusiveRight = (data: { userId: string }) =>
  api.post('/citizenship/exclusive-right/revert', data);

/** Get exclusive right transfer history */
export const getExclusiveRightHistory = (userId: string) =>
  api.get<any[]>(`/citizenship/exclusive-right/history/${userId}`);

/** Delegate Khural seat to spouse */
export const delegateKhuralSeat = (data: { holderId: string; delegateId: string }) =>
  api.post('/citizenship/khural/delegate', data);

/** Revoke Khural seat delegation */
export const revokeKhuralDelegation = (data: { holderId: string }) =>
  api.post('/citizenship/khural/delegate/revoke', data);

/** Apply for citizenship (RESIDENT → CITIZEN) */
export const applyForCitizenship = (data: { applicantId: string }) =>
  api.post('/citizenship/admission/apply', data);

/** Vote on citizenship admission */
export const voteOnAdmission = (admissionId: string, data: { voterId: string; vote: 'FOR' | 'AGAINST' }) =>
  api.post(`/citizenship/admission/${admissionId}/vote`, data);

/** Get pending citizenship admissions */
export const getPendingAdmissions = () =>
  api.get<any[]>('/citizenship/admissions/pending');

/** Check if user can participate in legislature (Khural) */
export const checkLegislativeEligibility = (userId: string) =>
  api.get<{ eligible: boolean; reason?: string }>(`/citizenship/eligibility/legislative/${userId}`);

/** Check if user can participate in government (executive/judicial/banking) */
export const checkGovernmentEligibility = (userId: string) =>
  api.get<{ eligible: boolean; reason?: string }>(`/citizenship/eligibility/government/${userId}`);
