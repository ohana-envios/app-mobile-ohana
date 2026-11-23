import { IncidentEvidence } from './IncidentEvidence';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button, Field } from './Controls';
import { styles } from './styles';

type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string | FormData }) => Promise<T>;
type Custody = { kind: string | null; version: number; location: string | null; courier: { id: string; displayName: string } | null; canTransfer: boolean; couriers: { id: string; displayName: string }[]; moreCouriers: boolean; events: { id: string; occurredAt: string; actorLabel: string; notes: string | null; evidence: { id: string } | null }[] };
export function ShipmentCustody({ id, request, onUpdated }: { id: string; request: Request; onUpdated: () => void }) {
  const [data, setData] = useState<Custody | null>(null); const [search, setSearch] = useState(''); const [location, setLocation] = useState('');
  const [observation, setObservation] = useState(''); const [evidence, setEvidence] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [revision, setRevision] = useState(0);
  const load = useCallback((signal: AbortSignal) => request<Custody>(`/api/shipments/${encodeURIComponent(id)}/custody?${new URLSearchParams({ search })}`, { signal }), [id, request, search]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal).then(setData).catch(() => { if (!controller.signal.aborted) setError('No se pudo consultar la custodia.'); }); return () => controller.abort(); }, [load, revision]);
  function transfer(destination: { kind: 'DEPOT'; location: string } | { kind: 'COURIER'; courierId: string }) {
    if (!data) return;
    Alert.alert('Confirmar transferencia', '¿Confirmás que el paquete cambió físicamente de custodia?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => { void (async () => {
      setBusy(true); setError('');
      try { const body = new FormData(); body.append('payload', JSON.stringify({ ...destination, expectedVersion: data.version, observation })); if (evidence) body.append('evidence', { uri: evidence.uri, name: evidence.name, type: evidence.mimeType } as unknown as Blob); await request(`/api/shipments/${encodeURIComponent(id)}/custody`, { signal: new AbortController().signal, method: 'PATCH', body }); setLocation(''); setObservation(''); setEvidence(null); setRevision((v) => v + 1); onUpdated(); }
      catch { setError('No se pudo registrar. Recargá la custodia y verificá los datos.'); setRevision((v) => v + 1); } finally { setBusy(false); }
    })(); } }]);
  }
  async function chooseEvidence() {
    try { const selected = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/png', 'image/jpeg'], copyToCacheDirectory: true }); if (selected.canceled) return; const file = selected.assets[0]; if (!file?.mimeType || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimeType) || (file.size !== undefined && file.size > 5 * 1024 * 1024)) throw new Error('Invalid'); setEvidence(file); setError(''); } catch { setEvidence(null); setError('Elegí un PDF, PNG o JPG de hasta 5 MB.'); }
  }
  async function openEvidence(eventId: string) {
    let path = '';
    try { if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('Unavailable'); const file = await request<{ mediaType: string; data: string }>(`/api/shipments/${encodeURIComponent(id)}/custody/evidence/${encodeURIComponent(eventId)}`, { signal: new AbortController().signal }); const extension = file.mediaType === 'application/pdf' ? 'pdf' : file.mediaType === 'image/png' ? 'png' : file.mediaType === 'image/jpeg' ? 'jpg' : ''; if (!extension) throw new Error('Invalid'); path = `${FileSystem.cacheDirectory}ohana-evidencia-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`; await FileSystem.writeAsStringAsync(path, file.data, { encoding: FileSystem.EncodingType.Base64 }); await Sharing.shareAsync(path, { mimeType: file.mediaType, dialogTitle: 'Evidencia de custodia' }); } catch { setError('No se pudo abrir la evidencia.'); } finally { if (path) await FileSystem.deleteAsync(path, { idempotent: true }); }
  }
  return <View><Text accessibilityRole="header" style={styles.heading}>Custodia física</Text>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{!data ? <Text style={styles.text}>Cargando custodia…</Text> : <><Text style={styles.text}>Actual: {data.kind === 'RECIPIENT' ? 'Entregado al receptor' : data.kind === 'SENDER' ? 'Remitente' : data.kind === 'COURIER' ? data.courier?.displayName ?? 'Repartidor no identificado' : data.kind === 'DEPOT' ? data.location : 'Sin información'}</Text>
    {data.canTransfer ? <><Field label="Observación opcional" value={observation} maxLength={1000} onChange={setObservation} /><Button title={evidence ? `Evidencia: ${evidence.name}` : 'Adjuntar evidencia opcional (PDF, PNG o JPG, hasta 5 MB)'} disabled={busy} onPress={() => void chooseEvidence()} />{evidence && <Button title="Quitar evidencia" disabled={busy} onPress={() => setEvidence(null)} />}<Field label="Ubicación de entrega" value={location} maxLength={120} onChange={setLocation} /><Button title="Registrar entrega a ubicación" disabled={busy || !location.trim()} onPress={() => transfer({ kind: 'DEPOT', location })} /><Field label="Buscar repartidor" value={search} maxLength={120} onChange={setSearch} />{data.moreCouriers && <Text style={styles.text}>Hay más resultados; escribí el nombre para encontrarlos.</Text>}{data.couriers.map((courier) => <View key={courier.id}><Text style={styles.text}>{courier.displayName}</Text><Button title="Entregar a este repartidor" disabled={busy || data.courier?.id === courier.id} onPress={() => transfer({ kind: 'COURIER', courierId: courier.id })} /></View>)}</> : <Text style={styles.text}>La transferencia estará disponible cuando corresponda según el retiro y la custodia actual.</Text>}
    <Text accessibilityRole="header" style={styles.heading}>Transferencias registradas</Text>{data.events.length ? data.events.map((event) => <View key={event.id}><Text style={styles.text}>{new Date(event.occurredAt).toLocaleString('es-UY')} · {event.actorLabel} · {event.notes}</Text>{event.evidence && <Button title="Abrir evidencia" onPress={() => void openEvidence(event.id)} />}<IncidentEvidence shipmentId={id} eventId={event.id} request={request} /></View>) : <Text style={styles.text}>Sin transferencias registradas.</Text>}</>}</View>;
}
