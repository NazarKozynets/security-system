import { userHasAllPermissions, userHasAnyRole } from './rbac.util';

describe('rbac.util', () => {
  describe('userHasAllPermissions', () => {
    it('returns true when no permissions required', () => {
      expect(userHasAllPermissions([], [])).toBe(true);
      expect(userHasAllPermissions(undefined, [])).toBe(true);
    });

    it('returns true when user has all permissions', () => {
      expect(userHasAllPermissions(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('returns false when a permission is missing', () => {
      expect(userHasAllPermissions(['a'], ['a', 'b'])).toBe(false);
    });
  });

  describe('userHasAnyRole', () => {
    it('returns true when no roles required', () => {
      expect(userHasAnyRole([], [])).toBe(true);
    });

    it('returns true when user has one of the roles', () => {
      expect(userHasAnyRole(['admin', 'user'], ['admin'])).toBe(true);
    });

    it('returns false when no role matches', () => {
      expect(userHasAnyRole(['user'], ['admin'])).toBe(false);
    });
  });
});
