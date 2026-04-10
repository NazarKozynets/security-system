import { UserRbacFlatRow, UserWithRbac } from './user-rbac.types';

// Maps UserRbacFlatRow ($queryRaw result) to UserWithRbac (read model)
export function buildUserWithRbacFromFlatRows(
  rows: UserRbacFlatRow[],
): UserWithRbac | null {
  if (!rows.length) return null;
  const base = rows[0];
  const roleMap = new Map<
    number,
    {
      id: number;
      name: string;
      rolePermissions: { permission: { code: string } }[];
    }
  >();

  for (const row of rows) {
    if (row.roleId == null || row.roleName == null) continue;
    if (!roleMap.has(row.roleId)) {
      roleMap.set(row.roleId, {
        id: row.roleId,
        name: row.roleName,
        rolePermissions: [],
      });
    }
    const role = roleMap.get(row.roleId)!;
    if (
      row.permCode &&
      !role.rolePermissions.some((rp) => rp.permission.code === row.permCode)
    ) {
      role.rolePermissions.push({ permission: { code: row.permCode } });
    }
  }

  return {
    id: base.id,
    email: base.email,
    passwordHash: base.passwordHash,
    firstName: base.firstName,
    lastName: base.lastName,
    status: base.status,
    failedLoginCount: base.failedLoginCount,
    lockoutUntil: base.lockoutUntil,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    userRoles: [...roleMap.values()].map((role) => ({ role })),
  };
}
