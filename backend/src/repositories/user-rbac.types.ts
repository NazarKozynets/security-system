import { UserStatus } from '@prisma/client';

// Shape expected by mapUserResponse / auth userContext
export type RoleWithPerms = {
  id: number;
  name: string;
  rolePermissions: { permission: { code: string } }[];
};

// Read model for User with RBAC (Role-Based Access Control) info
export type UserWithRbac = {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  failedLoginCount: number;
  lockoutUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userRoles: { role: RoleWithPerms }[];
};

// Result of $queryRaw
export type UserRbacFlatRow = {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  failedLoginCount: number;
  lockoutUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roleId: number | null;
  roleName: string | null;
  permCode: string | null;
};
