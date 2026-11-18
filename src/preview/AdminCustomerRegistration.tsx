import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Filters } from './Controls';
import { styles as s } from './styles';
import type { AdminRegistrationDraft, RegistrationsSource } from './registrations';

const empty: AdminRegistrationDraft = { displayName: '', type: 'PERSON', phone: '', email: '' };
export function AdminCustomerRegistration({ source, onCreated }: { source: RegistrationsSource; onCreated: () => void }) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState(empty);
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const pending = useRef<AbortController | null>(null); useEffect(() => () => pending.current?.abort(), []);
  async function save() {
    if (busy) return; const controller = new AbortController(); pending.current = controller; setBusy(true); setMessage('');
    try { await source.registerByAdmin(draft, controller.signal); if (!controller.signal.aborted) { setDraft(empty); setReview(false); setOpen(false); setMessage('Cliente registrado y habilitado.'); onCreated(); } }
    catch (error) { if (!controller.signal.aborted) setMessage(typeof error === 'object' && error !== null && 'status' in error && error.status === 409 ? 'Ya existe un cliente o solicitud con ese correo.' : 'No se pudo registrar. Revisá los datos e intentá nuevamente.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <View style={s.card}><Text accessibilityRole="header" style={s.heading}>Registrar cliente</Text>
    <Text style={s.muted}>El cliente queda habilitado para operar. Esta alta no crea una cuenta de acceso.</Text>
    {message ? <Text accessibilityLiveRegion="polite" style={s.text}>{message}</Text> : null}
    {!open ? <Button title="Nuevo cliente" onPress={() => { setMessage(''); setOpen(true); }} /> : <>
      {review ? <><Text style={s.text}>Nombre: {draft.displayName}</Text><Text style={s.text}>Tipo: {draft.type === 'PERSON' ? 'Persona' : 'Empresa'}</Text><Text style={s.text}>Correo: {draft.email || 'Sin informar'}</Text><Text style={s.text}>Teléfono: {draft.phone || 'Sin informar'}</Text></> : <>
        <Field label="Nombre o razón comercial" value={draft.displayName} maxLength={120} onChange={displayName => setDraft({ ...draft, displayName })} />
        <Filters label="Tipo de cliente" value={draft.type} options={[{ value: 'PERSON', label: 'Persona' }, { value: 'COMPANY', label: 'Empresa' }]} onChange={type => setDraft({ ...draft, type })} />
        <Field label="Correo (opcional)" value={draft.email} maxLength={254} kind="email" onChange={email => setDraft({ ...draft, email })} />
        <Field label="Teléfono (opcional)" value={draft.phone} maxLength={40} kind="phone" onChange={phone => setDraft({ ...draft, phone })} />
      </>}
      <Button title="Cancelar" disabled={busy} onPress={() => { setOpen(false); setReview(false); setMessage(''); }} />
      {review && <Button title="Volver a editar" disabled={busy} onPress={() => setReview(false)} />}
      <Button title={busy ? 'Guardando…' : review ? 'Confirmar alta' : 'Revisar alta'} disabled={busy || !draft.displayName.trim()} onPress={() => review ? void save() : setReview(true)} />
    </>}
  </View>;
}
