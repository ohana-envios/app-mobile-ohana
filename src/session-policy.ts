export type AdminSession = { accessToken: string; expiresAt: number; name: string };

export function makeAdminSession(accessToken: string, expiresIn: number, user: unknown, now: number): AdminSession {
  if (typeof accessToken !== 'string' || !accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0 || !Number.isFinite(now)) throw new Error('Sesión inválida');
  if (!user || typeof user !== 'object' || !('role' in user) || !('enabled' in user) || !('displayName' in user) ||
      user.role !== 'ADMIN' || user.enabled !== true || typeof user.displayName !== 'string' || !user.displayName.trim()) throw new Error('Acceso no habilitado');
  return { accessToken, expiresAt: now + Math.min(expiresIn * 1000, 2_147_000_000), name: user.displayName };
}
