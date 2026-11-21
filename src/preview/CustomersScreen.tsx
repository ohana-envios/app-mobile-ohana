import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { CustomerAddress, CustomerAddressDraft, CustomerDetail, CustomerEditDraft, CustomerList, CustomerListQuery, CustomersSource } from './customers/types';
import { isAddressActive } from './customers/customer-address';
import { isCustomerConflict } from './customers/customer-edit';
import { Button, Field, Filters, Pagination } from './Controls';
import { CustomerForm } from './CustomerForms';
import { styles as s } from './styles';

export const statusOptions = [
  { value: 'all', label: 'Todos' }, { value: 'enabled', label: 'Habilitados' }, { value: 'disabled', label: 'Deshabilitados' },
] as const;

export function CustomersScreen({ source, preview = false }: { source: CustomersSource; preview?: boolean }) {
  const [query, setQuery] = useState<CustomerListQuery>({ search: '', status: 'all', page: 1, pageSize: 3 });
  const [result, setResult] = useState<CustomerList | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
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
  if (selected) return <CustomerRecord key={selected} id={selected} source={source} preview={preview} onBack={() => { setSelected(null); setRetry((n) => n + 1); }} />;
  return <>
    <Text accessibilityRole="header" style={s.title}>Clientes</Text>
    <View style={s.card}>
      <Field label="Buscar clientes" value={query.search} maxLength={120} onChange={(search) => setQuery({ ...query, search, page: 1 })} />
      <Filters label="Estado del cliente" value={query.status} options={statusOptions} onChange={(status) => setQuery({ ...query, status, page: 1 })} />
    </View>
    {error ? <View style={s.card}><Text accessibilityRole="alert" style={s.error}>No pudimos cargar los clientes.</Text><Button title="Reintentar" onPress={() => setRetry((n) => n + 1)} /></View>
      : !result ? <Text accessibilityLiveRegion="polite" style={s.muted}>Cargando clientes…</Text>
      : <>
        <Text accessibilityLiveRegion="polite" style={s.muted}>{result.total} clientes encontrados</Text>
        {result.items.length === 0 && <View style={s.card}><Text style={s.text}>No hay clientes con esos filtros.</Text><Button title="Limpiar filtros" onPress={() => setQuery({ ...query, search: '', status: 'all', page: 1 })} /></View>}
        {result.items.map((customer) => <View key={customer.id} style={s.card}>
          <Text accessibilityRole="header" style={s.heading}>{customer.displayName}</Text>
          <Text style={s.muted}>{customer.type === 'PERSON' ? 'Persona' : 'Empresa'} · {customer.enabled ? 'Habilitado' : 'Deshabilitado'}</Text>
          <Text style={s.text}>{customer.email ?? 'Sin email'}{ '\n' }{customer.phone ?? 'Sin teléfono'}</Text>
          <Text style={s.muted}>{customer.addressCount} direcciones registradas</Text>
          <Button title={`Ver ficha de ${customer.displayName}`} onPress={() => setSelected(customer.id)} />
        </View>)}
        <Pagination page={query.page} pages={result.totalPages} onChange={(page) => setQuery({ ...query, page })} />
      </>}
  </>;
}

type Action = { kind: 'customer' } | { kind: 'address'; address: CustomerAddress };
export function CustomerRecord({ id, source, preview, onBack, backLabel = 'Volver a clientes' }: { id: string; source: CustomersSource; preview: boolean; onBack: () => void; backLabel?: string }) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [edit, setEdit] = useState<{ mode: 'customer' | 'address'; address?: CustomerAddress } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [statusConflict, setStatusConflict] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState('');
  const [invitation, setInvitation] = useState<{ code: string; expiresAt: string } | null>(null);
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [invitationError, setInvitationError] = useState('');

  useEffect(() => {
    const controller = new AbortController(); setError('');
    source.get(id, controller.signal).then((data) => { if (!controller.signal.aborted) setCustomer(data); })
      .catch(() => { if (!controller.signal.aborted) setError('No pudimos cargar la ficha.'); });
    return () => controller.abort();
  }, [source, id, retry]);
  if (!customer) return <View style={s.card}><Button title={backLabel} onPress={onBack} />
    <Text style={s.text}>{error || 'Cargando ficha…'}</Text>{error && <Button title="Reintentar" onPress={() => setRetry((n) => n + 1)} />}</View>;
  const inactive = customer.preview?.inactiveAddressIds ?? [];
  const activeCount = customer.addresses.filter((item) => isAddressActive(item, inactive)).length;
  async function save(draft: CustomerEditDraft | CustomerAddressDraft) {
    const signal = new AbortController().signal;
    let saved: CustomerDetail;
    if (edit?.mode === 'customer' && source.update) saved = await source.update(id, draft as CustomerEditDraft, signal, customer!);
    else if (edit?.mode === 'address' && edit.address && source.updateAddress) saved = await source.updateAddress(id, edit.address.id, draft as CustomerAddressDraft, signal, edit.address);
    else if (edit?.mode === 'address' && !edit.address && source.addAddress) saved = await source.addAddress(id, draft as CustomerAddressDraft, signal);
    else throw new Error('La edición no está disponible.');
    setCustomer(saved); setEdit(null); setNotice(preview ? 'Cambios guardados en la vista previa.' : 'Cambios guardados.');
  }
  async function confirm() {
    if (!action || !customer || busy) return;
    setBusy(true); setError('');
    const signal = new AbortController().signal;
    try {
      let saved: CustomerDetail;
      if (action.kind === 'customer') {
        const change = customer.enabled ? source.deactivateCustomer : source.reactivateCustomer;
        if (!change) throw new Error('El cambio de estado no está disponible.');
        saved = await change(id, signal);
      } else {
        const change = isAddressActive(action.address, inactive) ? source.deactivateAddress : source.reactivateAddress;
        if (!change) throw new Error('El cambio de estado no está disponible.');
        saved = await change(id, action.address.id, signal);
      }
      setCustomer(saved); setAction(null); setNotice(preview ? 'Estado actualizado en la vista previa.' : 'Estado actualizado.');
    } catch (failure) {
      if (isCustomerConflict(failure)) {
        setStatusConflict(true); setError(action.kind === 'address' ? 'Debe quedar al menos una dirección activa. Recargá la ficha para ver los cambios recientes.' : 'No se puede cambiar el estado. Los registros pendientes se habilitan desde solicitudes pendientes. Recargá la ficha.');
      } else setError('No se pudo actualizar el estado. Podés reintentar.');
    }
    finally { setBusy(false); }
  }
  if (edit) return <CustomerForm customer={customer} mode={edit.mode} address={edit.address} onSave={save} onCancel={() => setEdit(null)}
    onReload={() => { setCustomer(null); setEdit(null); setRetry((n) => n + 1); }} />;
  if (action) {
    const disabling = action.kind === 'customer' ? customer.enabled : isAddressActive(action.address, inactive);
    return <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>{disabling ? 'Desactivar' : 'Reactivar'} {action.kind === 'customer' ? 'cliente' : 'dirección'}</Text>
      <Text style={s.text}>{action.kind === 'customer' ? customer.displayName : `${action.address.street} ${action.address.number}`}</Text>
      <Text style={s.muted}>Se conserva la información. Este cambio no modifica el acceso de una cuenta de usuario.</Text>
      {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Button title={statusConflict ? 'Recargar ficha' : 'Cancelar'} disabled={busy} onPress={() => {
        setAction(null); setError('');
        if (statusConflict) { setStatusConflict(false); setCustomer(null); setRetry((n) => n + 1); }
      }} />
      <Button title={busy ? 'Guardando…' : disabling ? 'Confirmar desactivación' : 'Confirmar reactivación'} disabled={busy || statusConflict} onPress={() => void confirm()} />
    </View>;
  }
  return <>
    <Button title={backLabel} onPress={onBack} />
    {notice && <Text accessibilityLiveRegion="polite" style={s.muted}>{notice}</Text>}
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.title}>{customer.displayName}</Text>
      <Text style={s.muted}>{customer.enabled ? 'Habilitado' : 'Deshabilitado'} · {customer.type === 'PERSON' ? 'Persona' : 'Empresa'}</Text>
      <Text style={s.text}>Razón social: {customer.legalName ?? 'Sin registrar'}{ '\n' }Email: {customer.email ?? 'Sin registrar'}{ '\n' }Teléfono: {customer.phone ?? 'Sin registrar'}{ '\n' }Documento: {customer.documentNumber ?? 'Sin registrar'}</Text>
      {source.update && <Button title="Editar datos" onPress={() => setEdit({ mode: 'customer' })} />}
      {(customer.enabled ? source.deactivateCustomer : source.reactivateCustomer) && <Button title={customer.enabled ? 'Desactivar cliente' : 'Reactivar cliente'} onPress={() => setAction({ kind: 'customer' })} />}
    </View>
    {source.inviteCustomer && customer.enabled && <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>Invitar al cliente a su cuenta</Text>
      <Text style={s.text}>El cliente debe verificar este correo y canjear el c?digo. Despu?s un administrador habilita su cuenta.</Text>
      {invitation ? <><Text style={s.text} selectable>C?digo de un solo uso: {invitation.code}</Text><Text style={s.muted}>Vence {new Date(invitation.expiresAt).toLocaleString()}. Compartilo de forma segura; al salir no se volver? a mostrar.</Text><Button title="Cerrar" onPress={() => setInvitation(null)} /></> : <>
        <Field label="Correo de acceso" kind="email" value={invitationEmail} maxLength={254} onChange={setInvitationEmail} />
        {!!invitationError && <Text accessibilityRole="alert" style={s.error}>{invitationError}</Text>}
        <Button title={invitationBusy ? 'Generando?' : 'Generar invitaci?n'} disabled={invitationBusy || !invitationEmail.trim()} onPress={() => {
          if (invitationBusy || !source.inviteCustomer) return; setInvitationBusy(true); setInvitationError('');
          source.inviteCustomer(id, invitationEmail.trim(), new AbortController().signal).then(setInvitation).catch(() => setInvitationError('No se pudo generar la invitaci?n. Verific? el correo y el estado de la cuenta.')).finally(() => setInvitationBusy(false));
        }} />
      </>}
    </View>}
    <Text accessibilityRole="header" style={s.heading}>Direcciones habituales</Text>
    {(preview || customer.addresses.some((item) => typeof item.active === 'boolean')) && <Text style={s.muted}>{activeCount} activas · {customer.addresses.length - activeCount} desactivadas</Text>}
    {source.deactivateAddress && activeCount <= 1 && <Text style={s.muted}>{activeCount === 0 ? 'Este cliente no tiene direcciones activas. Agregá o reactivá una.' : 'Debe quedar al menos una dirección activa. Para desactivar la última, agregá o reactivá otra primero.'}</Text>}
    {customer.addresses.map((address, index) => {
      const disabled = !isAddressActive(address, inactive);
      return <View key={address.id} style={s.card}>
        <Text accessibilityRole="header" style={s.heading}>{address.label ?? `Dirección ${index + 1}`}</Text>
        {(preview || typeof address.active === 'boolean') && <Text style={s.muted}>{disabled ? 'Desactivada' : 'Activa'}</Text>}
        <Text style={s.text}>{address.street} {address.number}{ '\n' }{address.locality}, {address.department}</Text>
        {address.reference && <Text style={s.text}>Referencia: {address.reference}</Text>}
        {address.notes && <Text style={s.text}>Observaciones: {address.notes}</Text>}
        {source.updateAddress && <Button title="Editar dirección" onPress={() => setEdit({ mode: 'address', address })} />}
        {(disabled ? source.reactivateAddress : source.deactivateAddress) && <Button title={disabled ? 'Reactivar dirección' : 'Desactivar dirección'} disabled={!disabled && activeCount <= 1} onPress={() => setAction({ kind: 'address', address })} />}
      </View>;
    })}
    {source.addAddress && <Button title="Agregar dirección" onPress={() => setEdit({ mode: 'address' })} />}
  </>;
}
