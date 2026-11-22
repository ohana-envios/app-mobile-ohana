import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Field, Pagination } from './Controls';
import { styles } from './styles';
import { ShipmentHistory } from './ShipmentHistory';
import { ShipmentAssignment } from './ShipmentAssignment';
import { ShipmentCustody } from './ShipmentCustody';
import { ShipmentPickup } from './ShipmentPickup';
import { directShipmentCode } from './shipments/code-search';
import { shipmentStatuses as statuses } from './shipments/statuses';
import { ShipmentLabel } from './ShipmentLabel';

type Summary = { id: string; code: string; recipientName: string; status: string; priority: string; createdAt: string; customer: { displayName: string } };
type Detail = Summary & { senderName: string; recipientPhone: string | null; pickupStreet: string; pickupNumber: string; pickupLocality: string; pickupDepartment: string; deliveryStreet: string; deliveryNumber: string; deliveryLocality: string; deliveryDepartment: string; requestedPickupAt: string | null; requestedDeliveryAt: string | null; receipt: { id: string; version: number } | null; assignedCourier?: { id: string; displayName: string } | null; packages: { description: string | null }[]; notes?: string | null };
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string | FormData }) => Promise<T>;
const empty = { code: '', customer: '', recipient: '', responsible: '', status: '', priority: '', from: '', to: '' };

export function ShipmentList({ request, downloadReceipt, own = false, readOnly = false, canChangeStatus = false, onCustodyUpdated }: { request: Request; downloadReceipt: (id: string) => Promise<void>; own?: boolean; readOnly?: boolean; canChangeStatus?: boolean; onCustodyUpdated?: () => void }) {
  const [draft, setDraft] = useState(empty); const [query, setQuery] = useState(empty); const [page, setPage] = useState(1);
  const [items, setItems] = useState<Summary[]>([]); const [pages, setPages] = useState(0); const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [statusObservation, setStatusObservation] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);
  const [directResult, setDirectResult] = useState(false);
  async function attach(item: Detail) {
    try {
      const selected = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/png', 'image/jpeg'], copyToCacheDirectory: true });
      if (selected.canceled) return;
      const file = selected.assets[0];
      if (!file || !file.mimeType || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimeType) || (file.size !== undefined && file.size > 5 * 1024 * 1024)) throw new Error('Archivo inválido');
      if (item.receipt) {
        const confirmed = await new Promise<boolean>((resolve) => Alert.alert('Reemplazar comprobante', 'El anterior quedará conservado en el historial.', [{ text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) }, { text: 'Reemplazar', onPress: () => resolve(true) }], { cancelable: false }));
        if (!confirmed) return;
      }
      const body = new FormData(); body.append('receipt', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob); if (item.receipt) body.append('version', String(item.receipt.version));
      setUploading(true); setError('');
      const result = await request<{ receipt: { id: string; version: number } }>(`/api/shipments/${encodeURIComponent(item.id)}/receipt`, { signal: new AbortController().signal, method: item.receipt ? 'PATCH' : 'POST', body });
      setDetail({ ...item, receipt: result.receipt }); setHistoryRevision((v) => v + 1);
    } catch { setError('No se pudo adjuntar el comprobante. Elegí un PDF, PNG o JPG de hasta 5 MB.'); }
    finally { setUploading(false); }
  }
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page) });
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, key === 'from' || key === 'to' ? new Date(value.replace(' ', 'T')).toISOString() : value);
    request<{ items: Summary[]; totalPages: number }>(`/api/shipments?${params}`, { signal: controller.signal }).then((result) => { setItems(result.items); setPages(result.totalPages); }).catch(() => { if (!controller.signal.aborted) { setItems([]); setPages(0); setError('No se pudieron cargar los envíos.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, query, page]);
  async function search() {
    for (const date of [draft.from, draft.to]) if (date && (!/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(date) || Number.isNaN(new Date(date.replace(' ', 'T')).getTime()))) { setError('Ingresá las fechas como AAAA-MM-DD HH:MM.'); return; }
    if (draft.from && draft.to && new Date(draft.from.replace(' ', 'T')) > new Date(draft.to.replace(' ', 'T'))) { setError('La fecha inicial debe ser anterior a la final.'); return; }
    const code = directShipmentCode(draft);
    if (!code) { setDirectResult(false); setPage(1); setQuery({ ...draft }); return; }
    setDirectResult(true); setLoading(true); setError(''); setItems([]); setPages(0);
    try { const found = await request<Detail>(`/api/shipments/by-code/${encodeURIComponent(code)}`, { signal: new AbortController().signal }); setItems([found]); setPages(1); setDetail(found); }
    catch (reason) { setError(typeof reason === 'object' && reason !== null && 'status' in reason && reason.status === 404 ? 'No se encontraron envíos.' : 'No se pudo realizar la búsqueda.'); }
    finally { setLoading(false); }
  }
  function changeStatus(item: Detail, status: 'IN_ROUTE' | 'IN_DEPOT') {
    Alert.alert('Cambiar estado', `¿Marcar como ${statuses[status]}? Esto no registra una transferencia de custodia.`, [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => { void (async () => {
        setChangingStatus(true); setError('');
        try { await request(`/api/shipments/${encodeURIComponent(item.id)}/status`, { signal: new AbortController().signal, method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, expectedStatus: item.status, observation: statusObservation }) }); setDetail({ ...item, status }); setItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, status } : entry)); setStatusObservation(''); setHistoryRevision((v) => v + 1); }
        catch { setError('No se pudo cambiar el estado. Recargá el envío e intentá de nuevo.'); } finally { setChangingStatus(false); }
      })(); } },
    ]);
  }
  async function open(id: string) {
    setError(''); setCancelReason(''); setStatusObservation(''); setLoading(true);
    try { setDetail(await request<Detail>(`/api/shipments/${encodeURIComponent(id)}`, { signal: new AbortController().signal })); }
    catch { setError('No se pudo cargar el envío.'); } finally { setLoading(false); }
  }
  function cancelShipment(item: Detail) {
    if (!cancelReason.trim()) return;
    Alert.alert('Cancelar envío', '¿Confirmás la cancelación de este envío?', [{ text: 'Volver', style: 'cancel' }, { text: 'Confirmar', onPress: () => { void (async () => {
      setChangingStatus(true); setError('');
      try { await request(`/api/shipments/${encodeURIComponent(item.id)}/cancel`, { signal: new AbortController().signal, method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedStatus: item.status, reason: cancelReason }) }); setDetail({ ...item, status: 'CANCELED' }); setItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, status: 'CANCELED' } : entry)); setCancelReason(''); setHistoryRevision((v) => v + 1); }
      catch { setError('No se pudo cancelar. Revisá el estado y recargá el envío.'); } finally { setChangingStatus(false); }
    })(); } }]);
  }
  if (detail) return <View><Button title="Volver a los envíos" onPress={() => setDetail(null)} /><Text accessibilityRole="header" style={styles.heading}>Envío {detail.code}</Text>
    <Text style={styles.text}>Estado: {statuses[detail.status] ?? detail.status} · Prioridad: {detail.priority === 'HIGH' ? 'Alta' : 'Normal'}</Text><Text style={styles.text}>Cliente: {detail.customer.displayName} · Remitente: {detail.senderName}</Text><Text style={styles.text}>Destinatario: {detail.recipientName} · {detail.recipientPhone || 'Sin teléfono'}</Text>
    {!own && !readOnly && ['PENDING', 'ASSIGNED'].includes(detail.status) && <View><Field label="Motivo de cancelación" maxLength={500} value={cancelReason} onChange={setCancelReason} /><Button title="Cancelar envío antes del retiro" disabled={changingStatus || !cancelReason.trim()} onPress={() => cancelShipment(detail)} /></View>}
    {canChangeStatus && ['PICKED_UP', 'IN_ROUTE', 'IN_DEPOT'].includes(detail.status) && <View><Text style={styles.text}>Cambiar estado operativo (no modifica la custodia).</Text><Field label="Observación opcional" maxLength={1000} value={statusObservation} onChange={setStatusObservation} />{detail.status !== 'IN_ROUTE' && <Button title="Marcar en ruta" disabled={changingStatus} onPress={() => changeStatus(detail, 'IN_ROUTE')} />}{detail.status !== 'IN_DEPOT' && <Button title="Marcar en depósito" disabled={changingStatus} onPress={() => changeStatus(detail, 'IN_DEPOT')} />}</View>}
    {!readOnly && <ShipmentLabel key={detail.id} id={detail.id} request={request} />}
    {own && canChangeStatus && detail.status === 'ASSIGNED' && <ShipmentPickup key={detail.id} id={detail.id} request={request} onComplete={() => { setDetail({ ...detail, status: 'PICKED_UP' }); setItems((items) => items.map((item) => item.id === detail.id ? { ...item, status: 'PICKED_UP' } : item)); setHistoryRevision((v) => v + 1); onCustodyUpdated?.(); }} />}
    {canChangeStatus && <ShipmentCustody key={`${detail.id}-${historyRevision}`} id={detail.id} request={request} onUpdated={() => { setHistoryRevision((v) => v + 1); onCustodyUpdated?.(); }} />}
    <Text style={styles.text}>Retiro: {detail.pickupStreet} {detail.pickupNumber}, {detail.pickupLocality}, {detail.pickupDepartment}</Text><Text style={styles.text}>Entrega: {detail.deliveryStreet} {detail.deliveryNumber}, {detail.deliveryLocality}, {detail.deliveryDepartment}</Text><Text style={styles.text}>Paquete: {detail.packages.map((item) => item.description).filter(Boolean).join(', ') || 'Sin descripción'}</Text>
    <Text style={styles.text}>Registrado: {new Date(detail.createdAt).toLocaleString('es-UY')} · Retiro solicitado: {detail.requestedPickupAt ? new Date(detail.requestedPickupAt).toLocaleString('es-UY') : 'Sin indicar'} · Entrega solicitada: {detail.requestedDeliveryAt ? new Date(detail.requestedDeliveryAt).toLocaleString('es-UY') : 'Sin indicar'}</Text>{!own && detail.notes ? <Text style={styles.text}>Observaciones: {detail.notes}</Text> : null}{!readOnly && <>{detail.receipt && <Button title="Abrir comprobante" onPress={() => void downloadReceipt(detail.id).catch(() => setError('No se pudo abrir el comprobante.'))} />}<Text style={styles.text}>Adjuntar un comprobante no confirma el pago.</Text><Button title={uploading ? 'Adjuntando…' : detail.receipt ? 'Reemplazar comprobante' : 'Adjuntar comprobante'} disabled={uploading} onPress={() => void attach(detail)} />{!own && <ShipmentAssignment id={detail.id} current={detail.assignedCourier ?? null} request={request} onUpdated={() => { void open(detail.id); setHistoryRevision((v) => v + 1); }} />}<ShipmentHistory id={detail.id} request={request} revision={historyRevision} basic={own} /></>}{readOnly && !own && <ShipmentHistory id={detail.id} request={request} revision={historyRevision} />}{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>;
  return <View><Text accessibilityRole="header" style={styles.heading}>{own ? 'Mis envíos' : 'Consultar envíos'}</Text>
    <Field label="Código" maxLength={120} value={draft.code} onChange={(value) => setDraft({ ...draft, code: value })} />{!own && <><Field label="Cliente" maxLength={120} value={draft.customer} onChange={(value) => setDraft({ ...draft, customer: value })} /><Field label="Repartidor" maxLength={120} value={draft.responsible} onChange={(value) => setDraft({ ...draft, responsible: value })} /></>}<Field label="Destinatario" maxLength={120} value={draft.recipient} onChange={(value) => setDraft({ ...draft, recipient: value })} />
    <Text style={styles.label}>Estado</Text>{[['', 'Todos'], ...Object.entries(statuses)].map(([key, label]) => <Button key={key} title={label} selected={draft.status === key} onPress={() => setDraft({ ...draft, status: key })} />)}
    <Text style={styles.label}>Prioridad</Text>{[['', 'Todas'], ['NORMAL', 'Normal'], ['HIGH', 'Alta']].map(([key, label]) => <Button key={key} title={label} selected={draft.priority === key} onPress={() => setDraft({ ...draft, priority: key })} />)}
    <Field label="Registrado desde (AAAA-MM-DD HH:MM)" maxLength={16} value={draft.from} onChange={(value) => setDraft({ ...draft, from: value })} /><Field label="Registrado hasta (AAAA-MM-DD HH:MM)" maxLength={16} value={draft.to} onChange={(value) => setDraft({ ...draft, to: value })} />
    <Button title="Buscar" disabled={loading} onPress={() => void search()} /><Button title="Limpiar filtros" disabled={loading} onPress={() => { setDirectResult(false); setDraft(empty); setQuery({ ...empty }); setPage(1); setError(''); }} />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{loading ? <Text style={styles.text}>Cargando…</Text> : items.length === 0 ? (!error && <Text style={styles.text}>No se encontraron envíos.</Text>) : items.map((item) => <View key={item.id}><Text style={styles.text}>{item.code} · {item.recipientName} · {statuses[item.status] ?? item.status}</Text><Button title="Ver detalle" onPress={() => void open(item.id)} /></View>)}
    <Pagination page={directResult ? 1 : page} pages={directResult ? Math.min(pages, 1) : pages} onChange={setPage} />
  </View>;
}
