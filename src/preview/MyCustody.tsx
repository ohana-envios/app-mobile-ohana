import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Pagination } from './Controls';
import { styles } from './styles';
import { ShipmentCustody } from './ShipmentCustody';

type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string | FormData }) => Promise<T>;
type Item = { id: string; code: string };
export function MyCustody({ request }: { request: Request }) {
  const [items, setItems] = useState<Item[]>([]); const [selected, setSelected] = useState<Item | null>(null);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(0); const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError('');
    request<{ items: Item[]; totalPages: number }>(`/api/shipments/custody/mine?page=${page}`, { signal: controller.signal }).then((result) => { setItems(result.items); setPages(result.totalPages); }).catch(() => { if (!controller.signal.aborted) { setItems([]); setError('No se pudieron cargar los paquetes bajo tu custodia.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, page, revision]);
  return <View><Text accessibilityRole="header" style={styles.heading}>Paquetes bajo mi custodia</Text><Text style={styles.text}>Incluye los paquetes que tenés físicamente, aunque se haya asignado el envío a otro cadete.</Text>
    {selected ? <><Button title="Volver a mis paquetes" onPress={() => setSelected(null)} /><Text accessibilityRole="header" style={styles.heading}>Envío {selected.code}</Text><ShipmentCustody id={selected.id} request={request} onUpdated={() => { setSelected(null); setPage(1); setRevision((n) => n + 1); }} /></> : <><Button title="Actualizar paquetes" disabled={loading} onPress={() => setRevision((n) => n + 1)} />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{loading ? <Text style={styles.text}>Cargando…</Text> : !error && (items.length ? items.map((item) => <View key={item.id}><Text style={styles.text}>{item.code}</Text><Button title="Gestionar custodia" onPress={() => setSelected(item)} /></View>) : <Text style={styles.text}>No tenés paquetes bajo tu custodia.</Text>)}<Pagination page={page} pages={pages} onChange={setPage} /></>}
  </View>;
}
