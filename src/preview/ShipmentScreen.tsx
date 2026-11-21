import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import type { CustomerDetail, CustomerSummary, CustomersSource } from './customers/types';
import { Button, Field, Pagination } from './Controls';
import { styles } from './styles';
import { AdminCustomerRegistration } from './AdminCustomerRegistration';
import type { RegistrationsSource } from './registrations';

type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string | FormData }) => Promise<T>;
type Address = { label: string; street: string; number: string; locality: string; department: string; reference: string; notes: string };
const emptyAddress = (): Address => ({ label: '', street: '', number: '', locality: '', department: '', reference: '', notes: '' });

export function ShipmentScreen({ source, request, own = false, onCreated, registrations }: { source: CustomersSource; request: Request; own?: boolean; onCreated?: () => void; registrations?: RegistrationsSource }) {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [pages, setPages] = useState(0);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]); const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [pickupId, setPickupId] = useState('new'); const [pickup, setPickup] = useState(emptyAddress); const [delivery, setDelivery] = useState(emptyAddress);
  const [saveAddress, setSaveAddress] = useState(false); const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [packageDescription, setPackageDescription] = useState(''); const [when, setWhen] = useState(''); const [notes, setNotes] = useState('');
  const [deliveryWhen, setDeliveryWhen] = useState('');
  const [receipt, setReceipt] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [registerCustomer, setRegisterCustomer] = useState(false);
  const attempt = useRef<{ key: string; payload: string; receipt: DocumentPicker.DocumentPickerAsset | null } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [code, setCode] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    if (own) source.get('', controller.signal).then(setCustomer).catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar tu ficha de cliente.'); });
    else source.list({ search, status: 'enabled', page, pageSize: 20 }, controller.signal).then((value) => { setCustomers(value.items); setPages(value.totalPages); }).catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la lista de clientes.'); });
    return () => controller.abort();
  }, [source, own, search, page]);
  async function choose(id: string, justCreated = false) {
    setCustomer(null); setPickupId('new'); setError('');
    try { setCustomer(await source.get(id, new AbortController().signal)); } catch { setError(justCreated ? 'El cliente fue creado, pero no se pudo cargar su ficha. Buscalo y seleccionalo para continuar.' : 'No se pudo cargar la ficha del cliente.'); }
  }
  function validAddress(value: Address) { return !!value.street.trim() && !!value.number.trim() && !!value.locality.trim() && !!value.department.trim(); }
  function check() {
    if (!customer) { setError('Seleccioná un cliente.'); return false; }
    if (!name.trim()) { setError('Ingresá el nombre del destinatario.'); return false; }
    if (!phone.trim()) { setError('Ingresá el teléfono del destinatario.'); return false; }
    if (!packageDescription.trim()) { setError('Ingresá la descripción del paquete.'); return false; }
    if (pickupId === 'new' && !validAddress(pickup)) { setError('Completá calle, número, localidad y departamento de retiro.'); return false; }
    if (!validAddress(delivery)) { setError('Completá calle, número, localidad y departamento de entrega.'); return false; }
    if (!/^[+\d() .-]+$/.test(phone) || !/\d/.test(phone)) { setError('Revisá el teléfono del destinatario.'); return false; }
    if ([when, deliveryWhen].some((value) => value && (!/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(value) || Number.isNaN(new Date(value.replace(' ', 'T')).getTime())))) { setError('Ingresá las fechas como AAAA-MM-DD HH:MM.'); return false; }
    if (when && deliveryWhen && new Date(deliveryWhen.replace(' ', 'T')) < new Date(when.replace(' ', 'T'))) { setError('La entrega no puede ser anterior al retiro.'); return false; }
    setError(''); setReview(true); return true;
  }
  async function submit() {
    if (!customer || busy) return;
    if (!attempt.current && !check()) { setReview(false); return; }
    setBusy(true); setError('');
    try {
      const payload = { customerId: customer.id, recipientName: name, recipientPhone: phone, pickup: pickupId === 'new' ? { kind: 'new', address: pickup, save: saveAddress } : { kind: 'saved', id: pickupId }, delivery, packageDescription, requestedPickupAt: when ? new Date(when.replace(' ', 'T')).toISOString() : '', requestedDeliveryAt: deliveryWhen ? new Date(deliveryWhen.replace(' ', 'T')).toISOString() : '', notes };
      const current = attempt.current ?? { key: Crypto.randomUUID(), payload: JSON.stringify(payload), receipt }; attempt.current = current;
      const multipart = new FormData();
      if (current.receipt) { multipart.append('payload', current.payload); multipart.append('receipt', { uri: current.receipt.uri, name: current.receipt.name, type: current.receipt.mimeType } as unknown as Blob); }
      const headers: Record<string, string> = { 'Idempotency-Key': current.key }; if (!current.receipt) headers['Content-Type'] = 'application/json';
      const result = await request<{ code: string }>('/api/shipments', { signal: new AbortController().signal, method: 'POST', headers, body: current.receipt ? multipart : current.payload });
      attempt.current = null; setUncertain(false); setCode(result.code); setReview(false); onCreated?.();
    } catch (reason) { const status = (reason as { status?: number })?.status; if (!uncertain && status && status >= 400 && status < 500 && status !== 408 && status !== 429) { attempt.current = null; setUncertain(false); setReview(false); setError('No se pudo registrar. Revisá los datos y volvé a intentarlo.'); } else { setUncertain(true); setError('No pudimos confirmar si se registró el envío. Reintentá para comprobarlo sin crear otro.'); } }
    finally { setBusy(false); }
  }
  const addressFields = (label: string, value: Address, update: (next: Address) => void) => <View><Text accessibilityRole="header" style={styles.text}>{label}</Text>{([['street', 'Calle', 160], ['number', 'Número', 30], ['locality', 'Localidad', 80], ['department', 'Departamento', 80], ['reference', 'Referencia', 240]] as const).map(([key, title, max]) => <Field key={key} label={title} maxLength={max} value={value[key]} onChange={(text) => update({ ...value, [key]: text })} />)}</View>;
  if (uncertain && attempt.current) return <View><Text accessibilityRole="header" style={styles.heading}>Registro sin confirmar</Text><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Text style={styles.text}>Código de recuperación para consultar: OH-{attempt.current.key.toUpperCase()}. Anotalo antes de salir de esta pantalla.</Text><Button title={busy ? 'Comprobando…' : 'Reintentar y comprobar'} disabled={busy} onPress={() => void submit()} /></View>;
  if (code) return <View><Text accessibilityRole="header" style={styles.heading}>Envío registrado</Text><Text style={styles.text}>Código: {code}</Text><Button title="Registrar otro envío" onPress={() => { setCode(''); setName(''); setPhone(''); setPackageDescription(''); setWhen(''); setDeliveryWhen(''); setReceipt(null); setNotes(''); setPickup(emptyAddress()); setDelivery(emptyAddress()); setPickupId('new'); setSaveAddress(false); }} /></View>;
  return <View><Text accessibilityRole="header" style={styles.heading}>Nuevo envío</Text>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {!own && <View><Field label="Buscar cliente" value={search} maxLength={120} onChange={(value) => { setPage(1); setSearch(value); }} />{customers.map((item) => <View key={item.id}><Text style={styles.text}>{item.displayName}</Text><Button title="Seleccionar cliente" onPress={() => void choose(item.id)} /></View>)}<Pagination page={page} pages={pages} onChange={setPage} />{registrations && <><Button title={registerCustomer ? 'Cerrar alta de cliente' : 'Registrar nuevo cliente'} onPress={() => setRegisterCustomer(!registerCustomer)} />{registerCustomer && <AdminCustomerRegistration source={registrations} onCreated={(id) => { setRegisterCustomer(false); setSearch(''); setPage(1); void choose(id, true); }} />}</>}</View>}
    {customer && <View><Text style={styles.text}>Cliente: {customer.displayName}</Text><Text style={styles.label}>Dirección de retiro</Text>
      <Button title="Ingresar una dirección nueva" selected={pickupId === 'new'} onPress={() => setPickupId('new')} />
      {customer.addresses.filter((address) => address.active !== false).map((address) => <Button key={address.id} title={`${address.street} ${address.number}, ${address.locality}`} selected={pickupId === address.id} onPress={() => setPickupId(address.id)} />)}
      {pickupId === 'new' && <>{addressFields('Retiro', pickup, setPickup)}<Button title={saveAddress ? 'Se guardará como dirección habitual' : 'No guardar como dirección habitual'} selected={saveAddress} onPress={() => setSaveAddress(!saveAddress)} /></>}
      {addressFields('Entrega', delivery, setDelivery)}
      <Field label="Destinatario" value={name} maxLength={120} onChange={setName} /><Field label="Teléfono del destinatario" kind="phone" value={phone} maxLength={40} onChange={setPhone} />
      <Field label="Descripción del paquete" value={packageDescription} maxLength={500} onChange={setPackageDescription} /><Field label="Retiro opcional (AAAA-MM-DD HH:MM)" value={when} maxLength={16} onChange={setWhen} /><Field label="Entrega solicitada opcional (AAAA-MM-DD HH:MM)" value={deliveryWhen} maxLength={16} onChange={setDeliveryWhen} /><Field label="Observaciones" value={notes} maxLength={1000} onChange={setNotes} />
      <Text style={styles.text}>Comprobante opcional: PDF, PNG o JPG de hasta 5 MB. Adjuntarlo no confirma el pago.</Text><Button title={receipt ? `Cambiar comprobante: ${receipt.name}` : 'Adjuntar comprobante'} onPress={() => { void DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/png', 'image/jpeg'], copyToCacheDirectory: true }).then((result) => { if (result.canceled) return; const file = result.assets[0]; if (!file || !file.mimeType || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimeType) || (file.size !== undefined && file.size > 5 * 1024 * 1024)) { setError('Elegí un PDF, PNG o JPG de hasta 5 MB.'); return; } setReceipt(file); setError(''); }).catch(() => setError('No se pudo seleccionar el comprobante.')); }} />{receipt && <Button title="Quitar comprobante" onPress={() => setReceipt(null)} />}
      {!review ? <Button title="Revisar envío" onPress={check} /> : <View><Text accessibilityRole="header" style={styles.text}>Revisá antes de confirmar</Text><Text style={styles.text}>Cliente: {customer.displayName}. Destinatario: {name}, teléfono {phone}.</Text><Text style={styles.text}>Retiro: {pickupId === 'new' ? `${pickup.street} ${pickup.number}, ${pickup.locality}, ${pickup.department}` : customer.addresses.filter((address) => address.id === pickupId).map((address) => `${address.street} ${address.number}, ${address.locality}, ${address.department}`).join('')}. Entrega: {delivery.street} {delivery.number}, {delivery.locality}, {delivery.department}.</Text><Text style={styles.text}>Paquete: {packageDescription}. Retiro solicitado: {when || 'sin indicar'}. Entrega solicitada: {deliveryWhen || 'sin indicar'}. Observaciones: {notes || 'ninguna'}.</Text><Button title={busy ? 'Registrando…' : 'Confirmar envío'} disabled={busy} onPress={() => void submit()} /><Button title="Seguir editando" disabled={busy} onPress={() => setReview(false)} /></View>}
    </View>}
  </View>;
}
