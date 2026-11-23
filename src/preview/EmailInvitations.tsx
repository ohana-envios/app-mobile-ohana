import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field } from './Controls';
import { styles as s } from './styles';
import type { createEmailInvitationsSource } from './email-invitations';

type Source = ReturnType<typeof createEmailInvitationsSource>;
export function EmailInvitations({ source }: { source: Source }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setAllowed(null);
    source.access(controller.signal).then((result) => { if (!controller.signal.aborted) setAllowed(result.canInvite === true); }).catch(() => { if (!controller.signal.aborted) setAllowed(false); });
    return () => { controller.abort(); pending.current?.abort(); };
  }, [source]);
  async function send() {
    if (busy || pending.current) return;
    if (!firstName.trim() || !lastName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ error: true, text: 'Completá nombre, apellido y un correo válido.' }); return;
    }
    const controller = new AbortController(); pending.current = controller; setBusy(true); setMessage(null);
    try {
      const result = await source.send({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() }, controller.signal);
      if (!controller.signal.aborted) { setMessage({ error: false, text: `Invitación enviada a ${result.email}. La persona podrá activar su cuenta y configurar el acceso.` }); setEmail(''); setFirstName(''); setLastName(''); }
    } catch (error) {
      if (!controller.signal.aborted) setMessage({ error: true, text: (error as { status?: number })?.status === 409 ? 'Ya existe una cuenta con ese correo.' : 'No se pudo enviar la invitación. Verificá tu acceso e intentá nuevamente.' });
    } finally { if (!controller.signal.aborted) setBusy(false); if (pending.current === controller) pending.current = null; }
  }
  if (!allowed) return <Text accessibilityLiveRegion="polite" style={s.muted}>{allowed === null ? 'Comprobando permiso para invitar…' : 'La invitación por correo está disponible solo para cuentas con permiso de invitación.'}</Text>;
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.heading}>Invitar por correo</Text>
    <Text style={s.text}>Se enviará un correo para verificar la dirección y configurar el acceso.</Text>
    <Field label="Nombre" value={firstName} onChange={setFirstName} maxLength={100} />
    <Field label="Apellido" value={lastName} onChange={setLastName} maxLength={100} />
    <Field label="Correo electrónico" kind="email" value={email} onChange={setEmail} maxLength={254} />
    {message && <Text accessibilityRole={message.error ? 'alert' : 'text'} accessibilityLiveRegion="polite" style={message.error ? s.error : s.text}>{message.text}</Text>}
    <Button title={busy ? 'Enviando…' : 'Enviar invitación'} disabled={busy} onPress={() => void send()} />
  </View>;
}
