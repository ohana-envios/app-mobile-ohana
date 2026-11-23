import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { userRoleLabels } from './users/types';
import type { UserAccessChange, UserList, UserListQuery, UserSummary, UsersSource } from './users/types';
import { InvitationAction } from './InvitationViews';
import { InternalUserForm } from './InternalUserForm';
import { UserAccessForm } from './UserAccessForm';
import { Button, Field, Filters, Pagination } from './Controls';
import { statusOptions } from './CustomersScreen';
import { styles as s } from './styles';

const roles = [
  { value: 'all', label: 'Todos' }, { value: 'ADMIN', label: 'Administrador' },
  { value: 'OPERATOR', label: 'Operador' }, { value: 'CUSTOMER', label: 'Cliente' }, { value: 'COURIER', label: 'Repartidor' },
] as const;
export function UsersScreen({ source, preview = false }: { source: UsersSource; preview?: boolean }) {
  const [query, setQuery] = useState<UserListQuery>({ search: '', role: 'all', status: 'all', page: 1, pageSize: 3 });
  const [result, setResult] = useState<UserList | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [change, setChange] = useState<UserAccessChange | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setResult(null); setError(false);
    source.list(query, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (query.page > Math.max(1, data.totalPages)) setQuery((previous) => ({ ...previous, page: Math.max(1, data.totalPages) }));
      else setResult(data);
    })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [query, source, retry]);
  if (selected) return <UserAccessForm key={selected.id} user={selected} source={source} preview={preview} onReload={() => { setSelected(null); setRetry((n) => n + 1); }} onCancel={() => setSelected(null)}
    onSaved={(saved) => { setChange(saved); setSelected(null); setRetry((n) => n + 1); }} />;
  return <>
    <Text accessibilityRole="header" style={s.title}>Usuarios</Text>
    <Text style={s.muted}>Consulta administrativa. El filtro de rol no cambia los permisos de nadie.</Text>
    <InternalUserForm source={source} onCreated={email => setQuery(previous => ({ ...previous, search: email, role: 'all', status: 'all', page: 1 }))} />
    {change && <View style={s.card} accessibilityLiveRegion="polite">
      <Text style={s.heading}>Acceso actualizado{preview ? ' en la vista previa' : ''}: {change.user.displayName}</Text>
      {(change.audit || change.previewAudit) && <>
        <Text style={s.muted}>{preview ? 'Registro temporal' : 'Registro de auditoría'} · Responsable: {(change.audit || change.previewAudit)!.actorId} · {new Date((change.audit || change.previewAudit)!.occurredAt).toLocaleString('es-UY')}</Text>
        <Text style={s.text}>{userRoleLabels[(change.audit || change.previewAudit)!.previous.role]} → {userRoleLabels[(change.audit || change.previewAudit)!.next.role]} · {(change.audit || change.previewAudit)!.previous.enabled ? 'Habilitado' : 'Deshabilitado'} → {(change.audit || change.previewAudit)!.next.enabled ? 'Habilitado' : 'Deshabilitado'}</Text>
      </>}
      {preview && <Text style={s.muted}>Los cambios y este registro son de prueba; no se guardan en la API.</Text>}
    </View>}
    {!preview && <Text style={s.muted}>La habilitación inicial se realiza desde Clientes pendientes. Las cuentas de clientes ya aprobados pueden habilitarse o deshabilitarse aquí.</Text>}
    <View style={s.card}>
      <Field label="Buscar usuarios" value={query.search} maxLength={120} onChange={(search) => setQuery({ ...query, search, page: 1 })} />
      <Filters label="Rol" value={query.role} options={roles} onChange={(role) => setQuery({ ...query, role, page: 1 })} />
      <Filters label="Acceso a la cuenta" value={query.status} options={statusOptions} onChange={(status) => setQuery({ ...query, status, page: 1 })} />
    </View>
    {error ? <View style={s.card}><Text accessibilityRole="alert" style={s.error}>No pudimos cargar los usuarios.</Text><Button title="Reintentar" onPress={() => setRetry((n) => n + 1)} /></View>
      : !result ? <Text accessibilityLiveRegion="polite" style={s.muted}>Cargando usuarios…</Text> : <>
        <Text accessibilityLiveRegion="polite" style={s.muted}>{result.total} usuarios encontrados</Text>
        {result.items.length === 0 && <View style={s.card}><Text style={s.text}>No hay usuarios con esos filtros.</Text><Button title="Limpiar filtros" onPress={() => setQuery({ ...query, search: '', role: 'all', status: 'all', page: 1 })} /></View>}
        {result.items.map((user) => <View style={s.card} key={user.id}>
          <Text accessibilityRole="header" style={s.heading}>{user.displayName}</Text><Text style={s.text}>{user.email}</Text>
          <Text style={s.muted}>{roles.find((role) => role.value === user.role)?.label} · Acceso {user.enabled ? 'habilitado' : 'deshabilitado'}</Text>
          <InvitationAction source={source} user={user} />
          {source.updateAccess && <Button title={`Administrar acceso de ${user.displayName}`} onPress={() => setSelected(user)} />}
        </View>)}
        <Pagination page={query.page} pages={result.totalPages} onChange={(page) => setQuery({ ...query, page })} />
      </>}
  </>;
}
