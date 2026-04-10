import { UserStatus } from '@prisma/client';

// DTO with user info
export class UserResponseDto {
  id!: number;
  email!: string;
  firstName!: string;
  lastName!: string;
  status!: UserStatus;
  roles!: string[];
  permissions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// DTO with auth response
export class AuthPayloadDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: UserResponseDto;
}

// Maps UserWithRbac (read model) to UserResponseDto
export const mapUserResponse = (user: any): UserResponseDto => {
  // Get role names
  const roles = (user.userRoles
    ?.map((ur: any) => ur.role?.name ?? ur.roleName)
    .filter(Boolean) ?? []) as string[];

  // Get permission codes
  const permissions = user.userRoles
    ? ([
        ...new Set(
          user.userRoles.flatMap((ur: any) =>
            (ur.role?.rolePermissions ?? []).map(
              (rp: any) => rp.permission.code,
            ),
          ),
        ),
      ] as string[])
    : undefined;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roles,
    permissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
