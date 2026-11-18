import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { userRoleLabels, userRoles } from './users/types';
import type { UserAccessChange, UserAccessDraft, UserSummary, UsersSource } from './users/types';
import { Button, Filters } from './Controls';
import { styles as s } from './styles';

const roles = userRoles.map((role) => ({ value: role, label: userRoleLabels[role] }));
const states = [{ value: 'enabled', label: 'Habilitado' }, { value: 'disabled', label: 'Deshabilitado' }] as const;

export function UserAccessForm({ user, source, onSaved, onCancel, onReload, preview = false }: {
  preview?: boolean; onReload: () => void; user: UserSummary; source: UsersSource; onSaved: (change: UserAccessChange) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<UserAccessDraft>({ role: user.role, enabled: user.enabled });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const unchanged = user.role === draft.role && user.enabled === draft.enabled;
  async function save() {
    if (busy || !source.updateAccess) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { const change = await source.updateAccess(user.id, draft, controller.signal, user); if (!controller.signal.aborted) onSaved(change); }
    catch (failure) { if (!controller.signal.aborted) { if (typeof failure === 'object' && failure !== null && 'status' in failure && failure.status === 409) { setConflict(true); setError('No se pudo aplicar el cambio. La cuenta puede haber cambiado o el cambio no está permitido. Recargá el listado.'); } else setError(failure instanceof Error ? failure.message : 'No se pudo actualizar el acceso. Podés reintentar.'); } }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.heading}>{confirming ? 'Confirmar cambio de acceso' : 'Administrar acceso'}</Text>
    <Text style={s.text}>{user.displayName}{'\n'}{user.email}</Text>
    <Text style={s.muted}>{preview ? 'Esta vista modifica cuentas ficticias ya existentes.' : 'Esta operación modifica el acceso de una cuenta existente.'} La aprobación inicial de clientes corresponde a otro flujo.</Text>
    {confirming ? <>
      <Text style={s.text}>Rol: {userRoleLabels[user.role]} → {userRoleLabels[draft.role]}</Text>
      <Text style={s.text}>Acceso: {user.enabled ? 'Habilitado' : 'Deshabilitado'} → {draft.enabled ? 'Habilitado' : 'Deshabilitado'}</Text>
      <Text style={s.muted}>{draft.enabled ? 'La cuenta tendrá acceso habilitado.' : 'La cuenta quedará sin acceso operativo; su información se conserva.'} {preview && 'Este cambio es una simulación.'} La ficha comercial del cliente no cambia.</Text>
    </> : <>
      <Filters label="Rol de la cuenta" value={draft.role} options={roles.filter((role) => preview || (user.role === 'CUSTOMER' ? role.value === 'CUSTOMER' : role.value !== 'CUSTOMER'))} onChange={(role) => setDraft({ ...draft, role })} />
      <Filters label="Acceso a la cuenta" value={draft.enabled ? 'enabled' : 'disabled'} options={states} onChange={(state) => setDraft({ ...draft, enabled: state === 'enabled' })} />
    </>}
    {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {conflict && <Button title="Recargar listado" onPress={onReload} />}
    <Button title="Cancelar" disabled={busy} onPress={onCancel} />
    {confirming && <Button title="Volver a editar" disabled={busy} onPress={() => { setConfirming(false); setError(''); }} />}
    <Button title={busy ? 'Guardando…' : confirming ? 'Confirmar cambio' : 'Revisar cambio'} disabled={busy || unchanged || conflict} onPress={() => confirming ? void save() : setConfirming(true)} />
  </View>;
}
