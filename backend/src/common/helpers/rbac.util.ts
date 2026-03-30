export function userHasAllPermissions(
  userPermissions: string[] | undefined,
  required: string[],
): boolean {
  if (!required.length) return true;
  const set = new Set(userPermissions ?? []);
  return required.every((p) => set.has(p));
}

export function userHasAnyRole(
  userRoles: string[] | undefined,
  required: string[],
): boolean {
  if (!required.length) return true;
  const set = new Set(userRoles ?? []);
  return required.some((r) => set.has(r));
}
