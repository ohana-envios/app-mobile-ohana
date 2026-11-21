import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Filters } from './Controls';
import { styles as s } from './styles';
import { userRoleLabels } from './users/types';
import type { InternalUserDraft, UsersSource } from './users/types';
const empty: InternalUserDraft = { displayName: '', email: '', role: 'OPERATOR' };
const roles = [{ value: 'ADMIN', label: 'Administrador' }, { value: 'OPERATOR', label: 'Operador' }, { value: 'COURIER', label: 'Repartidor' }] as const;
export function InternalUserForm({ source, onCreated }: { source: UsersSource; onCreated: () => void }) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState(empty); const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  if (!source.createInternal) return null;
  async function save() {
    if (busy || !source.createInternal) return; const controller = new AbortController(); pending.current = controller; setBusy(true); setMessage('');
    try { await source.createInternal(draft, controller.signal); if (!controller.signal.aborted) { setDraft(empty); setOpen(false); setReview(false); setMessage('Usuario creado. Falta vincular su identidad para habilitar el acceso.'); onCreated(); } }
    catch (failure) { if (!controller.signal.aborted) setMessage(typeof failure === 'object' && failure !== null && 'status' in failure && failure.status === 409 ? 'Ya existe una cuenta con ese correo.' : 'No se pudo crear el usuario. Revisá los datos e intentá nuevamente.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <View style={s.card}><Text accessibilityRole="header" style={s.heading}>Crear usuario interno</Text><Text style={s.muted}>La cuenta queda deshabilitada hasta vincular su identidad. Esta pantalla no crea credenciales.</Text>
    {message ? <Text accessibilityLiveRegion="polite" style={s.text}>{message}</Text> : null}
    {!open ? <Button title="Nuevo usuario" onPress={() => { setMessage(''); setOpen(true); }} /> : <>
      {review ? <><Text style={s.text}>Nombre: {draft.displayName}</Text><Text style={s.text}>Correo: {draft.email}</Text><Text style={s.text}>Rol: {userRoleLabels[draft.role]}</Text></> : <>
        <Field label="Nombre" value={draft.displayName} maxLength={120} onChange={displayName => setDraft({ ...draft, displayName })} />
        <Field label="Correo" kind="email" value={draft.email} maxLength={254} onChange={email => setDraft({ ...draft, email })} />
        <Filters label="Rol" value={draft.role} options={roles} onChange={role => setDraft({ ...draft, role })} />
      </>}
      <Button title="Cancelar" disabled={busy} onPress={() => { setOpen(false); setReview(false); setMessage(''); }} />
      {review && <Button title="Volver a editar" disabled={busy} onPress={() => setReview(false)} />}
      <Button title={busy ? 'Guardando…' : review ? 'Confirmar alta' : 'Revisar alta'} disabled={busy || !draft.displayName.trim() || !draft.email.trim()} onPress={() => review ? void save() : setReview(true)} />
    </>}
  </View>;
}
