type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string }) => Promise<T>;
export type EmailInvitation = { email: string; firstName: string; lastName: string };
export function createEmailInvitationsSource(request: Request) {
  return {
    access: (signal: AbortSignal) => request<{ canInvite: boolean }>('/api/users/invitations/access', { signal }),
    send: (draft: EmailInvitation, signal: AbortSignal) => request<{ email: string; invitation: 'sent' }>('/api/users/invitations', {
      signal, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    }),
  };
}
