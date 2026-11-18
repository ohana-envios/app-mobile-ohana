import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field } from './Controls';
import { styles as s } from './styles';
import type { UsersSource, UserSummary } from './users/types';
import type { RegistrationsSource } from './registrations';
export function InvitationAction({ source, user }: { source: UsersSource; user: UserSummary }) {
  const [invitation, setInvitation] = useState<{ code: string; expiresAt: string } | null>(null); const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  if (!source.issueInvitation || user.role === 'CUSTOMER' || user.enabled) return null;
  async function issue() { if (busy || !source.issueInvitation) return; const controller = new AbortController(); pending.current = controller; setBusy(true); setError(''); setInvitation(null);
    try { const result = await source.issueInvitation(user.id, controller.signal); if (!controller.signal.aborted) { setInvitation(result); setConfirm(false); } }
    catch { if (!controller.signal.aborted) setError('No se pudo generar. Verificá que la cuenta esté deshabilitada y todavía no tenga una identidad vinculada.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <View><Button title="Generar invitación" disabled={busy} onPress={() => setConfirm(true)} />
    {confirm && <><Text style={s.text}>Al generar otra invitación, las anteriores dejan de funcionar.</Text><Button title="Confirmar" disabled={busy} onPress={() => void issue()} /><Button title="Cancelar" disabled={busy} onPress={() => setConfirm(false)} /></>}
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {invitation && <><Text style={s.text}>Compartí este código de forma segura con {user.displayName}. Vence: {new Date(invitation.expiresAt).toLocaleString('es-UY')}.</Text><Text selectable style={s.text}>{invitation.code}</Text><Text style={s.muted}>Se muestra solo ahora. La persona debe entrar con su correo verificado; después un administrador habilita el acceso.</Text></>}
  </View>;
}
export function InvitationClaim({ source }: { source: RegistrationsSource }) {
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null); useEffect(() => () => pending.current?.abort(), []);
  async function claim() { if (busy) return; const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { await source.claimInvitation(code.trim(), controller.signal); if (!controller.signal.aborted) { setCode(''); setDone(true); } }
    catch { if (!controller.signal.aborted) setError('No se pudo usar la invitación. Verificá el código, su vigencia y que hayas ingresado con el correo indicado.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <View style={s.card}><Text accessibilityRole="header" style={s.heading}>¿Tenés una invitación?</Text>
    {done ? <Text accessibilityLiveRegion="polite" style={s.text}>Tu identidad quedó vinculada. Un administrador debe habilitar tu acceso.</Text> : <><Text style={s.muted}>Ingresá con el correo verificado al que está destinada la invitación.</Text>
      <Field label="Código de invitación" kind="code" value={code} maxLength={43} onChange={setCode} />
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}<Button title={busy ? 'Vinculando…' : 'Vincular identidad'} disabled={busy || !code.trim()} onPress={() => void claim()} /></>}
  </View>;
}
