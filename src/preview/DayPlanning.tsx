import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Field, Pagination } from './Controls';
import { styles } from './styles';
import { planningPayload, selectAssignment, type PlanningCourier, type PlanningDraft, type PlanningRow } from './shipments/planning-draft';
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string | FormData }) => Promise<T>;
type Row = PlanningRow & { status: string; assignedCourier: { displayName: string } | null };
type Data = { items: Row[]; totalPages: number; couriers: PlanningCourier[]; moreCouriers: boolean };
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export function DayPlanning({ request }: { request: Request }) {
  const [draftDate, setDraftDate] = useState(today); const [date, setDate] = useState(today); const [page, setPage] = useState(1); const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<PlanningDraft>({}); const [review, setReview] = useState(false);
  const [searchDraft, setSearchDraft] = useState(''); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [revision, setRevision] = useState(0);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    request<Data>(`/api/shipments/planning/day?date=${encodeURIComponent(date)}&page=${page}&search=${encodeURIComponent(search)}`, { signal: controller.signal }).then(setData).catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la jornada.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort();
  }, [date, page, search, request, revision]);
  const entries = Object.values(selected);
  function choose(row: Row, courier: PlanningCourier | null) { try { setSelected(selectAssignment(selected, row, courier)); setReview(false); setError(''); } catch { setError('Podés confirmar hasta 50 envíos a la vez.'); } }
  async function confirm() { if (!entries.length) return; setBusy(true); setError(''); setMessage('');
    try { await request('/api/shipments/planning/day', { signal: new AbortController().signal, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, entries: planningPayload(selected) }) }); setSelected({}); setReview(false); setMessage('Jornada actualizada.'); setRevision((n) => n + 1); }
    catch { setError('No se guardó la jornada. Algún envío o cadete pudo cambiar: volvé a consultar y seleccioná de nuevo los afectados.'); } finally { setBusy(false); }
  }
  function changeDate() { if (!/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) { setError('Ingresá la fecha como AAAA-MM-DD.'); return; }
    const apply = () => { if (date !== draftDate) { setSelected({}); setReview(false); setPage(1); setDate(draftDate); } else setRevision((n) => n + 1); };
    if (date !== draftDate && entries.length) Alert.alert('Selección sin confirmar', 'Se perderá la selección para la fecha anterior.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Continuar', onPress: apply }]); else apply();
  }
  return <View><Text accessibilityRole="header" style={styles.heading}>Planificar jornada</Text><Text style={styles.text}>Podés elegir envíos de distintas páginas y buscar varios cadetes antes de confirmar. La custodia no cambia.</Text>
    <Field label="Fecha (AAAA-MM-DD)" value={draftDate} maxLength={10} onChange={setDraftDate} /><Button title="Consultar jornada" disabled={loading || busy} onPress={changeDate} />
    <Field label="Buscar repartidor" value={searchDraft} maxLength={120} onChange={setSearchDraft} /><Button title="Buscar repartidor" disabled={loading || busy} onPress={() => { if (search === searchDraft) setRevision((n) => n + 1); else setSearch(searchDraft); }} />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{message ? <Text style={styles.text}>{message}</Text> : null}{loading && <Text style={styles.text}>Cargando…</Text>}
    {data && <>{data.moreCouriers && <Text style={styles.text}>Hay más resultados; buscá por nombre.</Text>}{data.items.length ? data.items.map((row) => <View key={row.id}><Text style={styles.text}>{row.code} · {row.recipientName} · {row.plannedFor ? 'Planificado' : 'Sin planificar'}</Text><Text style={styles.text}>Responsable actual: {row.assignedCourier?.displayName ?? 'Sin asignar'}</Text>{selected[row.id] && <Text style={styles.text}>Seleccionado: {selected[row.id].courierName}</Text>}{data.couriers.map((courier) => <Button key={courier.id} title={courier.displayName} selected={selected[row.id]?.courierId === courier.id} disabled={busy} onPress={() => choose(row, selected[row.id]?.courierId === courier.id ? null : courier)} />)}</View>) : <Text style={styles.text}>No hay envíos disponibles para esta jornada.</Text>}<Pagination page={page} pages={data.totalPages} onChange={setPage} /></>}
    <Text accessibilityRole="header" style={styles.heading}>Selección para {date}</Text>{entries.length ? entries.map((entry) => <View key={entry.id}><Text style={styles.text}>{entry.code} · {entry.recipientName} → {entry.courierName}</Text><Button title={`Quitar ${entry.code}`} disabled={busy} onPress={() => { setSelected(selectAssignment(selected, { ...entry, assignedCourierId: entry.expectedCourierId, plannedFor: entry.expectedPlannedFor }, null)); setReview(false); }} /></View>) : <Text style={styles.text}>No hay envíos seleccionados.</Text>}
    {entries.length > 0 && (review ? <><Text style={styles.text}>Se guardarán estas {entries.length} asignaciones juntas.</Text><Button title={busy ? 'Guardando…' : 'Confirmar jornada'} disabled={busy} onPress={() => void confirm()} /><Button title="Seguir editando" disabled={busy} onPress={() => setReview(false)} /></> : <Button title={`Revisar ${entries.length} seleccionados`} disabled={busy} onPress={() => setReview(true)} />)}
  </View>;
}
