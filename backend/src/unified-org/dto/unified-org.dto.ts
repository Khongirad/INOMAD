import { OrganizationType, BranchType, MemberRole } from '@prisma/client';

// ========================
// Organization DTOs
// ========================

export class CreateOrganizationDto {
  name: string;
  type: OrganizationType;
  branch?: BranchType;
  description?: string;
  level?: number; // 1=Individual, 10=Arbad, 100=Zun, etc.
  parentId?: string;
  republicId?: string;
  republic?: string;
  minMembers?: number;
  maxMembers?: number;
  requiresEducation?: boolean;
  fieldOfStudy?: string;
}

export class UpdateOrganizationDto {
  name?: string;
  description?: string;
  republicId?: string;
  republic?: string;
  minMembers?: number;
  maxMembers?: number;
}

export class AddMemberDto {
  userId: string;
  role?: MemberRole;
  invitedBy?: string;
}

export class ChangeMemberRoleDto {
  userId: string;
  newRole: MemberRole;
}

export class TransferLeadershipDto {
  newLeaderId: string;
}

export class RateOrganizationDto {
  category: string; // TRUST, QUALITY, FINANCIAL, LEADERSHIP, INNOVATION
  score: number; // 1-10
  comment?: string;
  contractId?: string;
}

// ========================
// Hierarchy DTOs
// ========================

export class CreateMyangadDto {
  name: string;
  region: string;
  description?: string;
}

export class CreateTumedDto {
  name: string;
  region: string;
  description?: string;
}

export class CreateRepublicDto {
  name: string;
  republicKey: string; // "buryad", "russian", "tuvan"
  description?: string;
}

// ========================
// Permission DTOs
// ========================

export class SetPermissionsDto {
  role: MemberRole;
  canInviteMembers?: boolean;
  canRemoveMembers?: boolean;
  canCreateTasks?: boolean;
  canAssignTasks?: boolean;
  canVote?: boolean;
  canCreateProposal?: boolean;
  canManageTreasury?: boolean;
  canSignDocuments?: boolean;
  canCallElection?: boolean;
  canEditOrgInfo?: boolean;
  canViewReports?: boolean;
  canCreateReports?: boolean;
  canManageRoles?: boolean;
  canArchive?: boolean;
}
