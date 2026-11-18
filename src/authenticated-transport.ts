type Session = { accessToken: string; expiresAt: number };
type RequestOptions = { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string };

export function createAuthenticatedTransport(baseUrl: string, session: Session) {
  return async function request<T>(path: string, init: RequestOptions): Promise<T> {
    if (Date.now() >= session.expiresAt) throw new Error('Sesión vencida');
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session.accessToken}` } });
    if (!response.ok) throw Object.assign(new Error('Consulta no disponible'), { status: response.status });
    return response.json() as Promise<T>;
  };
}
