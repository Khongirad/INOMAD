export enum CivilStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
}

export const CIVIL_STATUS_LABELS: Record<CivilStatus, string> = {
  [CivilStatus.SINGLE]: 'Single',
  [CivilStatus.MARRIED]: 'Married',
  [CivilStatus.DIVORCED]: 'Divorced',
  [CivilStatus.WIDOWED]: 'Widowed',
};
