import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Pagination } from './Controls';
import { styles } from './styles';
type Event = { type: string; occurredAt: string; actorLabel?: string; notes?: string | null };
type Request = <T>(path: string, init: { signal: AbortSignal }) => Promise<T>;
const labels: Record<string, string> = { CREATED: 'Envío registrado', RECEIPT_ADDED: 'Comprobante adjuntado', RECEIPT_REPLACED: 'Comprobante reemplazado', ASSIGNMENT_CHANGED: 'Responsable actualizado' };
export function ShipmentHistory({ id, request, revision }: { id: string; request: Request; revision: number }) {
  const [page, setPage] = useState(1); const [pages, setPages] = useState(0); const [items, setItems] = useState<Event[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); request<{ items: Event[]; totalPages: number }>(`/api/shipments/${encodeURIComponent(id)}/history?page=${page}`, { signal: controller.signal }).then((value) => { setItems(value.items); setPages(value.totalPages); }).catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar el historial.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [id, request, page, revision]);
  return <View><Text accessibilityRole="header" style={styles.heading}>Historial</Text>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{loading ? <Text style={styles.text}>Cargando…</Text> : !error && (items.length ? items.map((event, index) => <Text key={`${event.occurredAt}-${index}`} style={styles.text}>{labels[event.type] ?? 'Evento registrado'} · {new Date(event.occurredAt).toLocaleString('es-UY')}{event.actorLabel ? ` · ${event.actorLabel}` : ''}{event.notes ? ` · ${event.notes}` : ''}</Text>) : <Text style={styles.text}>Sin eventos.</Text>)}<Pagination page={page} pages={pages} onChange={setPage} /><Button title="Volver a la primera página" disabled={page === 1} onPress={() => setPage(1)} /></View>;
}
