type Session = { accessToken: string; expiresAt: number };
type RequestOptions = { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string };

export function createAuthenticatedTransport(baseUrl: string, session: Session) {
  return async function request<T>(path: string, init: RequestOptions): Promise<T> {
    if (Date.now() >= session.expiresAt) throw new Error('Sesión vencida');
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session.accessToken}` } });
    if (!response.ok) {
      let code: string | undefined;
      try { const body: unknown = await response.json(); if (body && typeof body === 'object' && 'code' in body && body.code === 'CUSTOMER_EMAIL_DUPLICATE') code = body.code; } catch { /* Keep the generic error when no structured body is available. */ }
      throw Object.assign(new Error('Consulta no disponible'), { status: response.status, ...(code ? { code } : {}) });
    }
    return response.json() as Promise<T>;
  };
}
