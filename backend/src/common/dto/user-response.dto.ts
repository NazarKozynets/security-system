import { UserStatus } from '@prisma/client';

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

export const mapUserResponse = (user: any): UserResponseDto => {
  const roles = (user.userRoles
    ?.map((ur: any) => ur.role?.name ?? ur.roleName)
    .filter(Boolean) ?? []) as string[];
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
