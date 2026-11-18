import { useState } from 'react';
import { Text, View } from 'react-native';
import type { CustomerAddress, CustomerAddressDraft, CustomerDetail, CustomerEditDraft } from './customers/types';
import { isCustomerConflict, validateCustomerEdit } from './customers/customer-edit';
import { addressFieldLimits, hasDuplicateAddress, validateCustomerAddress } from './customers/customer-address';
import { Button, Field } from './Controls';
import { styles as s } from './styles';

type Draft = CustomerEditDraft | CustomerAddressDraft;
const addressLabels: Record<keyof CustomerAddressDraft, string> = {
  label: 'Nombre de la dirección', street: 'Calle *', number: 'Número *', locality: 'Localidad *',
  department: 'Departamento *', reference: 'Referencia', notes: 'Observaciones',
};
const customerLabels: Record<keyof CustomerEditDraft, string> = {
  displayName: 'Nombre *', legalName: 'Razón social', email: 'Email', phone: 'Teléfono',
};

export function CustomerForm({ customer, address, mode, onSave, onCancel, onReload }: {
  customer: CustomerDetail; address?: CustomerAddress; mode: 'customer' | 'address';
  onSave: (draft: Draft) => Promise<void>; onCancel: () => void; onReload: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => mode === 'customer' ? {
    displayName: customer.displayName, legalName: customer.legalName ?? '', email: customer.email ?? '', phone: customer.phone ?? '',
  } : Object.fromEntries(Object.keys(addressLabels).map((key) => [key, address?.[key as keyof CustomerAddressDraft] ?? ''])));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const labels = mode === 'customer' ? customerLabels : addressLabels;
  const duplicate = mode === 'address' && hasDuplicateAddress(customer.addresses, draft as CustomerAddressDraft, address?.id);
  async function save() {
    if (busy || conflict) return;
    const result = mode === 'customer' ? validateCustomerEdit(draft as CustomerEditDraft) : validateCustomerAddress(draft as CustomerAddressDraft);
    if (!result.valid) { setErrors(result.errors); return; }
    setErrors({}); setFailure(''); setBusy(true);
    try { await onSave(draft as Draft); }
    catch (error) {
      if (isCustomerConflict(error)) { setConflict(true); setFailure('La ficha cambió mientras la editabas. Tus cambios siguen en el formulario; copialos si los necesitás y recargá la ficha.'); }
      else setFailure('No se pudieron guardar los cambios. Podés reintentar.');
    }
    finally { setBusy(false); }
  }
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.heading}>{mode === 'customer' ? 'Editar datos del cliente' : address ? 'Editar dirección' : 'Agregar dirección'}</Text>
    <Text style={s.muted}>Los campos con * son obligatorios.</Text>
    {Object.entries(labels).map(([key, label]) => <Field key={key} label={label} value={draft[key]}
      kind={key === 'email' ? 'email' : key === 'phone' ? 'phone' : 'text'}
      maxLength={mode === 'address' ? addressFieldLimits[key as keyof CustomerAddressDraft] : ({ displayName: 120, legalName: 160, email: 254, phone: 40 } as Record<string, number>)[key]}
      error={errors[key]} onChange={(value) => setDraft((previous) => ({ ...previous, [key]: value }))} />)}
    {duplicate && <Text style={s.muted}>Ya existe una dirección similar. Revisá si corresponde agregarla o modificar la existente.</Text>}
    {failure && <Text accessibilityRole="alert" style={s.error}>{failure}</Text>}
    {conflict && <Button title="Descartar y recargar ficha" onPress={onReload} />}
    <View style={s.row}><Button title={busy ? 'Guardando…' : 'Guardar cambios'} disabled={busy || conflict} onPress={() => void save()} />
      <Button title="Cancelar" disabled={busy} onPress={conflict ? onReload : onCancel} /></View>
  </View>;
}
