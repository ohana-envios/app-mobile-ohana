export type AdminSession = { accessToken: string; expiresAt: number; name: string };

export function makeAdminSession(accessToken: string, expiresIn: number, user: unknown, now: number): AdminSession {
  if (typeof accessToken !== 'string' || !accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0 || !Number.isFinite(now)) throw new Error('Sesión inválida');
  if (!user || typeof user !== 'object' || !('role' in user) || !('enabled' in user) || !('displayName' in user) ||
      user.role !== 'ADMIN' || user.enabled !== true || typeof user.displayName !== 'string' || !user.displayName.trim()) throw new Error('Acceso no habilitado');
  return { accessToken, expiresAt: now + Math.min(expiresIn * 1000, 2_147_000_000), name: user.displayName };
}

export type CustomerSession = { accessToken: string; expiresAt: number; name: string };
export function makeCustomerSession(accessToken: string, expiresIn: number, user: unknown, now: number): CustomerSession {
  if (typeof accessToken !== 'string' || !accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0 || !Number.isFinite(now)) throw new Error('Sesión inválida');
  if (!user || typeof user !== 'object' || !('role' in user) || !('enabled' in user) || !('displayName' in user) ||
      user.role !== 'CUSTOMER' || user.enabled !== true || typeof user.displayName !== 'string' || !user.displayName.trim()) throw new Error('Acceso no habilitado');
  return { accessToken, expiresAt: now + Math.min(expiresIn * 1000, 2_147_000_000), name: user.displayName };
}

export type StaffSession = { accessToken: string; expiresAt: number; name: string; role: 'OPERATOR' | 'COURIER' };
export function makeStaffSession(accessToken: string, expiresIn: number, user: unknown, now: number): StaffSession {
  if (typeof accessToken !== 'string' || !accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0 || !Number.isFinite(now)) throw new Error('Sesión inválida');
  if (!user || typeof user !== 'object' || !('role' in user) || !('enabled' in user) || !('displayName' in user) ||
      (user.role !== 'OPERATOR' && user.role !== 'COURIER') || user.enabled !== true || typeof user.displayName !== 'string' || !user.displayName.trim()) throw new Error('Acceso no habilitado');
  return { accessToken, expiresAt: now + Math.min(expiresIn * 1000, 2_147_000_000), name: user.displayName, role: user.role };
}
